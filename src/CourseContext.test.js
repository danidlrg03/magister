import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { getDocs, updateDoc } from "firebase/firestore";
import { CourseProvider, useCourseContext } from "./CourseContext";

let mockAuthChanged;
const mockUser = { uid: "learner" };
jest.mock("./firebase", () => ({
  db: {},
  auth: {
    get currentUser() {
      return mockUser;
    },
    onAuthStateChanged: (callback) => {
      mockAuthChanged = callback;
      return () => {};
    },
  },
}));
jest.mock("firebase/firestore", () => ({
  collection: (_, name) => ({ name }),
  query: (ref, condition) => ({ ...ref, condition }),
  where: (field, op, value) => ({ field, value }),
  doc: (_, name, id) => ({ name, id }),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
}));
const courseJSON = {
  title: "Curso",
  stages: [
    { id: 1, completed: false, testScore: 0 },
    { id: 2, completed: false, testScore: 0 },
  ],
};
const enrolledSnapshot = {
  docs: [
    {
      id: "enrolled",
      data: () => ({
        courseString: JSON.stringify(courseJSON),
        originalCourseID: "original",
        userID: "learner",
      }),
    },
  ],
};
const empty = { docs: [] };
function Probe() {
  const context = useCourseContext();
  const course = context.enrolledCourses[0];
  return (
    <>
      <p data-testid="status">{context.coursesLoading ? "loading" : "ready"}</p>
      <p data-testid="error">{context.coursesError}</p>
      <p data-testid="score">{course?.courseJSON.stages[0].testScore ?? "-"}</p>
      <p data-testid="progress">
        {course?.courseJSON.completionPercentage ?? 0}
      </p>
      <button
        onClick={() =>
          context
            .updateStage(course, {
              ...course.courseJSON.stages[0],
              testScore: 100,
            })
            .catch(() => {})
        }
      >
        Save
      </button>
    </>
  );
}
beforeEach(() => {
  jest.clearAllMocks();
  getDocs.mockImplementation((ref) =>
    Promise.resolve(ref.name === "enrolledCourses" ? enrolledSnapshot : empty),
  );
  updateDoc.mockResolvedValue();
});
async function mount() {
  render(
    <CourseProvider>
      <Probe />
    </CourseProvider>,
  );
  act(() => mockAuthChanged(mockUser));
  await waitFor(() =>
    expect(screen.getByTestId("status")).toHaveTextContent("ready"),
  );
}

test("stage progress only changes after persistence succeeds", async () => {
  await mount();
  let finish;
  updateDoc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.click(screen.getByText("Save"));
  expect(screen.getByTestId("score")).toHaveTextContent("0");
  await act(async () => finish());
  expect(screen.getByTestId("score")).toHaveTextContent("100");
  expect(screen.getByTestId("progress")).toHaveTextContent("50");
  const saved = JSON.parse(updateDoc.mock.calls[0][1].courseString);
  expect(saved.stages[0].completed).toBe(true);
});
test("failed persistence leaves the previous progress untouched", async () => {
  await mount();
  updateDoc.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByText("Save"));
  await waitFor(() => expect(updateDoc).toHaveBeenCalled());
  expect(screen.getByTestId("score")).toHaveTextContent("0");
  expect(screen.getByTestId("progress")).toHaveTextContent("0");
});
test("a failed course load finishes with an actionable error", async () => {
  getDocs.mockRejectedValue(new Error("permission denied"));
  await mount();
  expect(screen.getByTestId("error")).toHaveTextContent(
    "No hemos podido cargar tus cursos",
  );
});
test("late course reads after sign-out cannot restore the previous user data", async () => {
  let finish;
  getDocs.mockImplementation((ref) =>
    ref.name === "enrolledCourses"
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve(empty),
  );
  render(
    <CourseProvider>
      <Probe />
    </CourseProvider>,
  );
  act(() => mockAuthChanged(mockUser));
  act(() => mockAuthChanged(null));
  await act(async () => finish(enrolledSnapshot));
  expect(screen.getByTestId("score")).toHaveTextContent("-");
});
