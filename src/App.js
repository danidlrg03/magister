import React, { useEffect } from "react";
import {
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useRouteError,
  Outlet,
} from "react-router-dom";
import { CourseProvider } from "./CourseContext";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import CourseList from "./components/CourseList";
import Course, { loader as courseLoader } from "./components/Course";
import Stage, { loader as stageLoader } from "./components/Stage";
import Test from "./components/Test";
import NewCourseForm from "./components/NewCourseForm";
import SearchPage from "./components/SearchPage";
import { PageState, ProtectedLayout } from "./components/LearningUI";

function RouteFocus() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);
  return <Outlet />;
}
function RouteError() {
  const error = useRouteError();
  return (
    <PageState
      title={
        error?.status === 404
          ? "Página no encontrada"
          : "No se pudo abrir esta página"
      }
      error
    >
      Vuelve a tus cursos para continuar aprendiendo.
    </PageState>
  );
}
const router = createBrowserRouter([
  {
    element: <RouteFocus />,
    errorElement: <RouteError />,
    children: [
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <Signup /> },
      {
        element: <ProtectedLayout />,
        children: [
          { path: "/", element: <CourseList /> },
          { path: "/new-course", element: <NewCourseForm /> },
          {
            path: "/courses/:courseID",
            element: <Course />,
            loader: courseLoader,
          },
          {
            path: "/courses/:courseID/:stageID",
            element: <Stage />,
            loader: stageLoader,
          },
          {
            path: "/courses/:courseID/:stageID/test",
            element: <Test />,
            loader: stageLoader,
          },
          { path: "/search-courses", element: <SearchPage /> },
        ],
      },
    ],
  },
]);
export default function App() {
  return (
    <CourseProvider>
      <RouterProvider router={router} />
    </CourseProvider>
  );
}
