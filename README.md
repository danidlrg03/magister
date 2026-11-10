# Magister

Prototipo del Grupo J para crear y estudiar cursos con React y Firebase.

## Ejecución local

Requiere Node.js 22 o posterior y npm.

1. Ejecuta `npm ci`.
2. Copia `.env.example` a `.env.local` y rellena la configuración web de tu propio proyecto Firebase. Activa Authentication con correo/contraseña y crea Firestore.
3. Copia `.env.server.example` a `.env.server`. Configura una **nueva** clave de Groq, un modelo de chat disponible compatible con JSON, la API key y el ID del mismo proyecto Firebase. Añade tu UID de Firebase Authentication a `ALLOWED_FIREBASE_UIDS` (separados por comas si hay varios).
4. Ejecuta `npm run server` en una terminal y `npm start` en otra.
5. Abre <http://localhost:3000>. Inicia sesión con un usuario permitido para generar cursos.

La API escucha únicamente en `127.0.0.1:3001`; el servidor de desarrollo de React reenvía las peticiones `/api`. El backend acepta los orígenes locales del puerto 3000, valida la sesión con Firebase, restringe los usuarios que pueden consumir créditos y limita la generación a una petición por minuto y usuario, con una sola generación simultánea. Sin configuración, la generación queda bloqueada.

Este servidor está preparado para desarrollo local. Para desplegarlo, configura HTTPS, el proxy de `/api`, los orígenes permitidos y límites de gasto adecuados. Un alojamiento estático por sí solo no ejecuta el backend. Revisa y aplica las reglas de Firestore/Storage antes de conectar datos reales; las comprobaciones de la interfaz no sustituyen esas reglas. El repositorio no incluye ni modifica las reglas del proyecto existente.

## Credenciales y publicación

- La clave de Groq permanece exclusivamente en el backend. Nunca la guardes en `src/`, `public/` ni en variables `REACT_APP_*`: estas se incluyen en el navegador.
- La configuración web de Firebase es pública por diseño. Su protección depende de las reglas de seguridad y de la configuración del proyecto.
- Los archivos `.env*` locales están excluidos de Git; solo se publican los ejemplos vacíos.
- **Revoca la antigua clave de Groq** en la consola del proveedor. Retirarla del código no la invalida ni limpia copias o publicaciones anteriores.

## Comprobaciones

`npm run test:server` comprueba el backend con servicios simulados, sin consumir créditos. `npm run build` compila el frontend tras configurar Firebase.

Referencias: [Firebase Auth REST](https://firebase.google.com/docs/reference/rest/auth) y [API de Groq](https://console.groq.com/docs/api-reference).
