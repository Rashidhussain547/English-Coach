// Provider layer ka main darwaza. App ka baaki code sirf yahan se AI use karta hai.
// Naya provider jodne ke liye: providers/ mein nayi file banayen (gemini.js jaisi),
// aur neeche PROVIDERS mein ek line add karein.

import { gemini } from "./providers/gemini.js";
import { openai } from "./providers/openai.js";
import { LIMITS, ConfigError, readAiConfig, readTuning } from "./config.js";
import { AIError } from "./errors.js";

const PROVIDERS = {
  gemini,
  openai, // koi bhi OpenAI-compatible provider (AI_BASE_URL ke saath)
};

export function getActiveProvider(env = process.env) {
  const config = readAiConfig(env);
  const adapter = PROVIDERS[config.provider];
  if (!adapter) {
    throw new ConfigError(
      `AI_PROVIDER="${config.provider}" supported nahi. Available: ${Object.keys(PROVIDERS).join(", ")}`
    );
  }
  return { config, adapter };
}

// Frontend ko dikhane ke liye status (API key kabhi nahi bhejte, sirf ye ke set hai ya nahi)
export function getAiStatus(env = process.env) {
  try {
    const { config, adapter } = getActiveProvider(env);
    return {
      ok: Boolean(config.apiKey),
      provider: adapter.name,
      model: config.model,
      capabilities: adapter.capabilities,
      keyConfigured: Boolean(config.apiKey),
      keyName: config.keyName,
      error: config.apiKey ? null : `${config.keyName} set nahi hai.`,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// Chat: messages ko compact karke provider ko bhejta hai
// Messages ko provider ke liye saaf karta hai:
// - sirf aakhri messages (quota bachane ke liye) aur har message ki length limit
// - history user se shuru ho (AI ka pehla message hata do)
// - lagatar same role ke messages ek bana do
function prepareMessages(messages, maxChars = LIMITS.maxCharsPerMessage) {
  const recent = messages.slice(-LIMITS.maxMessages).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    text: String(m.text || "").slice(0, maxChars),
  }));

  while (recent.length && recent[0].role !== "user") recent.shift();

  const merged = [];
  for (const m of recent) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.text += "\n" + m.text;
    else merged.push({ ...m });
  }
  return merged;
}

export async function generateReply({ system, messages, json = false, maxChars }, env = process.env) {
  const { config, adapter } = getActiveProvider(env);
  if (!config.apiKey) {
    throw new ConfigError(`${config.keyName} set nahi hai.`);
  }

  const prepared = prepareMessages(messages, maxChars);
  if (!prepared.length || prepared[prepared.length - 1].role !== "user") {
    throw new AIError("provider", "Aakhri message user ka hona chahiye.");
  }

  const { timeoutMs, thinkingLevel, fallbackModels } = readTuning(env);
  // Ye errors aaen to agla (free) model try hota hai. Galat key, block, config wagaira par nahi.
  const RETRY_WITH_NEXT_MODEL = new Set(["busy", "timeout", "quota", "model"]);
  const models = [config.model, ...fallbackModels.filter((m) => m !== config.model)];
  const budgetMs = Math.max(timeoutMs, 45000); // sab models milakar itna hi intezar
  const t0 = Date.now();
  let lastError;

  for (let i = 0; i < models.length; i++) {
    const remaining = budgetMs - (Date.now() - t0);
    if (i > 0 && remaining < 8000) break; // waqt nahi bacha
    const model = models[i];
    const startedAt = Date.now();
    try {
      const result = await adapter.generate({
        apiKey: config.apiKey,
        model,
        system,
        messages: prepared,
        maxOutputTokens: LIMITS.maxOutputTokens,
        temperature: LIMITS.temperature,
        timeoutMs: Math.min(timeoutMs, Math.max(remaining, 5000)),
        json,
        thinkingLevel,
        baseUrl: (env.AI_BASE_URL || "").trim(),
      });
      // Vercel ke Runtime Logs mein timing dikhti hai (key kabhi log nahi hoti)
      console.log(`[ai] ${adapter.name}/${model} ok in ${Date.now() - startedAt}ms`);
      return { ...result, model };
    } catch (err) {
      lastError = err;
      console.log(`[ai] ${adapter.name}/${model} failed (${err.code || err.name}) after ${Date.now() - startedAt}ms: ${err.message}`);
      if (!RETRY_WITH_NEXT_MODEL.has(err.code)) throw err;
    }
  }
  throw lastError;
}

// Provider tak connectivity check (agar adapter ping support karta hai)
export async function probeProvider(env = process.env) {
  const { config, adapter } = getActiveProvider(env);
  if (!config.apiKey) throw new ConfigError(`${config.keyName} set nahi hai.`);
  if (typeof adapter.ping !== "function") return { supported: false };
  return { supported: true, ...(await adapter.ping({ apiKey: config.apiKey, timeoutMs: 10000 })) };
}
