// Gemini adapter. Sirf ye file Gemini ki API ka format jaanti hai.
// Baaki app sirf adapter ke "generate()" ko call karti hai.
//
// Adapter ka interface (har provider yahi do cheezen deta hai):
//   capabilities: { text, audioInput, audioOutput, realtime }
//   generate({ apiKey, model, system, messages, maxOutputTokens, temperature, timeoutMs })
//       messages = [{ role: "user" | "assistant", text }]
//       return   = { text }

import { AIError, httpStatusToCode } from "../errors.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export const gemini = {
  name: "gemini",

  // Abhi sirf text generation use ho rahi hai. Awaaz browser ki Web Speech API se aati hai.
  capabilities: {
    text: true,
    audioInput: false,
    audioOutput: false,
    realtime: false,
  },

  async generate({ apiKey, model, system, messages, maxOutputTokens, temperature, timeoutMs, json }) {
    const body = {
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
      generationConfig: { maxOutputTokens, temperature },
    };
    // json: true -> Gemini ko sirf JSON text dene ko kehta hai
    if (json) body.generationConfig.responseMimeType = "application/json";
    if (system) {
      body.system_instruction = { parts: [{ text: system }] };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      // Key header mein jati hai (URL mein nahi), taake kahin log na ho
      response = await fetch(`${BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        throw new AIError("timeout", "AI ne waqt par jawab nahi diya.");
      }
      throw new AIError("network", "AI service tak pahunch nahi sakay.");
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const providerMessage = data?.error?.message || "Unknown error";
      const code = httpStatusToCode(response.status);
      // Galat key aksar 400 "API key not valid" ke saath aati hai
      const looksLikeBadKey = response.status === 400 && /api key/i.test(providerMessage);
      throw new AIError(looksLikeBadKey ? "auth" : code, providerMessage, {
        status: response.status,
      });
    }

    if (data?.promptFeedback?.blockReason) {
      throw new AIError("blocked", "AI ne ye request block kar di: " + data.promptFeedback.blockReason);
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || "").join("").trim();

    if (!text) {
      throw new AIError("provider", "AI ne khali jawab diya. Dobara try karein.");
    }
    return { text };
  },
};
