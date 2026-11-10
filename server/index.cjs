const http = require('node:http');
const schema = require('./schema.cjs');

const fail = (status, message) => Object.assign(new Error(message), { status });
const text = value => typeof value === 'string' && value.trim().length > 0;

function normalizeCourse(course) {
  if (!course || !text(course.title) || !text(course.description) ||
      !Array.isArray(course.stages) || course.stages.length !== 5) {
    throw fail(502, 'El proveedor devolvió un curso inválido.');
  }
  const stages = course.stages.map((stage, index) => {
    if (!stage || !text(stage.title) || !text(stage.description) || !text(stage.content) ||
        !Array.isArray(stage.questions) || stage.questions.length !== 5) {
      throw fail(502, 'El proveedor devolvió una etapa inválida.');
    }
    const questions = stage.questions.map(question => {
      if (!question || !text(question.question) || !Array.isArray(question.answers) ||
          question.answers.length < 2 || !question.answers.every(text) ||
          !Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 ||
          question.correctAnswer >= question.answers.length) {
        throw fail(502, 'El proveedor devolvió una pregunta inválida.');
      }
      return { question: question.question, answers: question.answers, correctAnswer: question.correctAnswer };
    });
    return {
      id: index + 1, title: stage.title, description: stage.description,
      content: stage.content, completed: false, testScore: 0, questions,
    };
  });
  return {
    id: 0, title: course.title, description: course.description,
    visible: false, isPublic: false, completionPercentage: 0, stages,
  };
}

function createHandler({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const allowedUsers = new Set((env.ALLOWED_FIREBASE_UIDS || '').split(',').map(uid => uid.trim()).filter(Boolean));
  const lastRequest = new Map();
  let generating = false;

  return async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    let ownsGeneration = false;
    try {
      if (req.url !== '/api/generate-course') throw fail(404, 'Ruta no encontrada.');
      if (req.method !== 'POST') throw fail(405, 'Usa POST.');
      if (!['http://localhost:3000', 'http://127.0.0.1:3000'].includes(req.headers.origin)) {
        throw fail(403, 'Origen no permitido.');
      }
      if (!env.GROQ_API_KEY || !env.GROQ_MODEL || !env.FIREBASE_WEB_API_KEY ||
          !env.FIREBASE_PROJECT_ID || !allowedUsers.size) {
        throw fail(503, 'Configura las variables y los usuarios permitidos en el servidor.');
      }
      const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
      if (!token || token.length > 8192) throw fail(401, 'Inicia sesión para generar un curso.');
      if (!req.headers['content-type']?.startsWith('application/json')) {
        throw fail(415, 'Se requiere JSON.');
      }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 16384) throw fail(413, 'Solicitud demasiado grande.');
      }
      let input;
      try { input = JSON.parse(body); } catch { throw fail(400, 'JSON inválido.'); }
      if (!input || !text(input.topic) || input.topic.length > 500 ||
          !['beginner', 'amateur', 'experienced', 'expert'].includes(input.experience) ||
          !['relaxed', 'standard', 'intensive'].includes(input.intensity)) {
        throw fail(400, 'Parámetros de curso inválidos.');
      }

      // Google validates the ID token; never trust a JWT decoded locally alone.
      const authResponse = await fetchImpl(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
        {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000),
        }
      );
      if (!authResponse.ok) throw fail(401, 'Sesión inválida o caducada.');
      const user = (await authResponse.json()).users?.[0];
      let claims;
      try { claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()); }
      catch { throw fail(401, 'Sesión inválida.'); }
      if (!user || user.disabled || claims.sub !== user.localId ||
          claims.aud !== env.FIREBASE_PROJECT_ID ||
          claims.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) {
        throw fail(401, 'Sesión inválida para este proyecto.');
      }
      if (!allowedUsers.has(user.localId)) throw fail(403, 'Tu usuario no tiene permiso para generar cursos.');
      const timestamp = now();
      if (generating || (lastRequest.has(user.localId) && timestamp - lastRequest.get(user.localId) < 60000)) {
        throw fail(429, 'Espera un minuto antes de generar otro curso.');
      }
      generating = true;
      ownsGeneration = true;
      lastRequest.set(user.localId, timestamp);
      const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: env.GROQ_MODEL, temperature: 1, max_tokens: 8192,
          messages: [
            { role: 'system', content: `Create a detailed course with exactly 5 stages and 5 questions per stage. Stage content must be a string. Return only JSON following this schema: ${JSON.stringify(schema)}` },
            { role: 'user', content: `Generate a course on ${input.topic.trim()} for ${input.experience} users with ${input.intensity} intensity.` },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok) throw fail(502, 'No se pudo generar el curso. Comprueba la configuración y cuota de Groq.');
      const data = await response.json();
      let course;
      try { course = JSON.parse(data.choices?.[0]?.message?.content); }
      catch { throw fail(502, 'El proveedor devolvió una respuesta inválida.'); }
      reply(200, { course: normalizeCourse(course) });
    } catch (error) {
      // Do not return or log provider responses, credentials or user tokens.
      reply(error.status || 502, { error: error.status ? error.message : 'No se pudo contactar con el proveedor.' });
    } finally {
      if (ownsGeneration) generating = false;
    }
  };
}

if (require.main === module) {
  const server = http.createServer(createHandler());
  server.requestTimeout = 150000;
  server.listen(3001, '127.0.0.1', () => console.log('API local: http://127.0.0.1:3001'));
}

module.exports = { createHandler, normalizeCourse };
