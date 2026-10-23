// GET /api/health        -> AI config sahi hai ya nahi (key kabhi wapas nahi bhejta)
// GET /api/health?probe=1 -> ek chhota check bhi karta hai ke server Google tak pahunch sakta hai aur key chalti hai
import { getAiStatus, probeProvider } from "../server/ai/index.js";
import { sendError } from "../server/http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, code: "method", detail: "GET use karein." });
  }

  const status = getAiStatus();
  const wantsProbe = new URL(req.url, "http://localhost").searchParams.get("probe");
  if (!wantsProbe || !status.ok) return res.status(200).json(status);

  try {
    const probe = await probeProvider();
    return res.status(200).json({ ...status, probe });
  } catch (err) {
    return sendError(res, err);
  }
}
