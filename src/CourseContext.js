import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  collection,
  getDocs,
  where,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "./firebase";

const CourseContext = createContext();
const decode = (snapshot) =>
  snapshot.docs.map((item) => ({
    ...item.data(),
    courseJSON: JSON.parse(item.data().courseString),
    courseID: item.id,
  }));

export const CourseProvider = ({ children }) => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [createdCourses, setCreatedCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState("");
  const [catalogStatus, setCatalogStatus] = useState("idle");
  const session = useRef(0);
  const catalogRequest = useRef(null);

  const refreshCourses = useCallback(async (currentUser = auth.currentUser) => {
    if (!currentUser) return;
    const version = session.current;
    setCoursesLoading(true);
    setCoursesError("");
    try {
      const [enrolled, created] = await Promise.all([
        getDocs(
          query(
            collection(db, "enrolledCourses"),
            where("userID", "==", currentUser.uid),
          ),
        ),
        getDocs(
          query(
            collection(db, "courses"),
            where("userID", "==", currentUser.uid),
          ),
        ),
      ]);
      if (version !== session.current) return;
      setEnrolledCourses(decode(enrolled));
      setCreatedCourses(decode(created));
    } catch {
      if (version === session.current)
        setCoursesError(
          "No hemos podido cargar tus cursos. Inténtalo de nuevo.",
        );
    } finally {
      if (version === session.current) setCoursesLoading(false);
    }
  }, []);

  useEffect(
    () =>
      auth.onAuthStateChanged((currentUser) => {
        session.current += 1;
        catalogRequest.current = null;
        setUser(currentUser);
        setEnrolledCourses([]);
        setCreatedCourses([]);
        setAllCourses([]);
        setCatalogStatus("idle");
        setCoursesError("");
        setAuthReady(true);
        if (currentUser) refreshCourses(currentUser);
        else setCoursesLoading(false);
      }),
    [refreshCourses],
  );

  const fetchAllCourses = useCallback(() => {
    if (catalogRequest.current) return catalogRequest.current;
    const version = session.current;
    setCatalogStatus("loading");
    const request = getDocs(collection(db, "courses"))
      .then((snapshot) => {
        if (version !== session.current) return;
        setAllCourses(decode(snapshot));
        setCatalogStatus("ready");
      })
      .catch(() => {
        if (version === session.current) setCatalogStatus("error");
      })
      .finally(() => {
        if (catalogRequest.current === request) catalogRequest.current = null;
      });
    catalogRequest.current = request;
    return request;
  }, []);

  const updateEnrolledCourse = async (course) => {
    const stages = course.courseJSON.stages;
    const updated = {
      ...course,
      courseJSON: {
        ...course.courseJSON,
        completionPercentage: stages.length
          ? (stages.filter((stage) => stage.completed).length / stages.length) *
            100
          : 0,
      },
    };
    await updateDoc(doc(db, "enrolledCourses", course.courseID), {
      courseString: JSON.stringify(updated.courseJSON),
    });
    setEnrolledCourses((previous) =>
      previous.map((item) =>
        item.courseID === course.courseID ? updated : item,
      ),
    );
  };

  const updateCreatedCourse = async (course) => {
    await updateDoc(doc(db, "courses", course.courseID), {
      courseString: JSON.stringify(course.courseJSON),
    });
    setCreatedCourses((previous) =>
      previous.map((item) =>
        item.courseID === course.courseID ? course : item,
      ),
    );
    setAllCourses((previous) =>
      previous.map((item) =>
        item.courseID === course.courseID ? course : item,
      ),
    );
  };

  const updateStage = async (course, stage) => {
    const updatedStage = {
      ...stage,
      completed: stage.completed || stage.testScore >= 50,
    };
    await updateEnrolledCourse({
      ...course,
      courseJSON: {
        ...course.courseJSON,
        stages: course.courseJSON.stages.map((item) =>
          item.id === stage.id ? updatedStage : item,
        ),
      },
    });
  };

  const createCourse = (course) => {
    if (course.userID !== auth.currentUser?.uid) return;
    const created = { ...course, courseJSON: JSON.parse(course.courseString) };
    setCreatedCourses((previous) => [...previous, created]);
    setAllCourses((previous) => [...previous, created]);
  };

  const addEnrolledCourse = (course) => {
    if (course.userID !== auth.currentUser?.uid) return;
    setEnrolledCourses((previous) => [...previous, course]);
  };

  return (
    <CourseContext.Provider
      value={{
        user,
        authReady,
        coursesLoading,
        coursesError,
        refreshCourses,
        enrolledCourses,
        createdCourses,
        allCourses,
        catalogStatus,
        fetchAllCourses,
        updateEnrolledCourse,
        updateCreatedCourse,
        updateStage,
        createCourse,
        addEnrolledCourse,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};
export const useCourseContext = () => useContext(CourseContext);
