// API handlers ke liye chhote helpers (Vercel aur local dev dono mein same chalte hain).

import { ConfigError } from "./ai/config.js";
import { AIError } from "./ai/errors.js";

export function sendError(res, err) {
  if (err instanceof ConfigError) {
    return res.status(500).json({ ok: false, code: "config", detail: err.message });
  }
  if (err instanceof AIError) {
    const status = err.code === "quota" ? 429 : err.code === "timeout" ? 504 : err.code === "busy" ? 503 : 502;
    return res.status(status).json({
      ok: false,
      code: err.code,
      detail: err.message,
      retryAfterSeconds: err.retryAfterSeconds,
    });
  }
  console.error("Unexpected error:", err?.message);
  return res.status(500).json({ ok: false, code: "provider", detail: "Server mein masla aaya." });
}
