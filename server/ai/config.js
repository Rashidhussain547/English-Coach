// AI ki saari settings yahan se aati hain (environment variables se).
// Provider ya model badalna ho to sirf .env (ya Vercel env vars) badlen. Code nahi badlega.
//
//   AI_PROVIDER = kaunsa provider (gemini ya openai)
//   AI_MODEL    = us provider ka model ID (zaroori, koi default nahi)
//   <PROVIDER>_API_KEY = e.g. GEMINI_API_KEY

// Quota bachane ke liye limits (free tier ke andar rehne ke liye)
export const LIMITS = {
  maxMessages: 12, // sirf aakhri itne messages AI ko bhejte hain
  maxCharsPerMessage: 1000,
  maxOutputTokens: 2048, // JSON (reply + corrections) ke liye thori zyada jagah
  temperature: 0.7,
  timeoutMs: 25000,
};

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
}

export function readAiConfig(env = process.env) {
  const provider = (env.AI_PROVIDER || "").trim().toLowerCase();
  const model = (env.AI_MODEL || "").trim();

  if (!provider) {
    throw new ConfigError(".env mein AI_PROVIDER set nahi hai (jaise AI_PROVIDER=gemini).");
  }
  if (!model) {
    throw new ConfigError(".env mein AI_MODEL set nahi hai. Model ka ID AI Studio ya docs se copy karein.");
  }

  // GEMINI_API_KEY, OPENAI_API_KEY ... provider ke naam se key dhoondta hai
  const keyName = provider.toUpperCase() + "_API_KEY";
  const apiKey = (env[keyName] || "").trim();

  return { provider, model, apiKey, keyName };
}

// Optional settings (.env / Vercel): AI_TIMEOUT_SECONDS (5-120) aur AI_THINKING_LEVEL (jaise "low")
export function readTuning(env = process.env) {
  const seconds = Number(env.AI_TIMEOUT_SECONDS);
  const timeoutMs = Number.isFinite(seconds) && seconds >= 5 ? Math.min(seconds, 120) * 1000 : LIMITS.timeoutMs;
  const thinkingLevel = (env.AI_THINKING_LEVEL || "").trim().toLowerCase() || undefined;
  // AI_FALLBACK_MODELS=model-b,model-c : pehla model busy/timeout/quota ho to agle FREE models try hote hain
  const fallbackModels = (env.AI_FALLBACK_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean)
    .slice(0, 3);
  return { timeoutMs, thinkingLevel, fallbackModels };
}
