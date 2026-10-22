// AI ke jawab (JSON text) ko safe, saaf data mein badalta hai.
// AI kabhi galat format de to yahan pakda jata hai, app crash nahi hoti.

import { AIError } from "./errors.js";

function norm(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const str = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function extractJson(text) {
  let t = String(text || "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function parseCoachReply(text) {
  const data = extractJson(text);
  const reply = str(data?.reply, 1200);
  if (!reply) {
    throw new AIError("provider", "AI ka jawab sahi format mein nahi aaya. Dobara try karein.");
  }

  const corrections = (Array.isArray(data.corrections) ? data.corrections : [])
    .map((c) => ({
      original: str(c?.original, 300),
      corrected: str(c?.corrected, 300),
      explanation: str(c?.explanation, 500),
      better: str(c?.better, 300),
    }))
    // khali ya bina farq wali corrections (sirf punctuation/capital ka farq) hata do
    .filter((c) => c.original && c.corrected && norm(c.original) !== norm(c.corrected))
    .slice(0, 2);

  const vocabulary = (Array.isArray(data.vocabulary) ? data.vocabulary : [])
    .map((v) => ({ word: str(v?.word, 80), meaning: str(v?.meaning, 200) }))
    .filter((v) => v.word && v.meaning)
    .slice(0, 2);

  return { reply, corrections, vocabulary };
}

const list = (value, count, max) =>
  (Array.isArray(value) ? value : []).map((x) => str(x, max)).filter(Boolean).slice(0, count);

export function parseSummary(text) {
  const data = extractJson(text);
  const result = {
    overall: str(data?.overall, 600),
    wentWell: list(data?.wentWell, 3, 250),
    fluencyTips: list(data?.fluencyTips, 3, 250),
    nextFocus: list(data?.nextFocus, 3, 120),
  };
  if (!result.overall && !result.wentWell.length && !result.fluencyTips.length && !result.nextFocus.length) {
    throw new AIError("provider", "Report sahi format mein nahi aayi. Dobara try karein.");
  }
  return result;
}
