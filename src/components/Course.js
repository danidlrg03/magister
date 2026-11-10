import React, { useRef, useState } from "react";
import { useLoaderData, Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import { addDoc, collection } from "firebase/firestore";
import {
  FiArrowRight,
  FiCheck,
  FiClock,
  FiGlobe,
  FiLock,
} from "react-icons/fi";
import { auth, db } from "../firebase";
import {
  BackLink,
  CourseState,
  readMinutes,
  useCurrentCourse,
} from "./LearningUI";
import "../styles/Course.css";

export async function loader({ params }) {
  return { courseID: params.courseID };
}

export default function Course() {
  const { courseID } = useLoaderData();
  const location = useLocation();
  const state = useCurrentCourse(courseID);
  const { course, original, enrolled, updateCreatedCourse, addEnrolledCourse } =
    state;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmPublish, setConfirmPublish] = useState(false);
  const pending = useRef(false);
  if (!course || state.loading || state.error)
    return <CourseState state={state} />;
  const data = course.courseJSON;
  const completed = data.stages.filter((stage) => stage.completed).length;
  const progress = data.stages.length
    ? Math.round((completed / data.stages.length) * 100)
    : 0;
  const next = data.stages.find((stage) => !stage.completed) || data.stages[0];
  const isPublic = (original || course).courseJSON.isPublic;
  const action = async (type) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      if (type === "publish") {
        await updateCreatedCourse({
          ...original,
          courseJSON: { ...original.courseJSON, isPublic: true },
        });
        setConfirmPublish(false);
      } else {
        const courseJSON = {
          ...data,
          completionPercentage: 0,
          stages: data.stages.map((stage) => ({
            ...stage,
            completed: false,
            testScore: 0,
          })),
        };
        const enrollment = {
          courseString: JSON.stringify(courseJSON),
          userID: auth.currentUser.uid,
          originalCourseID: courseID,
        };
        const record = await addDoc(
          collection(db, "enrolledCourses"),
          enrollment,
        );
        addEnrolledCourse({ ...enrollment, courseID: record.id, courseJSON });
      }
    } catch {
      setError(
        type === "publish"
          ? "No se pudo publicar el curso. Inténtalo de nuevo."
          : "No se pudo guardar tu inscripción. Inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
      pending.current = false;
    }
  };
  return (
    <main id="main-content" className="page course-page" tabIndex={-1}>
      <Helmet>
        <title>{data.title} · Magister</title>
      </Helmet>
      <div className="course-topline">
        <BackLink />
        <span className="visibility-label">
          {isPublic ? (
            <FiGlobe aria-hidden="true" />
          ) : (
            <FiLock aria-hidden="true" />
          )}
          {isPublic ? "Curso público" : "Curso privado"}
        </span>
      </div>
      {location.state?.created && (
        <p className="notice success" role="status">
          Tu curso está listo. Explora la ruta e inscríbete para guardar tu
          progreso.
        </p>
      )}
      <div className="course-intro">
        <h1>{data.title}</h1>
        <p>{data.description}</p>
        <div className="course-facts">
          <span>{data.stages.length} etapas</span>
          <span>
            {data.stages.reduce(
              (sum, stage) => sum + stage.questions.length,
              0,
            )}{" "}
            preguntas
          </span>
          <span>A tu ritmo</span>
        </div>
      </div>
      <div className="course-layout">
        <section className="roadmap-section" aria-labelledby="roadmap-heading">
          <div className="section-heading">
            <h2 id="roadmap-heading">Tu ruta de aprendizaje</h2>
            <span>Sigue el orden o repasa una etapa</span>
          </div>
          <ol className="roadmap">
            {data.stages.map((stage, index) => (
              <li
                key={stage.id}
                className={
                  "roadmap-step " +
                  (enrolled && stage.completed
                    ? "completed"
                    : stage.id === next?.id
                      ? "current"
                      : "")
                }
              >
                <div className="step-marker" aria-hidden="true">
                  {enrolled && stage.completed ? (
                    <FiCheck />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </div>
                <Link
                  className="step-body"
                  to={"/courses/" + courseID + "/" + stage.id}
                >
                  <div className="step-heading">
                    <h3>{stage.title}</h3>
                    <FiArrowRight aria-hidden="true" />
                  </div>
                  <p>{stage.description}</p>
                  <div className="step-meta">
                    <span>
                      <FiClock aria-hidden="true" />
                      {readMinutes(stage.content)} min de lectura aprox.
                    </span>
                    <span>{stage.questions.length} preguntas</span>
                    {enrolled && (
                      <strong>
                        {stage.completed
                          ? "Completada"
                          : stage.id === next?.id
                            ? "Siguiente etapa"
                            : "Pendiente"}
                      </strong>
                    )}
                    {enrolled && (stage.completed || stage.testScore > 0) && (
                      <span>Última nota: {Math.round(stage.testScore)}%</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ol>
          <p className="ai-note">
            Contenido generado con IA. Contrasta los conceptos importantes con
            fuentes de referencia.
          </p>
        </section>
        <aside className="course-summary">
          <h2>{enrolled ? "Tu progreso" : "Empieza a aprender"}</h2>
          {enrolled ? (
            <>
              <div className="progress-heading">
                <strong>{progress}%</strong>
                <span>
                  {completed} de {data.stages.length} etapas
                </span>
              </div>
              <progress
                max="100"
                value={progress}
                aria-label="Progreso del curso"
              />
              <p>
                {progress === 100
                  ? "Has completado la ruta. Puedes volver a cualquier lección para repasar."
                  : "Completa la evaluación de cada etapa con al menos un 50% para avanzar."}
              </p>
              {next && (
                <Link
                  className="button"
                  to={"/courses/" + courseID + "/" + next.id}
                >
                  {progress === 100 ? "Repasar el curso" : "Continuar"}
                  <FiArrowRight aria-hidden="true" />
                </Link>
              )}
            </>
          ) : (
            <>
              <p>
                Inscríbete para hacer las evaluaciones y guardar tus avances.
                Puedes leer las lecciones antes de empezar.
              </p>
              <button
                className="button"
                disabled={busy}
                onClick={() => action("enroll")}
              >
                {busy ? "Guardando…" : "Inscribirme en el curso"}
              </button>
            </>
          )}
          {original && !isPublic && (
            <div className="publish-area">
              <h3>Comparte lo que aprendes</h3>
              {confirmPublish ? (
                <>
                  <p>
                    El curso aparecerá en Explorar y otros usuarios podrán
                    leerlo e inscribirse.
                  </p>
                  <div className="button-row">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => action("publish")}
                    >
                      Confirmar publicación
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setConfirmPublish(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>Tu curso es privado hasta que decidas publicarlo.</p>
                  <button
                    className="text-button"
                    onClick={() => setConfirmPublish(true)}
                  >
                    Publicar curso
                  </button>
                </>
              )}
            </div>
          )}
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
