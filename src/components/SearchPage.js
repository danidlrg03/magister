// SearchPage.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useCourseContext } from '../CourseContext';
import '../styles/SearchPage.css';

const SearchPage = () => {
  const navigate = useNavigate();
  const [publicCourses, setPublicCourses] = useState([]); // [1]
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { allCourses, fetchAllCourses } = useCourseContext();

  useEffect(() =>  {

    async function fetchData(){
      if (allCourses.length === 0) {
        await fetchAllCourses();
      }
      setPublicCourses(allCourses.filter(course => course.courseJSON.isPublic));
    } 

    onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
      }
    });

    fetchData()

  }, [navigate, allCourses, fetchAllCourses]);


  const handleSearchInputChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const results = publicCourses.filter(course =>
      course.courseJSON.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  };

  return (
    <div className="search-container">
      <h1 tabIndex={0}>Buscar Cursos</h1>
      <form className="search-form" onSubmit={handleSearchSubmit}>
        <label htmlFor="search-input" className="visually-hidden">Buscar cursos</label>
        <input
          role="searchbox"
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={handleSearchInputChange}
          placeholder="Introduzca el término de búsqueda"
          aria-label="Introduzca el término de búsqueda"
          tabIndex={0}
        />
        <button role='button' type="submit" tabIndex={0}>Buscar</button>
      </form>
      <div className="search-results" aria-live="polite">
        {searchResults.map((course, index) => (
          <div className="course" key={index}>
            <h2 tabIndex={0}>{course.courseJSON.title}</h2>
            <p tabIndex={0}>{course.courseJSON.description}</p>
            <Link to={`/courses/${course.courseID}`} className="course-link" tabIndex={0}>Ver Curso</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPage;
