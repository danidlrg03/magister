import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useCourseContext } from '../CourseContext';
import {FaPlus, FaSearch} from 'react-icons/fa';
import '../styles/CourseList.css';

const CourseList = () => {
  const navigate = useNavigate();

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      console.log(user)
      if (!user) {
        navigate('/login');
      }
    });

  }, [navigate, auth]);

  const { enrolledCourses, createdCourses } = useCourseContext();

  console.log(enrolledCourses, createdCourses)

  return (
    <div className='course-list-page'>
      <div className='course-container'>
        <div className='course-list'>
          <div className='course-list-header'>
            <h2 tabIndex={0}>Tus cursos inscritos</h2>
            <Link to='/search-courses' aria-label='Buscar cursos públicos' tabIndex={0}>
              <div className="tooltip"> 
                <FaSearch className='plus-icon' aria-hidden='true' />
                <span role='tooltip' className="tooltiptext">Buscar cursos públicos</span>
              </div>            
            </Link>
          </div>
          <hr aria-hidden='true' />
          {enrolledCourses.map((course, index) => (
            course.courseJSON.visible && (
              <div key={index} className='course-item'>
                <div>
                  <h3 id={`enrolled-course-${course.courseID}}`} className='course-title' tabIndex={0}>{course.courseJSON.title}</h3>
                  <p tabIndex={0}>{course.courseJSON.description}</p>
                  <div className='course-item-footer'>
                    <p style={{minWidth: "90px"}} tabIndex={0}>Etapas: {course.courseJSON.stages.length}</p>
                    <button
                      role='button' 
                      className='course-link'
                      aria-label={`Acceder a ${course.courseJSON.title}`}
                      onClick={() => navigate(`/courses/${course.originalCourseID}`)}
                      tabIndex={0}>Acceder</button>
                  </div>
                  <progress
                    style={{
                      width: '100%',
                      accentColor: `rgba(${200 * (1 - (Math.max(0, (course.courseJSON.stages.reduce((sum, stage) => sum + stage.testScore, 0) / course.courseJSON.stages.length) - 50) / 50))},
                           ${200 * (Math.min(50, (course.courseJSON.stages.reduce((sum, stage) => sum + stage.testScore, 0) / course.courseJSON.stages.length))/ 50)},
                           0,
                           1)`,
                    }}
                    value={course.courseJSON.completionPercentage}
                    max='100'
                    aria-valuenow={course.courseJSON.completionPercentage}
                    aria-valuemin='0'
                    aria-valuemax='100'
                    aria-labelledby={`enrolled-course-${course.courseID}}`}
                    tabIndex={0}
                  />
                  <hr aria-hidden='true' />
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      <div className='course-container'>
        <div className='course-list'>
          <div className='course-list-header'>
            <h2 id='created-courses-heading' tabIndex={0}>Tus cursos creados</h2>
            <Link to='/new-course' aria-label='Crear un curso nuevo' tabIndex={0}>
              <div className="tooltip"> <FaPlus className='plus-icon' aria-hidden='true' />
                <span role='tooltip' className="tooltiptext">Generar un curso nuevo</span>
              </div>
            </Link>
          </div>
          <hr aria-hidden='true' />
          {createdCourses.map((course, index) => (
            course.courseJSON.visible && (
              <div key={index} className='course-item'>
                <h3 className='course-title' tabIndex={0}>{course.courseJSON.title}</h3>
                <div>
                  <p tabIndex={0}>{course.courseJSON.description}</p>
                  <div className='course-item-footer'>
                    <p style={{minWidth: "90px"}} tabIndex={0}>Etapas: {course.courseJSON.stages.length}</p>
                      <button
                        role='button' 
                        className='course-link'
                        aria-label={`Acceder a ${course.courseJSON.title}`}
                        onClick={() => navigate(`/courses/${course.courseID}`)}
                        tabIndex={0}>Acceder</button>
                  </div>
                </div>
                <hr aria-hidden='true' />
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseList;
