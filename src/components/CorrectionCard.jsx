import { useState } from "react";
import { speak, speechSupport } from "../lib/speech.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { APP_CONFIG } from "../config/appConfig.js";

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Ek correction: original, corrected, Roman Urdu explanation, better version, Listen aur Repeat.
export default function CorrectionCard({ item }) {
  const [heard, setHeard] = useState("");
  const { listening, interim, error, supported, start, stop } =
    useSpeechRecognition({ onFinal: setHeard, lang: APP_CONFIG.speechLang });

  const matched = heard && normalize(heard) === normalize(item.corrected);

  function handleRepeat() {
    if (listening) stop();
    else {
      setHeard("");
      start();
    }
  }

  return (
    <section className="card correction-card">
      <div className="correction-block wrong">
        <span className="label">You said</span>
        <p>{item.original}</p>
      </div>
      <div className="correction-block right">
        <span className="label">Correct</span>
        <p>{item.corrected}</p>
      </div>
      {item.explanation && (
        <div className="correction-block">
          <span className="label">Why? (Roman Urdu)</span>
          <p>{item.explanation}</p>
        </div>
      )}
      {item.better && (
        <div className="correction-block">
          <span className="label">Better way to say it</span>
          <p>{item.better}</p>
        </div>
      )}

      <div className="row-gap">
        <button
          type="button"
          className="btn btn-small"
          disabled={!speechSupport.synthesis}
          onClick={() => speak(item.corrected)}
        >
          🔊 Listen
        </button>
        <button
          type="button"
          className="btn btn-small"
          disabled={!supported}
          onClick={handleRepeat}
        >
          {listening ? "⏹ Stop" : "🎤 Repeat"}
        </button>
      </div>

      {listening && <p className="status status-listening">Listening... {interim}</p>}
      {error && <p className="error-text">{error}</p>}
      {heard && (
        <div className={"correction-block " + (matched ? "right" : "")}>
          <span className="label">Browser ne ye suna</span>
          <p>{heard}</p>
          <p className="muted small">
            {matched
              ? "Alfaaz bilkul match hue."
              : "Alfaaz thode alag suney gaye. Listen dabayen aur dobara bolen. (Ye pronunciation ka score nahi, sirf ye dikhata hai ke browser ne kya suna.)"}
          </p>
        </div>
      )}
    </section>
  );
}
