// "OpenAI-compatible" adapter. Bohat se free/doosre providers (Groq, OpenRouter, local Ollama wagaira)
// isi API format ko support karte hain. Is adapter se provider badalne ke liye code nahi, sirf .env badalta hai:
//
//   AI_PROVIDER=openai
//   AI_MODEL=<us provider ka model ID>
//   AI_BASE_URL=<us provider ka base URL, jaise https://.../v1>
//   OPENAI_API_KEY=<us provider ki key>
//
// Free quota aur model ke naam us provider ki official docs se verify karein.

import { AIError, httpStatusToCode } from "../errors.js";
import { ConfigError } from "../config.js";

export const openai = {
  name: "openai",

  capabilities: {
    text: true,
    audioInput: false,
    audioOutput: false,
    realtime: false,
  },

  async generate({ apiKey, model, system, messages, maxOutputTokens, temperature, timeoutMs, json, baseUrl }) {
    if (!baseUrl) {
      throw new ConfigError(".env mein AI_BASE_URL set nahi hai (is provider ka base URL, jaise https://.../v1).");
    }

    const body = {
      model,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        ...messages.map((m) => ({ role: m.role, content: m.text })),
      ],
      max_tokens: maxOutputTokens,
      temperature,
    };
    if (json) body.response_format = { type: "json_object" };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(baseUrl.replace(/\/+$/, "") + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === "AbortError") throw new AIError("timeout", "AI ne waqt par jawab nahi diya.");
      throw new AIError("network", "AI service tak pahunch nahi sakay.");
    } finally {
      clearTimeout(timer);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || "Unknown error";
      throw new AIError(httpStatusToCode(response.status), message, { status: response.status });
    }

    const text = String(data?.choices?.[0]?.message?.content || "").trim();
    if (!text) throw new AIError("provider", "AI ne khali jawab diya. Dobara try karein.");
    return { text };
  },
};
