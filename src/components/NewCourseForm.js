import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FiArrowRight, FiCheck, FiLock } from "react-icons/fi";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useCourseContext } from "../CourseContext";
import { generateCourse } from "../IA/llamaAPI";
import { BackLink } from "./LearningUI";
import "../styles/NewCourseForm.css";

const levels = [
  ["beginner", "Desde cero", "Quiero empezar por lo esencial."],
  ["amateur", "Con una base", "Conozco algunos conceptos."],
  ["experienced", "Intermedio", "Quiero profundizar y practicar."],
  ["expert", "Avanzado", "Busco contenido especializado."],
];
const rhythms = [
  ["relaxed", "Tranquilo", "Lo esencial, paso a paso."],
  ["standard", "Equilibrado", "Teoría y práctica a partes iguales."],
  ["intensive", "Intensivo", "Más profundidad y retos."],
];

export default function NewCourseForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { createCourse } = useCourseContext();
  const [formData, setFormData] = useState({
    topic: (params.get("topic") || "").slice(0, 500),
    experience: "beginner",
    intensity: "relaxed",
  });
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const busy = useRef(false);
  const controller = useRef(null);
  const loading = phase !== "idle";
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!loading) return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [loading]);
  const change = (event) =>
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  const submit = async (event) => {
    event.preventDefault();
    if (busy.current) return;
    if (!formData.topic.trim()) {
      setError("Escribe el tema que quieres aprender.");
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("Tu sesión ha caducado. Vuelve a iniciar sesión.");
      return;
    }
    busy.current = true;
    setError("");
    setElapsed(0);
    controller.current = new AbortController();
    try {
      let courseString = generated;
      if (!courseString) {
        setPhase("generating");
        courseString = await generateCourse(
          formData.topic.trim(),
          formData.experience,
          formData.intensity,
          controller.current.signal,
        );
        if (controller.current.signal.aborted) return;
        setGenerated(courseString);
      }
      setPhase("saving");
      const docRef = await addDoc(collection(db, "courses"), {
        courseString,
        userID: currentUser.uid,
      });
      if (controller.current.signal.aborted) return;
      createCourse({
        courseString,
        courseID: docRef.id,
        userID: currentUser.uid,
      });
      navigate("/courses/" + docRef.id, { state: { created: true } });
    } catch (failure) {
      if (failure.name !== "AbortError")
        setError(
          failure.message || "No se pudo crear el curso. Inténtalo de nuevo.",
        );
    } finally {
      busy.current = false;
      setPhase("idle");
    }
  };
  return (
    <main id="main-content" className="page create-page" tabIndex={-1}>
      <Helmet>
        <title>Crear un curso · Magister</title>
      </Helmet>
      <BackLink />
      <div className="page-heading">
        <div>
          <h1>Crea tu ruta de aprendizaje</h1>
          <p>
            Dinos qué quieres aprender. La IA preparará cinco etapas con
            lecciones y pruebas.
          </p>
        </div>
      </div>
      <div className="creation-layout">
        <form className="creation-form" onSubmit={submit} aria-busy={loading}>
          <fieldset
            disabled={loading || Boolean(generated)}
            className="plain-fieldset"
          >
            <label className="field-label" htmlFor="topic">
              ¿Qué quieres aprender?
            </label>
            <textarea
              id="topic"
              name="topic"
              rows={3}
              maxLength={500}
              required
              value={formData.topic}
              onChange={change}
              placeholder="Por ejemplo: fotografía con el móvil para hacer mejores fotos de mis viajes"
              aria-describedby="topic-help"
            />
            <p id="topic-help" className="field-help">
              Añade un objetivo concreto para orientar el curso.{" "}
              <span>{formData.topic.length}/500</span>
            </p>
            <fieldset className="choice-group">
              <legend>¿Cuál es tu punto de partida?</legend>
              <div className="level-options">
                {levels.map(([value, label, help]) => (
                  <label className="choice-option" key={value}>
                    <input
                      type="radio"
                      name="experience"
                      value={value}
                      checked={formData.experience === value}
                      onChange={change}
                    />
                    <span>
                      <strong>{label}</strong>
                      <span>{help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="choice-group">
              <legend>¿Cómo prefieres aprender?</legend>
              <div className="rhythm-options">
                {rhythms.map(([value, label, help]) => (
                  <label className="choice-option" key={value}>
                    <input
                      type="radio"
                      name="intensity"
                      value={value}
                      checked={formData.intensity === value}
                      onChange={change}
                    />
                    <span>
                      <strong>{label}</strong>
                      <span>{help}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>
          {error && (
            <div className="notice error" role="alert">
              <p>{error}</p>
              {generated && (
                <p>
                  El contenido ya está generado. Puedes volver a guardarlo sin
                  pedir otro curso a la IA.
                </p>
              )}
            </div>
          )}
          {loading && (
            <div className="generation-status" role="status">
              <span className="spinner" aria-hidden="true" />
              <div>
                <strong>
                  {phase === "saving"
                    ? "Guardando tu curso…"
                    : "Preparando tus lecciones y evaluaciones…"}
                </strong>
                <p>
                  {elapsed < 60
                    ? "Puede tardar hasta dos minutos. Mantén esta página abierta."
                    : "Seguimos esperando la respuesta. Tu solicitud continúa en curso."}
                </p>
              </div>
            </div>
          )}
          <button
            className="button generate-button"
            disabled={loading}
            type="submit"
          >
            {loading
              ? "Creando tu ruta…"
              : generated
                ? "Volver a guardar el curso"
                : "Generar mi curso"}
            {!loading && <FiArrowRight aria-hidden="true" />}
          </button>
          <p className="privacy-note">
            <FiLock aria-hidden="true" />
            Tu curso será privado. Tú decides si lo compartes.
          </p>
        </form>
        <aside className="creation-preview" aria-labelledby="preview-title">
          <h2 id="preview-title">Así será tu ruta</h2>
          <p>Cinco etapas para avanzar desde tu nivel.</p>
          <ol className="mini-roadmap">
            {[
              "Un punto de partida claro",
              "Los conceptos esenciales",
              "Ejemplos que lo conectan todo",
              "Práctica para afianzarlo",
              "Un reto para ponerlo a prueba",
            ].map((title, index) => (
              <li key={title}>
                <span>{index + 1}</span>
                <div>
                  <strong>{title}</strong>
                  <p>Lección + evaluación</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="preview-note">
            <FiCheck aria-hidden="true" />
            <p>
              Repite las pruebas y repasa las lecciones siempre que lo
              necesites.
            </p>
          </div>
          <p className="ai-note">
            El contenido se genera con IA y puede contener errores. Contrasta
            los conceptos importantes.
          </p>
        </aside>
      </div>
    </main>
  );
}
