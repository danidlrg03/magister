// App.js
import React from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { CourseProvider } from './CourseContext';
import Header from './components/Header';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import CourseList from './components/CourseList';
import CourseCreated, {loader as courseLoaderById} from './components/Course';
import Stage, {loader as stageLoaderById} from './components/Stage';
import Test from './components/Test';
import NewCourseForm from './components/NewCourseForm';
import SearchPage from './components/SearchPage';

const router = createBrowserRouter(
  [
    {
      path: '/login',
      element : 
      (<>
        <Helmet>
          <title>Iniciar Sesión</title>
        </Helmet>
        <Login />
      </>)
    },
    {
      path: '/signup',
      element : 
      (<>
        <Helmet>
          <title>Registrarse</title>
        </Helmet>
        <Signup />
      </>)
    },
    {
      path: '/',
      element: (
        <>
          <Helmet>
            <title>Listado de Cursos</title>
          </Helmet>
          <Header />
          <CourseList />
        </>
      ),
      children: []
    },
    {
      path: '/new-course',
      element: (
        <>
          <Helmet>
            <title>Crear Nuevo Curso</title>
          </Helmet>
          <Header />
          <NewCourseForm />
        </>
      ),
    },
    {
      path: '/courses/:courseID',
      element: (
        <>
          <Helmet>
            <title>Página de Curso</title>
          </Helmet>
          <Header />        
          <CourseCreated />,
        </>
      ),
      loader: courseLoaderById
    },
    {
      path: '/courses/:courseID/:stageID',
      element: (
        <>
          <Helmet>
            <title title>Etapa de Curso</title>
          </Helmet>
          <Header />        
          <Stage />,
        </>
      ),
      loader: stageLoaderById
    },
    {
      path: '/courses/:courseID/:stageID/test',
      element: (
        <>
          <Helmet>
            <title>Prueba de Etapa</title>
          </Helmet>
          <Header />        
          <Test />
        </>
      ),
      loader: stageLoaderById
    },
    {
      path: 'search-courses',
      element: (
        <>
          <Helmet>
            <title>Buscar Cursos</title>
          </Helmet>
          <Header />        
          <SearchPage />
        </>
      ),
      loader: courseLoaderById
    }
  ]
);

document.documentElement.lang = "es"; 

const App = () => {
  return (
    <CourseProvider>
      <RouterProvider router={router} />
    </CourseProvider>
  );
}

// const App = () => {
//   return (
//     <Router>
//       <Routes>
//         <Route path="/" element={<CourseList courses={courses} />} />
//         <Route path="/new-course" element={<NewCourseForm />} />
//         <Route path="/course/:id" element={<Course />} />
//       </Routes>
//     </Router>
//   );
// };

export default App;
