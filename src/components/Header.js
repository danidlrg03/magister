// Header.js
import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/Header.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';

const Header = () => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        // Click occurred outside of the dropdown, so close it
      }
    };

    // Add event listener to detect clicks anywhere on the page
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      // Cleanup: Remove event listener when component unmounts
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        // Sign-out successful.
        navigate('/login');
        console.log('Signed out successfully');
      })
      .catch((error) => {
        // An error happened.
        console.error('Error signing out: ', error);
      });
  };

  return (
    <header className="header">
      <nav>
        <ul>
          <li><Link to="/" aria-label="Inicio"><h1>Magister</h1></Link></li>
          <li><Link to="/" aria-label="Inicio">Inicio</Link></li>
          <li><Link to="/search-courses" aria-label="Buscar cursos">Buscar cursos</Link></li>
          <li className="logout">
            <button
              role='button' 
              aria-label="Cerrar Sesión"
              onClick={handleLogout}
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
              <span>Cerrar Sesión</span>
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
