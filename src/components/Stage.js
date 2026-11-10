// Stage.js
import React, { useEffect, useState } from 'react';
import { Link, useLoaderData, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useCourseContext } from '../CourseContext';
import Modal from 'react-modal';
import '../styles/Stage.css';

export async function loader({ params }) {
  return { courseID: params.courseID, stageID: params.stageID };
}

const Stage = () => {
  const navigate = useNavigate();
  const { courseID, stageID } = useLoaderData();
  const { enrolledCourses, allCourses, fetchAllCourses } = useCourseContext();

  const [enrolled, setEnrolled] = useState(true);
  const [course, setCourse] = useState(null);
  const [stage, setStage] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (!user) navigate("/login");
    });
  }, [navigate]);

  useEffect(() => {
    let enrolledCourse = enrolledCourses.find(c => c.originalCourseID == courseID);
    if (!enrolledCourse) setEnrolled(false);

    let allCourse = allCourses.find(c => c.courseID == courseID);
    const course = enrolledCourse ? enrolledCourse : allCourse;
    if (!course) return;

    setCourse(course);
    setStage(course.courseJSON.stages.find(s => s.id == stageID));
  }, [enrolledCourses, course, allCourses, stageID]);

  const handleTakeTest = () => {
    setModalOpen(true);
  };

  if (!allCourses.length) {
    fetchAllCourses();
    return <div className="loading-message" tabIndex={0}>Cargando...</div>;
  }

  if (!stage) {
    return <div className="loading-message" tabIndex={0}>Etapa no encontrada</div>;
  }

  return (
    <div className='course-details'>
      <div className="stage-header">
        <button role='button' onClick={() => navigate(`/courses/${enrolled ? course.originalCourseID : course.courseID}`)} aria-label={"Volver"} tabIndex={0}>Volver</button>
      </div>
      <h1 tabIndex={0}>{stage.title}</h1>
      <h2 tabIndex={0}>{stage.description}</h2>
      <p tabIndex={0}>{stage.content}</p>
      {enrolled ? (
        <button role='button' className='take-test-button' onClick={handleTakeTest} aria-label={"Hacer prueba"} tabIndex={0}>Hacer Prueba</button>
      ) : (
        <div>
          <p className='error-text' tabIndex={0}>Debes inscribirte al curso para poder acceder a las pruebas</p>
          <button role='button' className='take-test-button-disabled' disabled tabIndex={0}>Realizar Prueba</button>
        </div>
      )}
      <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setModalOpen(false)}
          contentLabel="Confirmación de prueba"
          ariaHideApp={false}
          className="modal"
      >
          <h2>¿Estás seguro de que quieres realizar la prueba?</h2>
          <button className='modal-button' role='button' onClick={() => navigate(`/courses/${course.originalCourseID}/${stage.id}/test`)} tabIndex={0}>Hacer Prueba</button>
          <button className='modal-button' role='button' onClick={() => setModalOpen(false)} tabIndex={0}>Cerrar</button>          
      </Modal>
    </div>
  );
};

export default Stage;
