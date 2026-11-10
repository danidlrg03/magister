const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Readable } = require('node:stream');
const { createHandler } = require('./index.cjs');

const env = {
  GROQ_API_KEY: 'test-only-secret', GROQ_MODEL: 'test-model',
  FIREBASE_WEB_API_KEY: 'test-public-key', FIREBASE_PROJECT_ID: 'test-project',
  ALLOWED_FIREBASE_UIDS: 'allowed-user',
};
const makeToken = (claims = {}) => `header.${Buffer.from(JSON.stringify({
  sub: 'allowed-user', aud: env.FIREBASE_PROJECT_ID,
  iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`, ...claims,
})).toString('base64url')}.signature`;
const input = { topic: 'JavaScript', experience: 'beginner', intensity: 'relaxed' };
const course = {
  title: 'Curso', description: 'Descripción', isPublic: true, completionPercentage: 100,
  stages: Array.from({ length: 5 }, () => ({
    title: 'Etapa', description: 'Descripción', content: 'Contenido', completed: true, testScore: 100,
    questions: Array.from({ length: 5 }, () => ({ question: '¿Pregunta?', answers: ['Sí', 'No'], correctAnswer: 0 })),
  })),
};
const jsonResponse = (data, ok = true) => ({ ok, json: async () => data });

function setup(overrides = {}) {
  const calls = [];
  const handler = createHandler({
    env, now: () => 100000,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.startsWith('https://identitytoolkit.googleapis.com/')) {
        return jsonResponse({ users: [{ localId: 'allowed-user' }] });
      }
      return jsonResponse({ choices: [{ message: { content: JSON.stringify(course) } }] });
    },
    ...overrides,
  });
  return { handler, calls };
}

async function request(handler, overrides = {}) {
  const req = Readable.from([overrides.body ?? JSON.stringify(input)]);
  Object.assign(req, { method: 'POST', url: '/api/generate-course' }, overrides);
  req.headers = {
    origin: 'http://localhost:3000', authorization: `Bearer ${makeToken()}`,
    'content-type': 'application/json', ...overrides.headers,
  };
  const result = {};
  await handler(req, {
    writeHead(status, headers) { Object.assign(result, { status, headers }); },
    end(body) { result.body = JSON.parse(body); },
  });
  return result;
}

test('missing server configuration blocks generation without upstream calls', async () => {
  const { handler, calls } = setup({ env: {} });
  assert.equal((await request(handler)).status, 503);
  assert.equal(calls.length, 0);
});

test('blocks unknown origins, missing tokens, wrong methods and invalid input', async () => {
  const { handler, calls } = setup();
  for (const [options, status] of [
    [{ headers: { origin: 'https://untrusted.example' } }, 403],
    [{ headers: { authorization: '' } }, 401],
    [{ method: 'GET' }, 405],
    [{ url: '/other' }, 404],
    [{ headers: { 'content-type': 'text/plain' } }, 415],
    [{ body: '{' }, 400],
    [{ body: 'null' }, 400],
    [{ body: JSON.stringify({ ...input, topic: '' }) }, 400],
    [{ body: JSON.stringify({ ...input, experience: 'invalid' }) }, 400],
    [{ body: 'x'.repeat(17000) }, 413],
  ]) assert.equal((await request(handler, options)).status, status);
  assert.equal(calls.length, 0);
});

test('rejects expired sessions and users outside the allowlist before calling Groq', async () => {
  for (const [response, status] of [
    [jsonResponse({}, false), 401],
    [jsonResponse({ users: [] }), 401],
    [jsonResponse({ users: [{ localId: 'allowed-user', disabled: true }] }), 401],
    [jsonResponse({ users: [{ localId: 'other-user' }] }), 403],
  ]) {
    let count = 0;
    const { handler } = setup({ fetchImpl: async () => { count++; return response; } });
    const token = makeToken({ sub: status === 403 ? 'other-user' : 'allowed-user' });
    assert.equal((await request(handler, { headers: { authorization: `Bearer ${token}` } })).status, status);
    assert.equal(count, 1);
  }
});

test('rejects malformed tokens and tokens for another Firebase project', async () => {
  for (const token of ['invalid', makeToken({ aud: 'other-project' }), makeToken({ iss: 'other-issuer' })]) {
    const { handler, calls } = setup();
    assert.equal((await request(handler, { headers: { authorization: `Bearer ${token}` } })).status, 401);
    assert.equal(calls.length, 1);
  }
});

test('authorized generation keeps the Groq secret server-side and normalizes private course state', async () => {
  const { handler, calls } = setup();
  const result = await request(handler);
  assert.equal(result.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.Authorization, `Bearer ${env.GROQ_API_KEY}`);
  assert.equal(JSON.parse(calls[0].options.body).idToken, makeToken());
  assert.equal(result.body.course.isPublic, false);
  assert.equal(result.body.course.completionPercentage, 0);
  assert.deepEqual(result.body.course.stages.map(stage => stage.id), [1, 2, 3, 4, 5]);
  assert.equal(result.body.course.stages[0].completed, false);
  assert.equal(result.body.course.stages[0].testScore, 0);
  assert.equal(JSON.stringify(result).includes(env.GROQ_API_KEY), false);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.equal((await request(handler)).status, 429);
  assert.equal(calls.length, 3); // Second request validates auth but never calls Groq.
});

test('provider failures and invalid generated courses never leak provider bodies or secrets', async () => {
  for (const provider of [
    jsonResponse({ error: env.GROQ_API_KEY }, false),
    jsonResponse({ choices: [{ message: { content: 'not JSON' } }] }),
    jsonResponse({ choices: [{ message: { content: '{}' } }] }),
    jsonResponse({ choices: [{ message: { content: JSON.stringify({ ...course, stages: [course.stages[0]] }) } }] }),
  ]) {
    const { handler } = setup({ fetchImpl: async url => url.includes('identitytoolkit')
      ? jsonResponse({ users: [{ localId: 'allowed-user' }] }) : provider });
    const result = await request(handler);
    assert.equal(result.status, 502);
    assert.equal(JSON.stringify(result).includes(env.GROQ_API_KEY), false);
  }
});

test('network exceptions are sanitized', async () => {
  const { handler } = setup({ fetchImpl: async () => { throw new Error(env.GROQ_API_KEY); } });
  const result = await request(handler);
  assert.equal(result.status, 502);
  assert.equal(JSON.stringify(result).includes(env.GROQ_API_KEY), false);
});

test('only one generation may run concurrently', async () => {
  let finish;
  let started;
  const pending = new Promise(resolve => { started = resolve; });
  const { handler } = setup({
    now: (() => { let time = 100000; return () => (time += 60001); })(),
    fetchImpl: async url => {
      if (url.includes('identitytoolkit')) return jsonResponse({ users: [{ localId: 'allowed-user' }] });
      started();
      return new Promise(resolve => { finish = () => resolve(jsonResponse({ choices: [{ message: { content: JSON.stringify(course) } }] })); });
    },
  });
  const first = request(handler);
  await pending;
  assert.equal((await request(handler)).status, 429);
  finish();
  assert.equal((await first).status, 200);
});
