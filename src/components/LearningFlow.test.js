import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { addDoc } from "firebase/firestore";
import { useCourseContext } from "../CourseContext";
import { generateCourse } from "../IA/llamaAPI";
import Test, { evaluateAnswers } from "./Test";
import CourseList from "./CourseList";
import SearchPage from "./SearchPage";
import NewCourseForm from "./NewCourseForm";
import Stage, { LessonContent } from "./Stage";

jest.mock("../firebase", () => ({
  auth: { currentUser: { uid: "learner" } },
  db: {},
}));
jest.mock("firebase/auth", () => ({ signOut: jest.fn() }));
jest.mock("../CourseContext", () => ({ useCourseContext: jest.fn() }));
jest.mock("../IA/llamaAPI", () => ({ generateCourse: jest.fn() }));
jest.mock("firebase/firestore", () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
}));
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLoaderData: () => ({ courseID: "course", stageID: "1" }),
}));
const questions = [
  {
    question: "Primera pregunta",
    answers: ["Uno", "Dos"],
    correctAnswer: 1,
    explanation: "Dos es la respuesta porque…",
  },
  {
    question: "Segunda pregunta",
    answers: ["Tres", "Cuatro"],
    correctAnswer: 0,
    explanation: "Tres es la respuesta porque…",
  },
];
const course = {
  courseID: "enrollment",
  originalCourseID: "course",
  courseJSON: {
    title: "Mi curso",
    description: "Descripción",
    visible: false,
    stages: [
      {
        id: 1,
        title: "Primera etapa",
        description: "Descripción de etapa",
        content: "Contenido de la lección",
        questions,
        completed: false,
        testScore: 0,
      },
    ],
  },
};
let context;
const mount = (element, path = "/") =>
  render(<MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks();
  context = {
    user: { uid: "learner" },
    authReady: true,
    coursesLoading: false,
    coursesError: "",
    enrolledCourses: [course],
    createdCourses: [],
    allCourses: [],
    catalogStatus: "ready",
    fetchAllCourses: jest.fn(),
    updateStage: jest.fn().mockResolvedValue(),
    createCourse: jest.fn(),
  };
  useCourseContext.mockImplementation(() => context);
});

test("sparse answers are scored by question index, not their position in the DOM", () => {
  expect(evaluateAnswers(questions, { 1: 0 })).toEqual({
    correct: 1,
    score: 50,
  });
});
test("unanswered questions block submission and focus the missing question", () => {
  mount(<Test />);
  fireEvent.click(screen.getByLabelText("Tres"));
  fireEvent.click(screen.getByRole("button", { name: "Corregir evaluación" }));
  expect(context.updateStage).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Responde a todas");
  expect(screen.getByLabelText("Uno")).toHaveFocus();
});
test("failed result saves preserve answers and only show success after a successful retry", async () => {
  context.updateStage.mockRejectedValueOnce(new Error("offline"));
  mount(<Test />);
  fireEvent.click(screen.getByLabelText("Dos"));
  fireEvent.click(screen.getByLabelText("Tres"));
  fireEvent.click(screen.getByRole("button", { name: "Corregir evaluación" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Tus respuestas siguen aquí",
  );
  expect(screen.getByLabelText("Dos")).toBeChecked();
  expect(screen.queryByText("Etapa completada")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Corregir evaluación" }));
  expect(await screen.findByText("Etapa completada")).toBeInTheDocument();
  expect(context.updateStage).toHaveBeenLastCalledWith(
    course,
    expect.objectContaining({ testScore: 100 }),
  );
  expect(screen.getByText("Dos es la respuesta porque…")).toBeInTheDocument();
  expect(screen.getByLabelText(/^Dos/)).toBeDisabled();
});
test("private legacy courses remain visible and library search has a recoverable empty state", () => {
  context.createdCourses = [
    { ...course, courseID: "created", originalCourseID: undefined },
  ];
  mount(<CourseList />);
  fireEvent.click(screen.getByRole("button", { name: /Creados por mí/ }));
  expect(screen.getByText("Mi curso")).toBeInTheDocument();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "no existe" },
  });
  expect(screen.getByText("No encontramos ese curso")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Borrar búsqueda" }));
  expect(screen.getByText("Mi curso")).toBeInTheDocument();
});
test("an empty loaded catalog is not fetched again", () => {
  mount(<SearchPage />);
  expect(context.fetchAllCourses).not.toHaveBeenCalled();
  expect(screen.getByText("Aún no hay cursos públicos")).toBeInTheDocument();
});
test("catalog only displays public courses and searches descriptions", () => {
  context.allCourses = [
    {
      ...course,
      courseID: "public",
      courseJSON: {
        ...course.courseJSON,
        isPublic: true,
        description: "Astronomía",
      },
    },
    { ...course, courseID: "private" },
  ];
  mount(<SearchPage />);
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "astronomía" },
  });
  expect(screen.getByText("1 curso disponible")).toBeInTheDocument();
});
test("direct lesson access uses the enrolled course even when the public catalog is empty", () => {
  mount(<Stage />);
  expect(
    screen
      .getAllByText("Primera etapa")
      .some((element) => element.tagName === "H1"),
  ).toBe(true);
  expect(context.fetchAllCourses).not.toHaveBeenCalled();
});
test("generated HTML stays inert while headings, lists and code remain readable", () => {
  const { container } = mount(
    <LessonContent
      content={
        "## Conceptos\n\n- Uno\n- Dos\n\n<script>alert(1)</script>\n\n```js\nconst x = 1;\n```"
      }
    />,
  );
  expect(screen.getByText("Conceptos").tagName).toBe("H2");
  expect(container.getElementsByTagName("li")).toHaveLength(2);
  expect(container.getElementsByTagName("script")).toHaveLength(0);
  expect(container.getElementsByTagName("pre")[0]).toHaveTextContent(
    "const x = 1;",
  );
});
test("retrying persistence reuses the generated course instead of spending credits again", async () => {
  generateCourse.mockResolvedValue(JSON.stringify(course.courseJSON));
  addDoc
    .mockRejectedValueOnce(new Error("No se pudo guardar"))
    .mockResolvedValueOnce({ id: "created" });
  mount(<NewCourseForm />, "/new-course?topic=Astronom%C3%ADa");
  expect(screen.getByLabelText("¿Qué quieres aprender?")).toHaveValue(
    "Astronomía",
  );
  fireEvent.click(screen.getByRole("button", { name: "Generar mi curso" }));
  const retry = await screen.findByRole("button", {
    name: "Volver a guardar el curso",
  });
  fireEvent.click(retry);
  await waitFor(() => expect(context.createCourse).toHaveBeenCalled());
  expect(generateCourse).toHaveBeenCalledTimes(1);
  expect(addDoc).toHaveBeenCalledTimes(2);
});

test("leaving the generation form cancels the request and avoids a late save", async () => {
  let finish;
  generateCourse.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = mount(<NewCourseForm />, "/new-course?topic=Astronom%C3%ADa");
  fireEvent.click(screen.getByRole("button", { name: "Generar mi curso" }));
  const signal = generateCourse.mock.calls[0][3];
  view.unmount();
  expect(signal.aborted).toBe(true);
  finish(JSON.stringify(course.courseJSON));
  await Promise.resolve();
  expect(addDoc).not.toHaveBeenCalled();
});
