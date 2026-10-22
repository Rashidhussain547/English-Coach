import { useState } from "react";
import CorrectionCard from "../components/CorrectionCard.jsx";
import { speak, speechSupport } from "../lib/speech.js";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition.js";
import { APP_CONFIG } from "../config/appConfig.js";

// Upar: AI ki di hui corrections (naye pehle), har ek par Listen aur Repeat.
// Neeche: "Practice any sentence" - aap ka apna jumla likh kar Listen/Repeat practice.

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function CorrectionsScreen({ corrections }) {
  const [sentence, setSentence] = useState("");
  const [heard, setHeard] = useState("");

  const { listening, interim, error, supported, start, stop } =
    useSpeechRecognition({ onFinal: setHeard, lang: APP_CONFIG.speechLang });

  const target = sentence.trim();
  const matched = heard && target && normalize(heard) === normalize(target);
  const newestFirst = [...corrections].reverse();

  function handleRepeat() {
    if (listening) {
      stop();
    } else {
      setHeard("");
      start();
    }
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Corrections</h1>
        {corrections.length > 0 && (
          <p className="muted">{corrections.length} saved</p>
        )}
      </header>

      {newestFirst.length === 0 ? (
        <section className="card">
          <h3>Abhi koi correction nahi</h3>
          <p className="muted">
            Coach ke saath baat karein. Jahan aap ki English mein ghalti hogi,
            wo chupke se yahan save hoti jayegi.
          </p>
        </section>
      ) : (
        newestFirst.map((c) => (
          <div key={c.id}>
            {c.date && (
              <p className="muted small date-label">
                {c.date}
                {c.topic ? " · " + c.topic : ""}
              </p>
            )}
            <CorrectionCard item={c} />
          </div>
        ))
      )}

      <section className="card correction-card">
        <h3>Practice any sentence</h3>
        <p className="muted small">
          Koi bhi English jumla likhein, suniye, phir khud bol kar dekhein ke
          browser ne kya suna.
        </p>

        <textarea
          className="sentence-input"
          rows={2}
          value={sentence}
          onChange={(e) => {
            setSentence(e.target.value);
            setHeard("");
          }}
          placeholder="Yahan English jumla likhein..."
        />

        <div className="row-gap">
          <button
            type="button"
            className="btn btn-small"
            disabled={!speechSupport.synthesis || !target}
            onClick={() => speak(target)}
          >
            🔊 Listen
          </button>
          <button
            type="button"
            className="btn btn-small"
            disabled={!supported || !target}
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

        {!supported && (
          <p className="muted small">
            Is browser mein Repeat (mic) kaam nahi karta. Chrome/Edge/Safari try karein.
          </p>
        )}
      </section>
    </div>
  );
}
