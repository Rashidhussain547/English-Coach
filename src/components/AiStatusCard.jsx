import { useEffect, useState } from "react";
import { describeApiError, getAiStatus, sendChat } from "../lib/api.js";

// Phase 3 ka connection-test card. Ye dikhata hai ke backend aur AI sahi connect hain ya nahi.
// Phase 4 mein asli conversation yahi API use karegi.
export default function AiStatusCard({ level, topic }) {
  const [status, setStatus] = useState(null); // null = check ho raha hai
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getAiStatus().then(setStatus);
  }, []);

  async function test(e) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setReply("");
    const result = await sendChat({
      messages: [{ role: "user", text: message }],
      level,
      topic,
    });
    setBusy(false);
    if (result.ok) setReply(result.text);
    else setError(describeApiError(result.code, result.detail));
  }

  let statusLine = "Check ho raha hai...";
  if (status) {
    if (status.code === "offline") statusLine = describeApiError("offline");
    else if (status.ok) statusLine = `Connected: ${status.provider} · ${status.model}`;
    else statusLine = "Setup adhoora: " + (status.error || "unknown");
  }

  const ready = status?.ok;

  return (
    <section className="card">
      <h3>AI connection test</h3>
      <p className={ready ? "status status-speaking" : "muted small"}>{statusLine}</p>

      {ready && (
        <form className="text-fallback" onSubmit={test}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="AI se kuch English mein poochein..."
            aria-label="Test message"
          />
          <button type="submit" className="btn btn-small" disabled={busy}>
            {busy ? "..." : "Send"}
          </button>
        </form>
      )}

      {reply && (
        <div className="correction-block right">
          <span className="label">AI reply</span>
          <p>{reply}</p>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
