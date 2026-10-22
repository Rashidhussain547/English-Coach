// GET /api/health -> AI config sahi hai ya nahi (key kabhi wapas nahi bhejta)
import { getAiStatus } from "../server/ai/index.js";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, code: "method", detail: "GET use karein." });
  }
  return res.status(200).json(getAiStatus());
}
