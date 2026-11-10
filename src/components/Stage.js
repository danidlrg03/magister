import React from "react";
import { Link, useLoaderData } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FiArrowRight, FiCheck, FiClock } from "react-icons/fi";
import {
  BackLink,
  CourseState,
  PageState,
  readMinutes,
  useCurrentCourse,
} from "./LearningUI";
import "../styles/Stage.css";

export async function loader({ params }) {
  return { courseID: params.courseID, stageID: params.stageID };
}

// Render a small, safe subset of Markdown without interpreting generated HTML.
export function LessonContent({ content }) {
  const blocks = content.replace(/\r\n/g, "\n").split(/(```[\s\S]*?```)/g);
  return (
    <div className="lesson-content">
      {blocks.flatMap((block, part) => {
        if (block.startsWith("```"))
          return (
            <pre key={"code-" + part}>
              <code>
                {block
                  .replace(/^```[^\n]*\n?/, "")
                  .replace(/```$/, "")
                  .trim()}
              </code>
            </pre>
          );
        return block
          .split(/\n\s*\n/)
          .filter((text) => text.trim())
          .map((paragraph, index) => {
            const key = part + "-" + index;
            const lines = paragraph.trim().split("\n");
            if (lines.every((line) => /^[-*] /.test(line)))
              return (
                <ul key={key}>
                  {lines.map((line, i) => (
                    <li key={i}>{line.slice(2)}</li>
                  ))}
                </ul>
              );
            if (lines.every((line) => /^\d+\. /.test(line)))
              return (
                <ol key={key}>
                  {lines.map((line, i) => (
                    <li key={i}>{line.replace(/^\d+\. /, "")}</li>
                  ))}
                </ol>
              );
            return lines.map((line, i) =>
              /^#{1,6} /.test(line) ? (
                <h2 key={key + "-" + i}>{line.replace(/^#{1,6} /, "")}</h2>
              ) : (
                <p key={key + "-" + i}>{line}</p>
              ),
            );
          });
      })}
    </div>
  );
}

export default function Stage() {
  const { courseID, stageID } = useLoaderData();
  const state = useCurrentCourse(courseID);
  if (!state.course || state.loading || state.error)
    return <CourseState state={state} />;
  const { course, enrolled } = state;
  const stages = course.courseJSON.stages;
  const index = stages.findIndex((stage) => String(stage.id) === stageID);
  const stage = stages[index];
  if (!stage)
    return (
      <PageState title="Etapa no encontrada">
        Vuelve al curso para elegir una lección disponible.
      </PageState>
    );
  const outline = (
    <ol>
      {stages.map((item, i) => (
        <li key={item.id}>
          <Link
            aria-current={item.id === stage.id ? "step" : undefined}
            to={"/courses/" + courseID + "/" + item.id}
          >
            <span>
              {enrolled && item.completed ? (
                <FiCheck aria-label="Completada" />
              ) : (
                String(i + 1).padStart(2, "0")
              )}
            </span>
            {item.title}
          </Link>
        </li>
      ))}
    </ol>
  );
  return (
    <main id="main-content" className="page lesson-page" tabIndex={-1}>
      <Helmet>
        <title>{stage.title} · Magister</title>
      </Helmet>
      <BackLink to={"/courses/" + courseID}>Volver a la ruta</BackLink>
      <div className="lesson-layout">
        <aside className="lesson-outline">
          <h2>{course.courseJSON.title}</h2>
          <nav aria-label="Etapas del curso">{outline}</nav>
          <Link className="text-link" to={"/courses/" + courseID}>
            Ver mapa completo
          </Link>
        </aside>
        <article className="lesson-article">
          <details className="mobile-outline">
            <summary>
              Etapas del curso · {index + 1} de {stages.length}
            </summary>
            <nav aria-label="Etapas del curso">{outline}</nav>
          </details>
          <div className="lesson-meta">
            <span>
              Etapa {index + 1} de {stages.length}
            </span>
            <span>
              <FiClock aria-hidden="true" />
              {readMinutes(stage.content)} min de lectura aprox.
            </span>
          </div>
          <h1>{stage.title}</h1>
          <p className="lesson-description">{stage.description}</p>
          <LessonContent content={stage.content} />
          <section className="lesson-checkpoint">
            <div>
              <h2>Comprueba lo que has aprendido</h2>
              <p>
                {stage.questions.length} preguntas. Puedes repasar la lección y
                repetir la evaluación.
              </p>
            </div>
            {enrolled ? (
              <Link
                className="button"
                to={"/courses/" + courseID + "/" + stage.id + "/test"}
              >
                Hacer evaluación
                <FiArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <Link className="button" to={"/courses/" + courseID}>
                Inscribirme para evaluarme
              </Link>
            )}
          </section>
          <nav
            className="lesson-pagination"
            aria-label="Navegación entre lecciones"
          >
            {index > 0 ? (
              <Link to={"/courses/" + courseID + "/" + stages[index - 1].id}>
                ← Etapa anterior
              </Link>
            ) : (
              <span />
            )}
            {index < stages.length - 1 && (
              <Link to={"/courses/" + courseID + "/" + stages[index + 1].id}>
                Siguiente etapa →
              </Link>
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}
