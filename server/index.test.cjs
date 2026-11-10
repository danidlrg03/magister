const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { createHandler } = require("./index.cjs");

const env = {
  GROQ_API_KEY: "test-only-secret",
  GROQ_MODEL: "test-model",
  FIREBASE_WEB_API_KEY: "test-public-key",
  FIREBASE_PROJECT_ID: "test-project",
  ALLOWED_FIREBASE_UIDS: "allowed-user",
};
const makeToken = (claims = {}) =>
  `header.${Buffer.from(
    JSON.stringify({
      sub: "allowed-user",
      aud: env.FIREBASE_PROJECT_ID,
      iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      ...claims,
    }),
  ).toString("base64url")}.signature`;
const input = {
  topic: "JavaScript",
  experience: "beginner",
  intensity: "relaxed",
};
const course = {
  title: "Curso",
  description: "Descripción",
  isPublic: true,
  completionPercentage: 100,
  stages: Array.from({ length: 5 }, () => ({
    title: "Etapa",
    description: "Descripción",
    content: "Contenido",
    completed: true,
    testScore: 100,
    questions: Array.from({ length: 5 }, () => ({
      question: "¿Pregunta?",
      answers: ["Sí", "No", "A veces", "Nunca"],
      correctAnswer: 0,
      explanation: "Esta es la explicación del concepto.",
    })),
  })),
};
const jsonResponse = (data, ok = true) => ({ ok, json: async () => data });

function setup(overrides = {}) {
  const calls = [];
  const handler = createHandler({
    env,
    now: () => 100000,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.startsWith("https://identitytoolkit.googleapis.com/")) {
        return jsonResponse({ users: [{ localId: "allowed-user" }] });
      }
      return jsonResponse({
        choices: [{ message: { content: JSON.stringify(course) } }],
      });
    },
    ...overrides,
  });
  return { handler, calls };
}

async function request(handler, overrides = {}) {
  const req = Readable.from([overrides.body ?? JSON.stringify(input)]);
  Object.assign(
    req,
    { method: "POST", url: "/api/generate-course" },
    overrides,
  );
  req.headers = {
    origin: "http://localhost:3000",
    authorization: `Bearer ${makeToken()}`,
    "content-type": "application/json",
    ...overrides.headers,
  };
  const result = {};
  await handler(req, {
    writeHead(status, headers) {
      Object.assign(result, { status, headers });
    },
    end(body) {
      result.body = JSON.parse(body);
    },
  });
  return result;
}

test("missing server configuration blocks generation without upstream calls", async () => {
  const { handler, calls } = setup({ env: {} });
  assert.equal((await request(handler)).status, 503);
  assert.equal(calls.length, 0);
});

test("blocks unknown origins, missing tokens, wrong methods and invalid input", async () => {
  const { handler, calls } = setup();
  for (const [options, status] of [
    [{ headers: { origin: "https://untrusted.example" } }, 403],
    [{ headers: { authorization: "" } }, 401],
    [{ method: "GET" }, 405],
    [{ url: "/other" }, 404],
    [{ headers: { "content-type": "text/plain" } }, 415],
    [{ body: "{" }, 400],
    [{ body: "null" }, 400],
    [{ body: JSON.stringify({ ...input, topic: "" }) }, 400],
    [{ body: JSON.stringify({ ...input, experience: "invalid" }) }, 400],
    [{ body: "x".repeat(17000) }, 413],
  ])
    assert.equal((await request(handler, options)).status, status);
  assert.equal(calls.length, 0);
});

test("rejects expired sessions and users outside the allowlist before calling Groq", async () => {
  for (const [response, status] of [
    [jsonResponse({}, false), 401],
    [jsonResponse({ users: [] }), 401],
    [
      jsonResponse({ users: [{ localId: "allowed-user", disabled: true }] }),
      401,
    ],
    [jsonResponse({ users: [{ localId: "other-user" }] }), 403],
  ]) {
    let count = 0;
    const { handler } = setup({
      fetchImpl: async () => {
        count++;
        return response;
      },
    });
    const token = makeToken({
      sub: status === 403 ? "other-user" : "allowed-user",
    });
    assert.equal(
      (
        await request(handler, {
          headers: { authorization: `Bearer ${token}` },
        })
      ).status,
      status,
    );
    assert.equal(count, 1);
  }
});

test("rejects malformed tokens and tokens for another Firebase project", async () => {
  for (const token of [
    "invalid",
    makeToken({ aud: "other-project" }),
    makeToken({ iss: "other-issuer" }),
  ]) {
    const { handler, calls } = setup();
    assert.equal(
      (
        await request(handler, {
          headers: { authorization: `Bearer ${token}` },
        })
      ).status,
      401,
    );
    assert.equal(calls.length, 1);
  }
});

test("authorized generation keeps the Groq secret server-side and normalizes private course state", async () => {
  const { handler, calls } = setup();
  const result = await request(handler);
  assert.equal(result.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(
    calls[1].options.headers.Authorization,
    `Bearer ${env.GROQ_API_KEY}`,
  );
  assert.equal(JSON.parse(calls[0].options.body).idToken, makeToken());
  assert.equal(result.body.course.isPublic, false);
  assert.equal(result.body.course.visible, true);
  assert.equal(
    result.body.course.stages[0].questions[0].explanation,
    course.stages[0].questions[0].explanation,
  );
  assert.equal(result.body.course.completionPercentage, 0);
  assert.deepEqual(
    result.body.course.stages.map((stage) => stage.id),
    [1, 2, 3, 4, 5],
  );
  assert.equal(result.body.course.stages[0].completed, false);
  assert.equal(result.body.course.stages[0].testScore, 0);
  assert.equal(JSON.stringify(result).includes(env.GROQ_API_KEY), false);
  assert.equal(result.headers["Cache-Control"], "no-store");
  assert.equal((await request(handler)).status, 429);
  assert.equal(calls.length, 3); // Second request validates auth but never calls Groq.
});

test("provider failures and invalid generated courses never leak provider bodies or secrets", async () => {
  for (const provider of [
    jsonResponse({ error: env.GROQ_API_KEY }, false),
    jsonResponse({ choices: [{ message: { content: "not JSON" } }] }),
    jsonResponse({ choices: [{ message: { content: "{}" } }] }),
    jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({ ...course, stages: [course.stages[0]] }),
          },
        },
      ],
    }),
  ]) {
    const { handler } = setup({
      fetchImpl: async (url) =>
        url.includes("identitytoolkit")
          ? jsonResponse({ users: [{ localId: "allowed-user" }] })
          : provider,
    });
    const result = await request(handler);
    assert.equal(result.status, 502);
    assert.equal(JSON.stringify(result).includes(env.GROQ_API_KEY), false);
  }
});

test("network exceptions are sanitized", async () => {
  const { handler } = setup({
    fetchImpl: async () => {
      throw new Error(env.GROQ_API_KEY);
    },
  });
  const result = await request(handler);
  assert.equal(result.status, 502);
  assert.equal(JSON.stringify(result).includes(env.GROQ_API_KEY), false);
});

test("only one generation may run concurrently", async () => {
  let finish;
  let started;
  const pending = new Promise((resolve) => {
    started = resolve;
  });
  const { handler } = setup({
    now: (() => {
      let time = 100000;
      return () => (time += 60001);
    })(),
    fetchImpl: async (url) => {
      if (url.includes("identitytoolkit"))
        return jsonResponse({ users: [{ localId: "allowed-user" }] });
      started();
      return new Promise((resolve) => {
        finish = () =>
          resolve(
            jsonResponse({
              choices: [{ message: { content: JSON.stringify(course) } }],
            }),
          );
      });
    },
  });
  const first = request(handler);
  await pending;
  assert.equal((await request(handler)).status, 429);
  finish();
  assert.equal((await first).status, 200);
});

test("OpenAI uses its own credentials, strict schema and token budget", async () => {
  const { handler, calls } = setup({
    env: {
      ...env,
      AI_PROVIDER: "openai",
      AI_MODEL: "configured-model",
      OPENAI_API_KEY: "openai-test-secret",
      AI_MAX_OUTPUT_TOKENS: "16000",
    },
  });
  assert.equal((await request(handler)).status, 200);
  assert.equal(calls[1].url, "https://api.openai.com/v1/chat/completions");
  assert.equal(
    calls[1].options.headers.Authorization,
    "Bearer openai-test-secret",
  );
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.model, "configured-model");
  assert.equal(body.max_completion_tokens, 16000);
  assert.equal(body.store, false);
  assert.equal(body.temperature, undefined);
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(
    body.response_format.json_schema.schema.additionalProperties,
    false,
  );
});

test("invalid provider, missing provider-specific key and bad token budgets fail closed", async () => {
  for (const options of [
    { AI_PROVIDER: "unknown" },
    { AI_PROVIDER: "openai", AI_MODEL: "model" },
    { AI_MAX_OUTPUT_TOKENS: "NaN" },
    { AI_MAX_OUTPUT_TOKENS: "1000000" },
  ]) {
    const { handler, calls } = setup({ env: { ...env, ...options } });
    assert.equal((await request(handler)).status, 503);
    assert.equal(calls.length, 0);
  }
});

test("Groq accepts a configurable model without changing its endpoint", async () => {
  const { handler, calls } = setup({
    env: { ...env, AI_MODEL: "replacement-model" },
  });
  assert.equal((await request(handler)).status, 200);
  assert.equal(calls[1].url, "https://api.groq.com/openai/v1/chat/completions");
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.model, "replacement-model");
  assert.equal(body.response_format.type, "json_object");
  assert.match(body.messages[0].content, /Responde en español/);
});

test("truncated outputs, refusals and questions without explanations are not saved", async () => {
  const missingExplanation = JSON.parse(JSON.stringify(course));
  delete missingExplanation.stages[0].questions[0].explanation;
  for (const [choice, status] of [
    [
      { finish_reason: "length", message: { content: JSON.stringify(course) } },
      502,
    ],
    [{ message: { refusal: "provider detail" } }, 422],
    [{ message: { content: JSON.stringify(missingExplanation) } }, 502],
  ]) {
    const { handler } = setup({
      fetchImpl: async (url) =>
        url.includes("identitytoolkit")
          ? jsonResponse({ users: [{ localId: "allowed-user" }] })
          : jsonResponse({ choices: [choice] }),
    });
    assert.equal((await request(handler)).status, status);
  }
});
