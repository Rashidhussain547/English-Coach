// POST /api/summary
// Body:  { transcript: [{ role, text }], corrections: [{ original, corrected }], seconds, level?, topic? }
// Reply: { ok: true, overall, wentWell: [], fluencyTips: [], nextFocus: [] } ya { ok: false, code, detail }
// Quota bachane ke liye sirf learner ki lines (aakhri 40) aur corrections bheji jati hain.
import { generateReply } from "../server/ai/index.js";
import { parseSummary } from "../server/ai/parse.js";
import { buildSummaryPrompt } from "../server/prompts/coach.js";
import { sendError } from "../server/http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, code: "method", detail: "POST use karein." });
  }

  const body = req.body || {};
  const lines = (Array.isArray(body.transcript) ? body.transcript : [])
    .filter((m) => m && m.role === "user" && typeof m.text === "string" && m.text.trim())
    .map((m) => m.text.trim().slice(0, 300))
    .slice(-40);

  if (lines.length === 0) {
    return res.status(400).json({ ok: false, code: "bad_request", detail: "Summary ke liye kam az kam ek jawab chahiye." });
  }

  const fixes = (Array.isArray(body.corrections) ? body.corrections : [])
    .filter((c) => c && c.original && c.corrected)
    .slice(0, 20)
    .map((c) => `- "${String(c.original).slice(0, 200)}" -> "${String(c.corrected).slice(0, 200)}"`);

  const seconds = Math.max(0, Number(body.seconds) || 0);
  const text = [
    `Session length: ${Math.round(seconds / 60)} minutes.`,
    "Learner's lines (speech-recognition text):",
    ...lines.map((l, i) => `${i + 1}. ${l}`),
    "Corrections already found:",
    ...(fixes.length ? fixes : ["(none)"]),
  ].join("\n");

  try {
    const system = buildSummaryPrompt({ level: body.level, topic: body.topic });
    const result = await generateReply(
      { system, messages: [{ role: "user", text }], json: true, maxChars: 8000 }
    );
    return res.status(200).json({ ok: true, ...parseSummary(result.text) });
  } catch (err) {
    return sendError(res, err);
  }
}
