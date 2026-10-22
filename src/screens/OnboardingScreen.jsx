import { useState } from "react";
import { APP_CONFIG } from "../config/appConfig.js";

// Pehli baar app khulne par naam aur level poochta hai.
export default function OnboardingScreen({ onDone }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState(APP_CONFIG.defaultLevel);

  function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onDone({ name: trimmed, level });
  }

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>{APP_CONFIG.appName}</h1>
        <p className="muted">Shuru karne se pehle apna naam aur level chunein.</p>
      </header>

      <form className="card form" onSubmit={submit}>
        <label>
          Aap ka naam
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam likhein"
            autoFocus
          />
        </label>

        <label>
          English level
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {APP_CONFIG.levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn btn-solid" disabled={!name.trim()}>
          Continue
        </button>
      </form>
    </div>
  );
}
