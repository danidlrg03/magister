import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FiSearch } from "react-icons/fi";
import { useCourseContext } from "../CourseContext";
import { CourseCard } from "./CourseList";
import "../styles/SearchPage.css";

export default function SearchPage() {
  const { allCourses, catalogStatus, fetchAllCourses } = useCourseContext();
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (catalogStatus === "idle") fetchAllCourses();
  }, [catalogStatus, fetchAllCourses]);
  const results = allCourses.filter(
    (course) =>
      course.courseJSON.isPublic &&
      (course.courseJSON.title + " " + course.courseJSON.description)
        .toLocaleLowerCase("es")
        .includes(search.trim().toLocaleLowerCase("es")),
  );
  return (
    <main id="main-content" className="page explore-page" tabIndex={-1}>
      <Helmet>
        <title>Explorar cursos · Magister</title>
      </Helmet>
      <div className="page-heading">
        <div>
          <h1>Explorar cursos</h1>
          <p>Explora las rutas que otros estudiantes han compartido.</p>
        </div>
      </div>
      <label className="search-field explore-search">
        <FiSearch aria-hidden="true" />
        <span className="visually-hidden">Buscar cursos públicos</span>
        <input
          type="search"
          placeholder="Busca un tema, una habilidad, una idea…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      {catalogStatus === "error" ? (
        <div className="notice error" role="alert">
          <p>No se pudieron cargar los cursos públicos.</p>
          <button className="button secondary" onClick={fetchAllCourses}>
            Volver a intentar
          </button>
        </div>
      ) : catalogStatus !== "ready" ? (
        <p className="loading-state" role="status">
          Cargando cursos públicos…
        </p>
      ) : (
        <>
          <p className="results-count" role="status">
            {results.length}{" "}
            {results.length === 1 ? "curso disponible" : "cursos disponibles"}
          </p>
          {results.length ? (
            <div className="course-grid">
              {results.map((course) => (
                <CourseCard key={course.courseID} course={course} />
              ))}
            </div>
          ) : (
            <section className="empty-state">
              <FiSearch size={30} aria-hidden="true" />
              <h2>
                {search
                  ? "Todavía no hay una ruta para esa búsqueda"
                  : "Aún no hay cursos públicos"}
              </h2>
              <p>Puedes crear un curso adaptado a lo que quieres aprender.</p>
              <Link
                className="button"
                to={"/new-course?topic=" + encodeURIComponent(search)}
              >
                Crear un curso sobre este tema
              </Link>
            </section>
          )}
        </>
      )}
    </main>
  );
}
