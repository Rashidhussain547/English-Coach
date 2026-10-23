// Frontend ka backend se rabta. Yahan AI provider ka koi zikr nahi, sirf /api/* ke calls.

// Error code -> simple Roman Urdu message
export function describeApiError(code, detail) {
  switch (code) {
    case "quota":
      return "Free AI quota abhi khatam ho gayi hai. Thori der baad ya kal (quota reset hone par) dobara try karein.";
    case "busy":
      return "Is AI model par abhi bohat load hai (free models par aksar hota hai). Thori der baad dobara try karein, ya .env/Vercel mein AI_MODEL doosra free model kar dein.";
    case "auth":
      return (
        "API key sahi nahi ya kaam nahi kar rahi. .env (ya Vercel) mein GEMINI_API_KEY check karein." +
        (detail ? " Google ka jawab: " + detail : "")
      );
    case "model":
      return "Ye AI model nahi mila. AI_MODEL ka naam check karein (AI Studio se copy karein).";
    case "config":
      return "Backend ki setting adhoori hai: " + (detail || ".env check karein.");
    case "blocked":
      return "AI ne ye message block kar diya. Doosre alfaaz mein try karein.";
    case "timeout":
      return "AI ne bohat der laga di. Dobara try karein.";
    case "network":
      return "AI service tak pahunch nahi sakay. Internet check karein.";
    case "offline":
      return "Backend se rabta nahi hua. Check karein ke app chal rahi hai aur internet on hai.";
    default:
      return "AI se jawab nahi aaya." + (detail ? " (" + detail + ")" : "");
  }
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    return { ok: false, code: "offline" };
  }
  try {
    return await response.json();
  } catch {
    return { ok: false, code: "provider", detail: "Server ka jawab samajh nahi aaya." };
  }
}

export function getAiStatus() {
  return request("/api/health");
}

// messages: [{ role: "user" | "assistant", text }]  (khali = session shuru)
// Wapas: { ok: true, reply, corrections, vocabulary } ya { ok: false, code, detail }
export function sendChat({ messages, level, topic, focus }) {
  return request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, level, topic, focus }),
  });
}

// Session ke end ki report: { ok: true, overall, wentWell, fluencyTips, nextFocus }
export function sendSummary({ transcript, corrections, seconds, level, topic }) {
  return request("/api/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, corrections, seconds, level, topic }),
  });
}
