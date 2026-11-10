import React, { useEffect, useRef, useState } from "react";
import { useLoaderData, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import {
  BackLink,
  CourseState,
  PageState,
  useCurrentCourse,
} from "./LearningUI";
import "../styles/Test.css";

export function evaluateAnswers(questions, answers) {
  const correct = questions.reduce(
    (sum, question, index) =>
      sum + (answers[index] === question.correctAnswer ? 1 : 0),
    0,
  );
  return {
    correct,
    score: questions.length ? (correct / questions.length) * 100 : 0,
  };
}

export default function Test() {
  const { courseID, stageID } = useLoaderData();
  const state = useCurrentCourse(courseID);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const resultRef = useRef(null);
  const pending = useRef(false);
  useEffect(() => {
    setAnswers({});
    setResult(null);
    setError("");
  }, [courseID, stageID]);
  useEffect(() => {
    if (result) resultRef.current?.focus();
  }, [result]);
  if (!state.course || state.loading || state.error)
    return <CourseState state={state} />;
  const { course, enrolled, updateStage } = state;
  const stage = course.courseJSON.stages.find(
    (item) => String(item.id) === stageID,
  );
  if (!stage)
    return (
      <PageState title="Evaluación no encontrada">
        Vuelve al curso para elegir una etapa.
      </PageState>
    );
  if (!enrolled)
    return (
      <PageState title="Inscríbete para guardar tus resultados">
        <Link className="button" to={"/courses/" + courseID}>
          Volver al curso e inscribirme
        </Link>
      </PageState>
    );
  const questions = stage.questions;
  const answered = Object.keys(answers).length;
  const submit = async (event) => {
    event.preventDefault();
    if (pending.current || result) return;
    if (answered !== questions.length) {
      setError(
        "Responde a todas las preguntas antes de corregir la evaluación.",
      );
      const missing = questions.findIndex(
        (_, index) => answers[index] === undefined,
      );
      document.getElementById("answer-" + missing + "-0")?.focus();
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    const evaluated = evaluateAnswers(questions, answers);
    try {
      await updateStage(course, { ...stage, testScore: evaluated.score });
      setResult(evaluated);
    } catch {
      setError(
        "No se pudo guardar tu resultado. Tus respuestas siguen aquí: vuelve a intentarlo.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return (
    <main id="main-content" className="page quiz-page" tabIndex={-1}>
      <Helmet>
        <title>Evaluación: {stage.title} · Magister</title>
      </Helmet>
      <BackLink to={"/courses/" + courseID + "/" + stage.id}>
        Volver a la lección
      </BackLink>
      <div className="page-heading">
        <div>
          <h1>Pon a prueba lo aprendido</h1>
          <p>{stage.title}</p>
        </div>
      </div>
      {result && (
        <section
          className={
            "quiz-result " + (result.score >= 50 ? "passed" : "review")
          }
          ref={resultRef}
          tabIndex={-1}
          aria-labelledby="result-title"
        >
          <FiCheckCircle size={28} aria-hidden="true" />
          <h2 id="result-title">
            {result.score >= 50
              ? "Etapa completada"
              : "Un poco de repaso y otro intento"}
          </h2>
          <p>
            <strong>{Math.round(result.score)}%</strong> · {result.correct} de{" "}
            {questions.length} respuestas correctas. Resultado guardado.
          </p>
          <p>
            Revisa las respuestas de abajo para afianzar lo que has aprendido.
          </p>
          <div className="button-row">
            <Link className="button" to={"/courses/" + courseID}>
              Volver a mi ruta
            </Link>
            <button
              className="button secondary"
              onClick={() => {
                setResult(null);
                setAnswers({});
                document.getElementById("main-content")?.focus();
                window.scrollTo(0, 0);
              }}
            >
              <FiRefreshCw aria-hidden="true" />
              Repetir evaluación
            </button>
          </div>
        </section>
      )}
      <div className="quiz-progress">
        <span>
          {answered} de {questions.length} respondidas
        </span>
        <span>Se completa con un 50%</span>
        <progress
          max={questions.length}
          value={answered}
          aria-label="Preguntas respondidas"
        />
      </div>
      <form onSubmit={submit} noValidate>
        {questions.map((question, index) => (
          <fieldset
            disabled={saving || Boolean(result)}
            className="question"
            key={index}
          >
            <legend>
              <span>Pregunta {index + 1}</span>
              {question.question}
            </legend>
            <div className="answer-options">
              {question.answers.map((answer, option) => (
                <label
                  key={option}
                  className={
                    "answer-option " +
                    (result && option === question.correctAnswer
                      ? "correct-answer"
                      : result && answers[index] === option
                        ? "wrong-answer"
                        : "")
                  }
                >
                  <input
                    type="radio"
                    id={"answer-" + index + "-" + option}
                    name={"question-" + index}
                    value={option}
                    checked={answers[index] === option}
                    onChange={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [index]: option,
                      }))
                    }
                  />
                  <span>{answer}</span>
                  {result && option === question.correctAnswer && (
                    <strong>Correcta</strong>
                  )}
                  {result &&
                    answers[index] === option &&
                    option !== question.correctAnswer && (
                      <strong>Tu respuesta</strong>
                    )}
                </label>
              ))}
            </div>
            {result && (
              <div className="answer-feedback">
                <strong>
                  {answers[index] === question.correctAnswer
                    ? "Bien hecho."
                    : "Para repasar:"}
                </strong>
                <p>
                  {question.explanation ||
                    "La respuesta correcta es: " +
                      question.answers[question.correctAnswer] +
                      ". Vuelve a la lección para repasar este concepto."}
                </p>
              </div>
            )}
          </fieldset>
        ))}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {!result && (
          <div className="quiz-submit">
            <span>Puedes cambiar tus respuestas antes de enviar.</span>
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Guardando resultado…" : "Corregir evaluación"}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
