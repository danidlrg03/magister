import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FiArrowRight, FiBookOpen, FiPlus, FiSearch } from "react-icons/fi";
import { useCourseContext } from "../CourseContext";
import "../styles/CourseList.css";

export function CourseCard({ course, enrolled = false }) {
  const data = course.courseJSON;
  const completed = data.stages.filter((stage) => stage.completed).length;
  const progress = data.stages.length
    ? Math.round((completed / data.stages.length) * 100)
    : 0;
  return (
    <article className="course-card">
      <div className="course-card-meta">
        <FiBookOpen aria-hidden="true" />
        <span>{data.stages.length} etapas</span>
        <span>
          {enrolled
            ? progress === 100
              ? "Completado"
              : "En aprendizaje"
            : data.isPublic
              ? "Público"
              : "Privado"}
        </span>
      </div>
      <h2>
        <Link to={"/courses/" + (course.originalCourseID || course.courseID)}>
          {data.title}
        </Link>
      </h2>
      <p>{data.description}</p>
      {enrolled && (
        <div className="card-progress">
          <div>
            <span>
              {completed} de {data.stages.length} etapas
            </span>
            <strong>{progress}%</strong>
          </div>
          <progress
            value={progress}
            max="100"
            aria-label={"Progreso de " + data.title}
          />
        </div>
      )}
      <Link
        className="card-link"
        to={"/courses/" + (course.originalCourseID || course.courseID)}
      >
        {enrolled
          ? progress === 100
            ? "Repasar curso"
            : "Continuar aprendiendo"
          : "Ver ruta del curso"}
        <FiArrowRight aria-hidden="true" />
      </Link>
    </article>
  );
}

export default function CourseList() {
  const {
    enrolledCourses,
    createdCourses,
    coursesLoading,
    coursesError,
    refreshCourses,
  } = useCourseContext();
  const [view, setView] = useState("learning");
  const [search, setSearch] = useState("");
  const courses = view === "learning" ? enrolledCourses : createdCourses;
  // Legacy generators used visible=false; private courses still belong in their owner's library.
  const filtered = courses.filter((course) =>
    (course.courseJSON.title + " " + course.courseJSON.description)
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es")),
  );
  return (
    <main id="main-content" className="page library-page" tabIndex={-1}>
      <Helmet>
        <title>Mis cursos · Magister</title>
      </Helmet>
      <div className="page-heading">
        <div>
          <h1>Mis cursos</h1>
          <p>
            Retoma tus lecciones, comprueba tu progreso o empieza a aprender
            algo nuevo.
          </p>
        </div>
        <Link to="/new-course" className="button">
          <FiPlus aria-hidden="true" />
          Crear un curso
        </Link>
      </div>
      <div className="library-toolbar">
        <div className="view-switch" role="group" aria-label="Tipo de cursos">
          <button
            aria-pressed={view === "learning"}
            onClick={() => setView("learning")}
          >
            En aprendizaje <span>{enrolledCourses.length}</span>
          </button>
          <button
            aria-pressed={view === "created"}
            onClick={() => setView("created")}
          >
            Creados por mí <span>{createdCourses.length}</span>
          </button>
        </div>
        <label className="search-field">
          <FiSearch aria-hidden="true" />
          <span className="visually-hidden">Buscar en mis cursos</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar en mis cursos"
          />
        </label>
      </div>
      {coursesError ? (
        <div className="notice error" role="alert">
          <p>{coursesError}</p>
          <button className="button secondary" onClick={() => refreshCourses()}>
            Volver a intentar
          </button>
        </div>
      ) : coursesLoading ? (
        <p className="loading-state" role="status">
          Cargando tus cursos…
        </p>
      ) : filtered.length ? (
        <div className="course-grid">
          {filtered.map((course) => (
            <CourseCard
              key={course.courseID}
              course={course}
              enrolled={view === "learning"}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <FiBookOpen size={32} aria-hidden="true" />
          <h2>
            {search
              ? "No encontramos ese curso"
              : view === "learning"
                ? "¿Qué te gustaría aprender?"
                : "Tu primera ruta está por crear"}
          </h2>
          <p>
            {search
              ? "Prueba con otra palabra o borra la búsqueda."
              : "Elige un tema y la IA lo organizará en etapas, con lecciones y una evaluación en cada una."}
          </p>
          {search ? (
            <button className="button secondary" onClick={() => setSearch("")}>
              Borrar búsqueda
            </button>
          ) : (
            <div className="button-row">
              <Link className="button" to="/new-course">
                Crear mi primer curso
                <FiArrowRight aria-hidden="true" />
              </Link>
              <Link className="text-link" to="/search-courses">
                Explorar cursos públicos
              </Link>
            </div>
          )}
        </section>
      )}
      <section className="topic-section" aria-labelledby="topic-title">
        <div className="section-heading">
          <h2 id="topic-title">Una idea para empezar</h2>
          <span>Cualquier disciplina, a tu nivel</span>
        </div>
        <div className="topic-grid">
          {[
            "Fotografía desde cero",
            "Historia del arte",
            "Python para principiantes",
            "Finanzas personales",
            "Inglés para viajar",
            "Astronomía básica",
          ].map((topic) => (
            <Link
              key={topic}
              to={"/new-course?topic=" + encodeURIComponent(topic)}
            >
              {topic}
              <FiArrowRight aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <ol className="learning-steps">
        <li>
          <span>01</span>
          <div>
            <strong>Elige tu destino</strong>
            <p>Un tema, tu nivel y tu ritmo.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Sigue tu ruta</strong>
            <p>Conceptos claros, etapa a etapa.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Ponlo en práctica</strong>
            <p>Evalúate y vuelve a lo que necesites.</p>
          </div>
        </li>
      </ol>
    </main>
  );
}
