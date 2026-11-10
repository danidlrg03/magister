import { auth } from "../firebase";

// Groq credentials and prompts stay on the server.
const generateCourse = async (topic, experience, intensity) => {
  if (!auth.currentUser) throw new Error("Inicia sesión para generar un curso.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch("/api/generate-course", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ topic, experience, intensity }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.course) {
    throw new Error(data?.error || "No se pudo contactar con el servidor de cursos.");
  }
  return JSON.stringify(data.course, null, 4);
};

export { generateCourse };
