import StatCard from "../components/StatCard.jsx";
import { APP_CONFIG } from "../config/appConfig.js";
import { lastDays } from "../lib/progress.js";

export default function ProgressScreen({ stats, sessions, corrections = [], vocabulary = [] }) {
  const recent = [...sessions].reverse().slice(0, 20); // naye pehle
  const recentMistakes = [...corrections].reverse().slice(0, 5);
  const words = [...vocabulary].reverse().slice(0, 30);
  const days = lastDays(sessions, 7);
  const scale = Math.max(APP_CONFIG.dailyGoalMinutes, ...days.map((d) => d.minutes));

  return (
    <div className="screen">
      <header className="screen-header">
        <h1>Progress</h1>
      </header>

      <section className="stats-grid">
        <StatCard icon="🔥" label="Day streak" value={stats.streak} />
        <StatCard icon="⏱️" label="Minutes today" value={stats.minutesToday} />
        <StatCard icon="🗣️" label="Total sessions" value={stats.totalSessions} />
        <StatCard icon="✏️" label="Corrections noted" value={corrections.length} />
      </section>

      <section className="card">
        <h3>Last 7 days (minutes)</h3>
        <div className="bars" role="img" aria-label="Minutes practised in the last 7 days">
          {days.map((d) => (
            <div key={d.date} className="bar-col">
              <span className="bar-num">{d.minutes}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ height: Math.round((d.minutes / scale) * 100) + "%" }} />
              </div>
              <span className="bar-label">{d.label}</span>
            </div>
          ))}
        </div>
        <p className="muted small">Roz ka target {APP_CONFIG.dailyGoalMinutes} minute.</p>
      </section>

      <section className="card">
        <h3>Practice history</h3>
        {recent.length === 0 ? (
          <p className="muted">Abhi koi session record nahi hai.</p>
        ) : (
          <ul className="history">
            {recent.map((s) => (
              <li key={s.id}>
                <span>
                  {s.date} · {s.topic}
                </span>
                <span className="muted">
                  {Math.max(1, Math.round(s.seconds / 60))} min
                  {typeof s.correctionCount === "number" ? " · " + s.correctionCount + " corrections" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Recent mistakes</h3>
        {recentMistakes.length === 0 ? (
          <p className="muted">Abhi koi ghalti record nahi hui.</p>
        ) : (
          <ul className="history">
            {recentMistakes.map((c) => (
              <li key={c.id}>
                <span>
                  <s>{c.original}</s> → <strong>{c.corrected}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h3>Vocabulary learned</h3>
        {words.length === 0 ? (
          <p className="muted">Coach ke saath baat karte hue naye words yahan save honge.</p>
        ) : (
          <ul className="history">
            {words.map((v) => (
              <li key={v.id}>
                <strong>{v.word}</strong>
                <span className="muted">{v.meaning}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="muted small note">
        Note: Progress sirf isi device aur browser mein save hoti hai. Doosre
        device par sync nahi hogi, aur browser data clear karne par history
        delete ho sakti hai.
      </p>
    </div>
  );
}
