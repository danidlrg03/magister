// Course.js
import React, { useState, useEffect } from 'react';
import { useLoaderData, Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { addDoc, collection } from 'firebase/firestore';
import { FaFlag } from "react-icons/fa";
import { useCourseContext } from '../CourseContext';
import '../styles/Course.css';

export async function loader({ params }) {
  return { courseID: params.courseID };
}

const Course = () => {
  const navigate = useNavigate();
  const { courseID } = useLoaderData();
  const [selectedStage, setSelectedStage] = useState(null);
  const [enrolled, setEnrolled] = useState(true);
  const [course, setCourse] = useState(null);

  const { createdCourses, enrolledCourses, allCourses, fetchAllCourses, fetchEnrolledCourses, updateCreatedCourse, addEnrolledCourse } = useCourseContext();

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    let enrolledCourse = enrolledCourses.find(c => c.originalCourseID == courseID);
    setEnrolled(enrolledCourse);
  }, [enrolledCourses, courseID]);

  useEffect(() => {
    let course;
    if (enrolled) {
      course = enrolledCourses.find(c => c.originalCourseID == courseID);
    } else if (createdCourses.find(c => c.courseID == courseID)) {
      course = createdCourses.find(c => c.courseID == courseID);
    } else {
      course = allCourses.find(c => c.courseID == courseID);
    }
    setCourse(course);
  }, [enrolledCourses, createdCourses, course, enrolled]);

  const handleStageClick = (index) => setSelectedStage(index);
  const handleClosePopup = () => setSelectedStage(null);

  const makeCoursePublic = () => {
    course.courseJSON.isPublic = true;
    updateCreatedCourse(course);
  }

  const enrollToCourse = async () => {  
    try {
      const docRef = await addDoc(collection(db, "enrolledCourses"), {
        courseString: JSON.stringify(course.courseJSON),
        userID: auth.currentUser.uid,
        originalCourseID: course.courseID
      });
      addEnrolledCourse({ ...course, originalCourseID: course.courseID, courseID: docRef.id});
      setEnrolled(true);
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }

  if (!course && allCourses.length === 0) {
    fetchAllCourses();
    return <div>Cargando...</div>;
  }

  if (!course) {
    return <div>Curso no encontrado</div>;
  }

  return (
    <div className='course-details'>
      <div className="course-header">
        <button role='button' onClick={() => navigate("/")} aria-label={"Volver"}>Volver</button>
        {createdCourses.find(c => c.courseID == courseID) && (
          !course.courseJSON.isPublic ? (
            <button role='button' className='make-public-button' onClick={makeCoursePublic} tabIndex={0}>Hacer Público</button>
          ) : (
            <p className='course-public-text' tabIndex={0}>Este curso es público</p>
          )
        )}
      </div>
      <h1 tabIndex={0}>{course.courseJSON.title}</h1>
      <p tabIndex={0}>{course.courseJSON.description}</p>
      {enrolled ? (
        <p tabIndex={0}>{`Porcentaje Completado: ${course.courseJSON.completionPercentage.toFixed(0)}%`}</p>
      ) : (
        <button role='button' className='enroll-button' onClick={enrollToCourse} tabIndex={0}>Inscribirse</button>
      )}
      <div className="map">
        <h2 tabIndex={0}>Mapa del Curso</h2>
        <div className="flags">
          {course.courseJSON.stages.map((stage, index) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                marginBottom: '10px',
                justifyContent: 'center',
              }}
              key={index}>
                <div
                  key={index}
                  className='flag'
                  style={{
                    border: `solid rgba(${200 * (1 - (Math.max(0, stage.testScore - 50) / 50))},
                      ${200 * (Math.min(50, stage.testScore) / 50)},
                      0,
                      1)`,
                    minWidth: '40px',
                    maxWidth: '40px',
                    minHeight: '40px',
                    maxHeight: '40px',
                    marginTop: '10px',
                  }}
                >
                  <FaFlag
                    className='flag-icon'
                    style={{
                      color: `rgba(${200 * (1 - (Math.max(0, stage.testScore - 50) / 50))},
                      ${200 * (Math.min(50, stage.testScore) / 50)},
                      0,
                      1)`
                    }}
                  />
                </div>
                <div style={{display: 'flex', flexDirection: 'row', flexWrap:"wrap", width: "100%", justifyContent: "space-between"}}>
                <div style={{display: 'flex', flexDirection: 'column', textAlign: 'left', minWidth: "150px",maxWidth:"700px", marginLeft: `10px`}}>
                  <h3 style={{}} tabIndex={0}>{stage.title}</h3>
                  <p style={{marginTop: '0px'}} tabIndex={0}>{stage.description}</p>
                </div>
                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  marginLeft: '20px',
                  minWidth: "120px",
                }}>
                  <p tabIndex={0}>{`Puntuación: ${stage.testScore}`}</p>
                  <button
                    style={{
                      height: '30px',
                      minWidth: '120px',
                      marginTop: 'auto',
                      marginBottom: '5px'
                    }}
                    role='button'
                    aria-label={`Acceder a ${stage.title}`}
                    onClick={() => navigate(`/courses/${enrolled ? course.originalCourseID : course.courseID}/${stage.id}`)}
                    tabIndex={0}>
                    Acceder
                  </button>
                </div>
                </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Course;
