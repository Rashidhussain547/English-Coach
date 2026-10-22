import { useCallback, useEffect, useRef, useState } from "react";
import { describeApiError, sendSummary } from "../lib/api.js";
import { speak, speechSupport } from "../lib/speech.js";

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + " min " + s + " sec";
}

function BulletList({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="correction-block">
      <span className="label">{title}</span>
      <ul className="bullets">
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

// Session ke end par report. Duration, corrections aur vocabulary aap ke data se aate hain;
// fluency suggestions aur agli practice AI se (text ki buniyad par).
export default function SessionSummary({ seconds, topic, level, messages, corrections, vocabulary, onDone }) {
  const [ai, setAi] = useState({ status: "loading", data: null, error: "" });
  const startedRef = useRef(false);

  const load = useCallback(async () => {
    setAi({ status: "loading", data: null, error: "" });
    const result = await sendSummary({
      transcript: messages.map(({ role, text }) => ({ role: role === "assistant" ? "assistant" : "user", text })),
      corrections,
      seconds,
      level,
      topic: topic.title,
    });
    if (result.ok) setAi({ status: "ok", data: result, error: "" });
    else setAi({ status: "error", data: null, error: describeApiError(result.code, result.detail) });
  }, [messages, corrections, seconds, level, topic]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    load();
  }, [load]);

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Session report</h1>
        <p className="muted">
          {topic.title} · {formatTime(seconds)}
        </p>
      </header>

      <section className="card">
        <h3>Corrections ({corrections.length})</h3>
        {corrections.length === 0 ? (
          <p className="muted">Is session mein koi badi ghalti note nahi hui.</p>
        ) : (
          <ul className="history">
            {corrections.map((c, i) => (
              <li key={i}>
                <span>
                  <s>{c.original}</s> → <strong>{c.corrected}</strong>
                </span>
                {speechSupport.synthesis && (
                  <button type="button" className="link-btn" onClick={() => speak(c.corrected)}>
                    🔊
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {vocabulary.length > 0 && (
        <section className="card">
          <h3>New vocabulary</h3>
          <ul className="history">
            {vocabulary.map((v, i) => (
              <li key={i}>
                <strong>{v.word}</strong>
                <span className="muted">{v.meaning}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Coach ki raay</h3>
        {ai.status === "loading" && <p className="muted">Report ban rahi hai...</p>}
        {ai.status === "error" && (
          <>
            <p className="error-text">{ai.error}</p>
            <button type="button" className="btn btn-small" onClick={load}>
              🔄 Dobara try karein
            </button>
          </>
        )}
        {ai.status === "ok" && (
          <>
            {ai.data.overall && <p>{ai.data.overall}</p>}
            <BulletList title="Achha kya raha" items={ai.data.wentWell} />
            <BulletList title="Fluency aur confidence ke liye" items={ai.data.fluencyTips} />
            <BulletList title="Agle session mein practice" items={ai.data.nextFocus} />
          </>
        )}
      </section>

      <section className="card">
        <h3>Pronunciation</h3>
        <p className="muted small">
          Browser sirf aap ke alfaaz text mein deta hai, awaaz ki quality nahi
          sunta. Isliye reliable pronunciation score nahi diya ja sakta. Corrections
          tab mein Listen aur Repeat se practice karein.
        </p>
      </section>

      <button
        type="button"
        className="btn btn-solid"
        onClick={() => onDone({ correctionCount: corrections.length, nextFocus: ai.data?.nextFocus || [] })}
      >
        Done
      </button>
    </div>
  );
}
