import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { FiBookOpen, FiLogOut, FiPlus } from "react-icons/fi";
import { auth } from "../firebase";
import "../styles/Header.css";

export default function Header() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    try {
      await signOut(auth);
    } catch {
      setError("No se pudo cerrar la sesión. Inténtalo de nuevo.");
      setBusy(false);
    }
  };
  return (
    <>
      <a href="#main-content" className="skip-link">
        Saltar al contenido
      </a>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="Magister, inicio">
            <FiBookOpen aria-hidden="true" />
            magister<span className="brand-dot">.</span>
          </Link>
          <nav className="main-nav" aria-label="Navegación principal">
            <NavLink to="/" end>
              Mis cursos
            </NavLink>
            <NavLink to="/search-courses">Explorar</NavLink>
          </nav>
          <div className="header-actions">
            <NavLink to="/new-course" className="button header-create">
              <FiPlus aria-hidden="true" />
              Crear curso
            </NavLink>
            <button
              className="icon-button"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={logout}
              disabled={busy}
            >
              <FiLogOut aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
      {error && (
        <p className="notice error page" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
