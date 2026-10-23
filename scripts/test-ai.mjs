// Backend ka test (asli API call nahi, nakli jawab). Chalane ke liye: npm run test:ai
// Check karta hai: Gemini aur OpenAI-compatible adapters, chat, summary, errors, provider switching.

import assert from "node:assert/strict";

const realFetch = globalThis.fetch;
let calls = [];

function mockFetch(handler) {
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    const { status = 200, json } = handler(url, opts);
    return { ok: status < 400, status, json: async () => json };
  };
}

const geminiOk = (obj) => ({ json: { candidates: [{ content: { parts: [{ text: typeof obj === "string" ? obj : JSON.stringify(obj) }] } }] } });
const openaiOk = (obj) => ({ json: { choices: [{ message: { content: typeof obj === "string" ? obj : JSON.stringify(obj) } }] } });

function setEnv(env) {
  for (const k of ["AI_PROVIDER", "AI_MODEL", "AI_BASE_URL", "AI_TIMEOUT_SECONDS", "AI_THINKING_LEVEL", "GEMINI_API_KEY", "OPENAI_API_KEY"]) delete process.env[k];
  Object.assign(process.env, env);
}

async function callHandler(handler, body) {
  let out;
  const res = { status(c) { this.code = c; return this; }, json(d) { out = { ...d, httpStatus: this.code ?? 200 }; return this; } };
  await handler({ method: "POST", body }, res);
  return out;
}

const { default: chat } = await import("../api/chat.js");
const { default: summary } = await import("../api/summary.js");
const { getAiStatus } = await import("../server/ai/index.js");

let passed = 0;
async function test(name, fn) {
  calls = [];
  try {
    await fn();
    passed += 1;
    console.log("  ok  -", name);
  } catch (err) {
    console.log("FAIL  -", name, "\n       ", err.message);
    process.exitCode = 1;
  }
}

const GEMINI = { AI_PROVIDER: "gemini", AI_MODEL: "model-a", GEMINI_API_KEY: "KEY1" };
const OPENAI = { AI_PROVIDER: "openai", AI_MODEL: "model-b", AI_BASE_URL: "https://example.test/v1/", OPENAI_API_KEY: "KEY2" };

console.log("Gemini provider");
await test("session start sends start note and JSON mode, key only in header", async () => {
  setEnv(GEMINI);
  mockFetch(() => geminiOk({ reply: "Hi! What is your name?", corrections: [], vocabulary: [] }));
  const out = await callHandler(chat, { messages: [], level: "Beginner", topic: "Daily Routine" });
  assert.equal(out.ok, true);
  assert.equal(out.reply, "Hi! What is your name?");
  assert.match(calls[0].url, /models\/model-a:generateContent$/);
  assert.equal(calls[0].opts.headers["x-goog-api-key"], "KEY1");
  assert.ok(!calls[0].url.includes("KEY1"));
  assert.equal(calls[0].body.generationConfig.responseMimeType, "application/json");
  assert.match(calls[0].body.system_instruction.parts[0].text, /Beginner/);
});

await test("punctuation-only corrections are dropped, real ones kept", async () => {
  setEnv(GEMINI);
  mockFetch(() => geminiOk({
    reply: "Nice!",
    corrections: [
      { original: "I am go to office", corrected: "I go to the office", explanation: "x", better: "" },
      { original: "my name is ali", corrected: "My name is Ali.", explanation: "x", better: "" },
    ],
    vocabulary: [{ word: "commute", meaning: "safar" }],
  }));
  const out = await callHandler(chat, { messages: [{ role: "user", text: "I am go to office" }] });
  assert.equal(out.corrections.length, 1);
  assert.equal(out.vocabulary.length, 1);
});

await test("focus from last session reaches the prompt", async () => {
  setEnv(GEMINI);
  mockFetch(() => geminiOk({ reply: "ok", corrections: [], vocabulary: [] }));
  await callHandler(chat, { messages: [{ role: "user", text: "hi" }], focus: ["past tense"] });
  assert.match(calls[0].body.system_instruction.parts[0].text, /past tense/);
});

await test("markdown-fenced JSON still parses; garbage gives a clean error", async () => {
  setEnv(GEMINI);
  mockFetch(() => geminiOk("```json\n" + JSON.stringify({ reply: "Great!", corrections: [] }) + "\n```"));
  assert.equal((await callHandler(chat, { messages: [{ role: "user", text: "hi" }] })).reply, "Great!");
  mockFetch(() => geminiOk("not json at all"));
  const bad = await callHandler(chat, { messages: [{ role: "user", text: "hi" }] });
  assert.equal(bad.ok, false);
});

await test("quota, bad key and missing model map to clear codes", async () => {
  setEnv(GEMINI);
  mockFetch(() => ({ status: 429, json: { error: { message: "Quota exceeded" } } }));
  assert.equal((await callHandler(chat, { messages: [{ role: "user", text: "hi" }] })).code, "quota");
  mockFetch(() => ({ status: 400, json: { error: { message: "API key not valid" } } }));
  assert.equal((await callHandler(chat, { messages: [{ role: "user", text: "hi" }] })).code, "auth");
  mockFetch(() => ({ status: 404, json: { error: { message: "not found" } } }));
  assert.equal((await callHandler(chat, { messages: [{ role: "user", text: "hi" }] })).code, "model");
});

await test("summary sends only learner lines and returns report", async () => {
  setEnv(GEMINI);
  mockFetch(() => geminiOk({ overall: "Achha raha.", wentWell: ["a"], fluencyTips: ["b"], nextFocus: ["past tense"] }));
  const out = await callHandler(summary, {
    transcript: [{ role: "assistant", text: "COACHLINE" }, { role: "user", text: "I like cricket" }],
    corrections: [{ original: "x", corrected: "y" }],
    seconds: 300,
    level: "Beginner",
    topic: "Hobbies",
  });
  assert.equal(out.ok, true);
  assert.deepEqual(out.nextFocus, ["past tense"]);
  const sent = calls[0].body.contents[0].parts[0].text;
  assert.match(sent, /I like cricket/);
  assert.ok(!sent.includes("COACHLINE"));
  assert.match(calls[0].body.system_instruction.parts[0].text, /do NOT give any pronunciation/);
});

await test("summary with no learner lines is rejected without calling AI", async () => {
  setEnv(GEMINI);
  mockFetch(() => geminiOk({}));
  const out = await callHandler(summary, { transcript: [{ role: "assistant", text: "hi" }] });
  assert.equal(out.httpStatus, 400);
  assert.equal(calls.length, 0);
});

console.log("OpenAI-compatible provider (provider switching: sirf .env badla)");
await test("same chat code works after switching provider", async () => {
  setEnv(OPENAI);
  mockFetch(() => openaiOk({ reply: "Hello from other provider", corrections: [], vocabulary: [] }));
  const out = await callHandler(chat, { messages: [{ role: "user", text: "hi" }] });
  assert.equal(out.ok, true);
  assert.equal(out.reply, "Hello from other provider");
  assert.equal(calls[0].url, "https://example.test/v1/chat/completions");
  assert.equal(calls[0].opts.headers.Authorization, "Bearer KEY2");
  assert.equal(calls[0].body.model, "model-b");
  assert.equal(calls[0].body.messages[0].role, "system");
  assert.equal(calls[0].body.messages.at(-1).content, "hi");
});

await test("missing AI_BASE_URL gives a clear config error", async () => {
  setEnv({ ...OPENAI, AI_BASE_URL: "" });
  mockFetch(() => openaiOk({}));
  const out = await callHandler(chat, { messages: [{ role: "user", text: "hi" }] });
  assert.equal(out.ok, false);
  assert.match(out.detail, /AI_BASE_URL/);
  assert.equal(calls.length, 0);
});

await test("quota error maps the same way for this provider", async () => {
  setEnv(OPENAI);
  mockFetch(() => ({ status: 429, json: { error: { message: "rate limit" } } }));
  assert.equal((await callHandler(chat, { messages: [{ role: "user", text: "hi" }] })).code, "quota");
});

console.log("Config");
await test("health status reports setup problems without exposing the key", async () => {
  assert.equal(getAiStatus({ AI_PROVIDER: "gemini", AI_MODEL: "m", GEMINI_API_KEY: "SECRET" }).ok, true);
  assert.ok(!JSON.stringify(getAiStatus({ AI_PROVIDER: "gemini", AI_MODEL: "m", GEMINI_API_KEY: "SECRET" })).includes("SECRET"));
  assert.equal(getAiStatus({ AI_PROVIDER: "gemini", AI_MODEL: "m" }).ok, false);
  assert.equal(getAiStatus({ AI_PROVIDER: "gemini" }).ok, false);
  assert.equal(getAiStatus({ AI_PROVIDER: "nope", AI_MODEL: "m" }).ok, false);
});

console.log("Diagnostics and tuning");
await test("timeout error says how long it waited; thinking level and timeout come from env", async () => {
  setEnv({ ...GEMINI, AI_TIMEOUT_SECONDS: "5", AI_THINKING_LEVEL: "low" });
  mockFetch(() => geminiOk({ reply: "ok", corrections: [], vocabulary: [] }));
  await callHandler(chat, { messages: [{ role: "user", text: "hi" }] });
  assert.deepEqual(calls[0].body.generationConfig.thinkingConfig, { thinkingLevel: "low" });
  // fetch jo kabhi jawab na de, abort signal par band ho
  globalThis.fetch = (url, opts) => new Promise((_, reject) => opts.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  const t0 = Date.now();
  const out = await callHandler(chat, { messages: [{ role: "user", text: "hi" }] });
  assert.equal(out.code, "timeout");
  assert.match(out.detail, /second/);
  assert.ok(Date.now() - t0 >= 4900 && Date.now() - t0 < 8000);
});

await test("no thinking config unless asked", async () => {
  setEnv(GEMINI);
  mockFetch(() => geminiOk({ reply: "ok", corrections: [], vocabulary: [] }));
  await callHandler(chat, { messages: [{ role: "user", text: "hi" }] });
  assert.equal(calls[0].body.generationConfig.thinkingConfig, undefined);
});

await test("health probe reports reachability, and never leaks the key", async () => {
  setEnv(GEMINI);
  const { default: health } = await import("../api/health.js");
  async function get(url) { let out; await health({ method: "GET", url }, { status() { return this; }, json(d) { out = d; } }); return out; }
  globalThis.fetch = async (url, opts) => ({ ok: true, status: 200, json: async () => ({ models: [] }) });
  const ok = await get("/api/health?probe=1");
  assert.equal(ok.probe.reachable, true);
  assert.equal(ok.probe.keyAccepted, true);
  assert.ok(!JSON.stringify(ok).includes("KEY1"));
  globalThis.fetch = async () => { throw Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } }); };
  const down = await get("/api/health?probe=1");
  assert.equal(down.probe.reachable, false);
  assert.equal(down.probe.detail, "ENOTFOUND");
  const plain = await get("/api/health");
  assert.equal(plain.probe, undefined);
});

globalThis.fetch = realFetch;
console.log(`\n${passed} tests passed` + (process.exitCode ? " (kuch FAIL hue)" : ""));
