import { auth } from "../firebase";

// Provider selection, credentials and prompts stay on the server.
const generateCourse = async (topic, experience, intensity, signal) => {
  if (!auth.currentUser)
    throw new Error("Inicia sesión para generar un curso.");
  const token = await auth.currentUser.getIdToken();
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(
    () =>
      controller.abort(
        new Error(
          "El servidor tardó demasiado. Inténtalo de nuevo en un minuto.",
        ),
      ),
    135000,
  );
  try {
    const response = await fetch("/api/generate-course", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ topic, experience, intensity }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.course) {
      throw new Error(
        data?.error || "No se pudo contactar con el servidor de cursos.",
      );
    }
    return JSON.stringify(data.course, null, 4);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
};

export { generateCourse };
