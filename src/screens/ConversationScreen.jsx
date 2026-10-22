import { useCallback, useEffect, useRef, useState } from "react";
import { speak, stopSpeaking, speechSupport } from "../lib/speech.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { describeApiError, sendChat } from "../lib/api.js";
import { APP_CONFIG } from "../config/appConfig.js";
import SessionSummary from "../components/SessionSummary.jsx";

// Aap bolte hain (ya type karte hain) -> backend AI ko bhejta hai -> coach ka jawab aata hai aur awaaz mein sunata hai.
// Ghaltiyan beech mein nahi roki jatin: chupke se save hoti hain. End Session par poori report dikhti hai.

function formatTime(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return m + ":" + s;
}

export default function ConversationScreen({ topic, level, focus, onLearn, onEnd }) {
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [apiError, setApiError] = useState("");
  const [learned, setLearned] = useState({ corrections: [], vocabulary: [] });
  const [speaking, setSpeaking] = useState(false);
  const [draft, setDraft] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [endedAt, setEndedAt] = useState(null); // session khatam hone par seconds, warna null

  const transcriptRef = useRef(null);
  const historyRef = useRef([]); // poori baat-cheet (state se alag, taake async mein purani value na aaye)
  const idRef = useRef(0);
  const startedRef = useRef(false);
  const aliveRef = useRef(true);
  const latest = useRef({ topic, level, focus, onLearn });
  latest.current = { topic, level, focus, onLearn };

  const sayAloud = useCallback((text) => {
    speak(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, []);

  const addMessage = useCallback((role, text) => {
    idRef.current += 1;
    historyRef.current = [...historyRef.current, { id: idRef.current, role, text }];
    setMessages(historyRef.current);
  }, []);

  // Coach se jawab maangta hai (history khali ho to session shuru karta hai)
  const askCoach = useCallback(async () => {
    setPending(true);
    setApiError("");

    const result = await sendChat({
      messages: historyRef.current.map(({ role, text }) => ({ role, text })),
      level: latest.current.level,
      topic: latest.current.topic.title,
      focus: latest.current.focus,
    });

    if (!aliveRef.current) return; // screen band ya session khatam
    setPending(false);

    if (!result.ok) {
      setApiError(describeApiError(result.code, result.detail));
      return;
    }

    addMessage("assistant", result.reply);
    sayAloud(result.reply);

    const newCorrections = result.corrections || [];
    const newWords = result.vocabulary || [];
    if (newCorrections.length || newWords.length) {
      latest.current.onLearn({
        corrections: newCorrections,
        vocabulary: newWords,
        topic: latest.current.topic.title,
      });
      setLearned((prev) => ({
        corrections: [...prev.corrections, ...newCorrections],
        vocabulary: [...prev.vocabulary, ...newWords],
      }));
    }
  }, [addMessage, sayAloud]);

  const handleUserText = useCallback(
    (text) => {
      addMessage("user", text);
      askCoach();
    },
    [addMessage, askCoach]
  );

  const { listening, interim, error, supported, start, stop } =
    useSpeechRecognition({ onFinal: handleUserText, lang: APP_CONFIG.speechLang });

  // Screen khulte hi coach pehla sawal poochta hai (sirf ek baar, quota bachane ke liye)
  useEffect(() => {
    aliveRef.current = true;
    if (!startedRef.current) {
      startedRef.current = true;
      askCoach();
    }
    return () => {
      aliveRef.current = false;
      stopSpeaking();
    };
  }, [askCoach]);

  // Session timer (report dikhne ke baad ruk jata hai)
  useEffect(() => {
    if (endedAt !== null) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [endedAt]);

  // Naya message aaye to neeche scroll
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, interim, pending]);

  function toggleMic() {
    if (listening) {
      stop();
    } else {
      stopSpeaking();
      setSpeaking(false);
      start();
    }
  }

  function sendText(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    handleUserText(text);
  }

  function endSession() {
    stopSpeaking();
    if (listening) stop();
    aliveRef.current = false; // aane wala koi jawab ignore ho

    const spokeSomething = historyRef.current.some((m) => m.role === "user");
    if (!spokeSomething) {
      onEnd(seconds, { correctionCount: 0, nextFocus: [] }); // kuch bola hi nahi, report ki zaroorat nahi
      return;
    }
    setEndedAt(seconds);
  }

  if (endedAt !== null) {
    return (
      <SessionSummary
        seconds={endedAt}
        topic={topic}
        level={level}
        messages={messages}
        corrections={learned.corrections}
        vocabulary={learned.vocabulary}
        onDone={(extra) => onEnd(endedAt, extra)}
      />
    );
  }

  let status = "idle";
  if (listening) status = "listening";
  else if (pending) status = "thinking";
  else if (speaking) status = "speaking";

  const statusText = {
    idle: supported
      ? "Tap the mic and speak"
      : "Mic is browser mein available nahi, type karein",
    listening: "Listening... bol kar dobara mic dabayen",
    thinking: "Coach soch raha hai...",
    speaking: "Coach is speaking...",
  }[status];

  return (
    <div className="screen conversation">
      <header className="conv-header">
        <div>
          <p className="muted">Day {topic.day}</p>
          <h2>{topic.title}</h2>
        </div>
        <div className="timer" aria-label="Session timer">
          {formatTime(seconds)}
        </div>
      </header>

      {!supported && (
        <div className="notice">
          Is browser mein speech recognition nahi hai. Chrome ya Edge (computer),
          Chrome (Android) ya Safari (iPhone) use karein, ya neeche type karke
          jawab dein.
        </div>
      )}

      <div className="transcript" aria-live="polite" ref={transcriptRef}>
        {messages.map((m) => (
          <div key={m.id} className={"bubble " + (m.role === "assistant" ? "ai" : "user")}>
            {m.text}
            {m.role === "assistant" && speechSupport.synthesis && (
              <button
                type="button"
                className="link-btn"
                onClick={() => sayAloud(m.text)}
              >
                🔁 Repeat
              </button>
            )}
          </div>
        ))}
        {interim && <div className="bubble user interim">{interim}</div>}
        {pending && <div className="bubble ai interim">...</div>}
      </div>

      <div className="conv-controls">
        {learned.corrections.length > 0 && (
          <p className="chip">
            ✏️ {learned.corrections.length} correction note ho gayi. Session ke
            end par report mein dekhein.
          </p>
        )}

        {apiError && (
          <div className="notice error-box">
            <p>{apiError}</p>
            <button type="button" className="btn btn-small" onClick={askCoach}>
              🔄 Dobara try karein
            </button>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        <p className={"status status-" + status}>{statusText}</p>

        <button
          type="button"
          className={"mic-btn" + (listening ? " listening" : "")}
          onClick={toggleMic}
          disabled={!supported || pending}
          aria-label={listening ? "Stop listening" : "Start listening"}
        >
          🎤
        </button>

        <form className="text-fallback" onSubmit={sendText}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ya yahan type karein..."
            aria-label="Type your answer"
            disabled={pending}
          />
          <button type="submit" className="btn btn-small" disabled={pending}>
            Send
          </button>
        </form>

        <button type="button" className="btn btn-danger" onClick={endSession}>
          End Session
        </button>
      </div>
    </div>
  );
}
