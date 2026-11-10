import React from "react";
import { Link } from "react-router-dom";
import { FiBookOpen, FiCheck } from "react-icons/fi";
import "../../styles/auth/Form.css";

export default function AuthLayout({ title, description, children }) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link to="/" className="brand">
          <FiBookOpen aria-hidden="true" />
          magister<span className="brand-dot">.</span>
        </Link>
        <span>Tu curiosidad marca el camino.</span>
      </header>
      <main id="main-content" className="auth-layout" tabIndex={-1}>
        <section className="auth-form-container">
          <h1>{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
        </section>
        <aside className="auth-story">
          <h2>
            De «quiero aprender»
            <br />a «ya lo entiendo».
          </h2>
          <p>
            Transforma cualquier tema en una ruta con lecciones, práctica y
            evaluaciones a tu ritmo.
          </p>
          <div className="auth-route" aria-label="Cómo se aprende en Magister">
            <div>
              <span>
                <FiCheck aria-hidden="true" />
              </span>
              <strong>Elige lo que te interesa</strong>
            </div>
            <div>
              <span>02</span>
              <strong>Aprende paso a paso</strong>
            </div>
            <div>
              <span>03</span>
              <strong>Pon a prueba lo aprendido</strong>
            </div>
          </div>
          <p className="auth-disciplines">
            Ciencia · Arte · Tecnología · Idiomas · Y mucho más
          </p>
        </aside>
      </main>
      <footer className="auth-footer">
        Aprender empieza con una buena pregunta.
      </footer>
    </div>
  );
}
