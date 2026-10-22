// POST /api/chat
// Body:  { messages: [{ role: "user" | "assistant", text }], level?, topic? }
//        messages khali ho to coach session shuru karta hai (pehla sawal).
// Reply: { ok: true, reply, corrections: [...], vocabulary: [...] }
//        ya { ok: false, code, detail }
import { generateReply } from "../server/ai/index.js";
import { parseCoachReply } from "../server/ai/parse.js";
import { buildCoachPrompt, START_MESSAGE } from "../server/prompts/coach.js";
import { sendError } from "../server/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "method", detail: "POST use karein." });
  }

  const body = req.body || {};
  if (!Array.isArray(body.messages)) {
    return res.status(400).json({ ok: false, code: "bad_request", detail: "messages array chahiye." });
  }

  // Sirf sahi shakal ke messages rakho
  let messages = body.messages
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: m.text }));

  // Koi message nahi = session ki shuruaat
  if (messages.length === 0) {
    messages = [{ role: "user", text: START_MESSAGE }];
  }

  try {
    const system = buildCoachPrompt({ level: body.level, topic: body.topic, focus: body.focus });
    const { text } = await generateReply({ system, messages, json: true });
    const parsed = parseCoachReply(text);
    return res.status(200).json({ ok: true, ...parsed });
  } catch (err) {
    return sendError(res, err);
  }
}
