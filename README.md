# Magister

Aplicación del Grupo J para crear cursos con IA y aprender mediante rutas de cinco etapas, lecciones y evaluaciones. Mantiene React y Firebase para la interfaz, la sesión y los cursos.

## Ejecución local

Requiere Node.js 22 o posterior y npm.

1. Ejecuta `npm ci`.
2. Copia `.env.example` a `.env.local` y rellena la configuración web de tu propio proyecto Firebase. Activa Authentication con correo/contraseña y crea Firestore.
3. Copia `.env.server.example` a `.env.server`. Elige el proveedor y el modelo como se indica abajo. Configura también la API key y el ID del mismo proyecto Firebase. Añade tu UID de Firebase Authentication a `ALLOWED_FIREBASE_UIDS` (separados por comas si hay varios).
4. Ejecuta `npm run server` en una terminal y `npm start` en otra.
5. Abre <http://localhost:3000>. Inicia sesión con un usuario permitido para generar cursos.

La API escucha únicamente en `127.0.0.1:3001`; el servidor de desarrollo de React reenvía las peticiones `/api`. El backend acepta los orígenes locales del puerto 3000, valida la sesión con Firebase, restringe los usuarios que pueden consumir créditos y limita la generación a una petición por minuto y usuario, con una sola generación simultánea. Sin configuración, la generación queda bloqueada.

Este servidor está preparado para desarrollo local. Para desplegarlo, configura HTTPS, el proxy de `/api`, los orígenes permitidos y límites de gasto adecuados. Un alojamiento estático por sí solo no ejecuta el backend. Revisa y aplica las reglas de Firestore/Storage antes de conectar datos reales; las comprobaciones de la interfaz no sustituyen esas reglas. El repositorio no incluye ni modifica las reglas del proyecto existente.

## Cambiar el motor de IA

La selección se realiza exclusivamente en el servidor; no requiere cambiar la interfaz ni migrar los cursos existentes.

| Variable | Groq | OpenAI |
| --- | --- | --- |
| `AI_PROVIDER` | `groq` | `openai` |
| `AI_MODEL` | Modelo disponible con modo JSON | Modelo disponible compatible con Chat Completions y Structured Outputs |
| Clave privada | `GROQ_API_KEY` | `OPENAI_API_KEY` |
| `AI_MAX_OUTPUT_TOKENS` | 8192 por defecto | 8192 por defecto, incluye tokens de razonamiento |

Reinicia `npm run server` tras cambiar la configuración. Se admiten límites de salida de 1024 a 32768 tokens; ajusta el presupuesto según el modelo y la extensión del curso. Las respuestas truncadas o inválidas se rechazan y no se guardan. Para conservar configuraciones anteriores, si no se define `AI_PROVIDER` se usa Groq, y `GROQ_MODEL` sigue siendo válido cuando `AI_MODEL` está vacío. No se cambia automáticamente de proveedor tras un error.

La generación solicita contenido en español, ejemplos, actividades y cinco preguntas con explicación por etapa. OpenAI utiliza un esquema JSON estricto; ambos proveedores pasan por la validación del backend. Los cursos se crean privados y aparecen en «Creados por mí». El autor puede publicarlos desde su ruta.

## Aprendizaje y evaluación

- La biblioteca permite buscar cursos inscritos o creados. Explorar muestra los cursos públicos disponibles.
- Cada curso tiene una ruta con etapas completadas, pendientes y el siguiente paso recomendado. Las lecciones se pueden recorrer libremente.
- Al inscribirse se guarda una copia del curso con progreso propio. Superar una evaluación con al menos un 50% completa la etapa; repetirla no elimina una etapa ya completada.
- La evaluación exige responder todas las preguntas, muestra la corrección y las explicaciones después de guardar y conserva las respuestas si falla el guardado.
- Si se genera un curso pero falla su almacenamiento, el formulario permite volver a guardarlo sin repetir la llamada de IA mientras permanezca abierto.
- Las lecciones interpretan encabezados, listas y bloques de código, sin ejecutar HTML generado. Los cursos antiguos sin explicaciones siguen siendo legibles y evaluables.

## Credenciales y publicación

- Las claves de IA permanecen exclusivamente en el backend. Nunca las guardes en `src/`, `public/` ni en variables `REACT_APP_*`: estas se incluyen en el navegador.
- La configuración web de Firebase es pública por diseño. Su protección depende de las reglas de seguridad y de la configuración del proyecto.
- Los archivos `.env*` locales están excluidos de Git; solo se publican los ejemplos vacíos.
- **Revoca la antigua clave de Groq** en la consola del proveedor. Retirarla del código no la invalida ni limpia copias o publicaciones anteriores.

## Comprobaciones

`npm run test:server` comprueba la autenticación, los límites, ambos proveedores y la validación de cursos con servicios simulados, sin consumir créditos. `CI=true npm test -- --watchAll=false --runInBand` comprueba búsqueda, acceso directo a lecciones, corrección de preguntas y reintentos de guardado. `npm run build` compila el frontend tras configurar Firebase.

Referencias: [Firebase Auth REST](https://firebase.google.com/docs/reference/rest/auth), [API de Groq](https://console.groq.com/docs/api-reference) y [Chat Completions de OpenAI](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create).
