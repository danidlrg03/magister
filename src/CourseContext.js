// CourseContext.js
import React, { createContext, useState, useContext, useEffect} from 'react';
import { collection, getDocs, where, query, updateDoc, doc } from "firebase/firestore";
import {db, auth} from './firebase';
import { set } from 'firebase/database';

// Create the context
const CourseContext = createContext();

// Create a provider component
export const CourseProvider = ({ children }) => {

  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user); // Update user state
        await fetchEnrolledCourses(user.uid); // Pass user ID directly
        await fetchCreatedCourses(user.uid);
      } else {
        setUser(null);
        setEnrolledCourses([]);
        setCreatedCourses([]);
      }
    });
    return () => unsubscribe();
  }, []);

  /*
    On firestore db:
    courses: collection of courses. It has 3 fields: JSON string of course and userID
    enrolledCourses: collection of enrolled courses. It has 3 fields: courseID, originalCourseID and userID
  */

  // get courses from db from course ids of enrolled courses
  const fetchEnrolledCourses = async (userId) => {
    const querySnapshot = await getDocs(query(collection(db, "enrolledCourses"), where("userID", "==", userId)));
    if (querySnapshot.empty) {
      setEnrolledCourses([]);
      return;
    }
    const enrolledCoursesTemp = querySnapshot.docs.map((doc) => ({...doc.data(), courseJSON: JSON.parse(doc.data().courseString), courseID: doc.id}));
    setEnrolledCourses(enrolledCoursesTemp);
  };

  const fetchCreatedCourses = async (userId) => {
    const querySnapshot = await getDocs(query(collection(db, "courses"), where("userID", "==", userId)));
    if (querySnapshot.empty) {
      setCreatedCourses([]);
      return;
    }
    const createdCoursesTemp = querySnapshot.docs.map((doc) => ({...doc.data(), courseJSON: JSON.parse(doc.data().courseString), courseID: doc.id}));
    setCreatedCourses(createdCoursesTemp);
  };

  const fetchAllCourses = async () => {
    const querySnapshot = await getDocs(collection(db, "courses"));
    if (querySnapshot.empty) {
      setAllCourses([]);
      return;
    }
    const allCoursesTemp = querySnapshot.docs.map((doc) => ({...doc.data(), courseJSON: JSON.parse(doc.data().courseString), courseID: doc.id}));
    setAllCourses(allCoursesTemp);
  };

  // Update the completion percentage for a course
  const updateCompletionPercentage = (course) => {
    const completedStages = course.stages.filter(stage => stage.completed);
    const completionPercentage = (completedStages.length / course.stages.length) * 100;
    course.completionPercentage = completionPercentage;
    return course;
  };

  // Complete a stage if the test score is greater or equal to 50
  const completeStageIfScoreIs50 = (stage) => {
    if (stage.testScore >= 50) {
        stage.completed = true;
    }
    return stage
  };

  const updateEnrolledCourse = async (course) => {
    course.courseJSON = updateCompletionPercentage(course.courseJSON);
    setEnrolledCourses(prevCourses => prevCourses.map(c => {
      if (c.courseID === course.courseID) {
        return course;
      }
      return c;
    }));
    //update in firebase
    await updateDoc(doc(db, "enrolledCourses", course.courseID), {
      courseString: JSON.stringify(course.courseJSON)
    });
  };

  const updateCreatedCourse = async (course) => {
    // if course being sent is the enrolled one, get the original course
    const id = course.originalCourseID ? course.originalCourseID : course.courseID;
    setCreatedCourses(prevCourses => prevCourses.map(c => {
      if (c.courseID === id) {
        return course;
      }
      return c;
    }));
    //update in firebase
    await updateDoc(doc(db, "courses", id), {
      courseString: JSON.stringify(course.courseJSON)
    });
    if(course.originalCourseID){
      updateEnrolledCourse(course)
    }
  };

  const updateStage = (course, stage) => {
    stage = completeStageIfScoreIs50(stage);
    // reusing updateEnrolledCourse function 
    course.courseJSON.stages = 
      course.courseJSON.stages.map(s => {
        if (s.id === stage.id) {
          return stage;
        }
        return s;
      })
    
    updateEnrolledCourse(course);
  };

  const createCourse = (course) => {
    course.courseJSON = JSON.parse(course.courseString);
    setCreatedCourses(prevCourses => [...prevCourses, course]);
    setAllCourses(prevCourses => [...prevCourses, course]);
  };

  const addEnrolledCourse = (course) => {
    setEnrolledCourses(prevCourses => [...prevCourses, course]);
  };

  console.log(enrolledCourses)
  // Wrap the functions to be passed down through context
  const contextValue = {
    enrolledCourses,
    createdCourses,
    updateEnrolledCourse,
    updateCreatedCourse,
    updateStage,
    createCourse,
    allCourses,
    fetchAllCourses,
    addEnrolledCourse,
  };

  return (
    <CourseContext.Provider value={contextValue}>
      {children}
    </CourseContext.Provider>
  );
};

// Custom hook to consume the context
export const useCourseContext = () => useContext(CourseContext);
