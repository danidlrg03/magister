import React, { useEffect } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { FiArrowLeft, FiBookOpen } from "react-icons/fi";
import { useCourseContext } from "../CourseContext";
import Header from "./Header";

export function PageState({ title, children, error = false, onRetry }) {
  return (
    <main id="main-content" className="page state-page" tabIndex={-1}>
      <FiBookOpen size={28} aria-hidden="true" />
      <h1>{title}</h1>
      <div role={error ? "alert" : "status"}>{children}</div>
      {onRetry && (
        <button className="button" onClick={onRetry}>
          Volver a intentar
        </button>
      )}
      <Link className="text-link" to="/">
        Ir a mis cursos
      </Link>
    </main>
  );
}
export function ProtectedLayout() {
  const { user, authReady } = useCourseContext();
  const location = useLocation();
  if (!authReady)
    return (
      <PageState title="Preparando tu espacio">
        Comprobando tu sesión…
      </PageState>
    );
  if (!user)
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  return (
    <>
      <Header />
      <Outlet />
      <footer className="site-footer">
        Magister · Aprende a tu ritmo, etapa a etapa.
      </footer>
    </>
  );
}
export function BackLink({ to = "/", children = "Mis cursos" }) {
  return (
    <Link className="back-link" to={to}>
      <FiArrowLeft aria-hidden="true" />
      {children}
    </Link>
  );
}
export function useCurrentCourse(courseID) {
  const context = useCourseContext();
  const {
    enrolledCourses,
    createdCourses,
    allCourses,
    coursesLoading,
    coursesError,
    catalogStatus,
    fetchAllCourses,
  } = context;
  const enrollment = enrolledCourses.find(
    (course) => course.originalCourseID === courseID,
  );
  const original = createdCourses.find(
    (course) => course.courseID === courseID,
  );
  const course =
    enrollment ||
    original ||
    allCourses.find((course) => course.courseID === courseID);
  useEffect(() => {
    if (!coursesLoading && !coursesError && !course && catalogStatus === "idle")
      fetchAllCourses();
  }, [coursesLoading, coursesError, course, catalogStatus, fetchAllCourses]);
  return {
    ...context,
    course,
    original,
    enrolled: Boolean(enrollment),
    loading:
      coursesLoading ||
      (!course && !coursesError && ["idle", "loading"].includes(catalogStatus)),
    error:
      coursesError ||
      (!course && catalogStatus === "error"
        ? "No hemos podido cargar este curso."
        : ""),
  };
}
export function CourseState({ state }) {
  if (state.error)
    return (
      <PageState
        title="No se pudo cargar el curso"
        error
        onRetry={() =>
          state.coursesError ? state.refreshCourses() : state.fetchAllCourses()
        }
      >
        {state.error}
      </PageState>
    );
  if (state.loading)
    return (
      <PageState title="Cargando tu ruta">
        Estamos recuperando las etapas y tu progreso…
      </PageState>
    );
  return (
    <PageState title="Curso no encontrado">
      El enlace puede haber cambiado o el curso ya no está disponible.
    </PageState>
  );
}
export const readMinutes = (content) =>
  Math.max(1, Math.ceil((content || "").trim().split(/\s+/).length / 200));
