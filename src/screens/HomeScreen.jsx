import StatCard from "../components/StatCard.jsx";
import { APP_CONFIG } from "../config/appConfig.js";

export default function HomeScreen({ profile, stats, topic, onLevelChange, onStart }) {
  const goal = APP_CONFIG.dailyGoalMinutes;
  const progressPct = Math.min(100, Math.round((stats.minutesToday / goal) * 100));
  const last = stats.lastSession;

  return (
    <div className="screen">
      <header className="screen-header">
        <p className="muted">Welcome back 👋</p>
        <h1>Hi, {profile.name}!</h1>
      </header>

      <section className="card topic-card">
        <span className="badge">Day {topic.day} · Today's topic</span>
        <h2>{topic.title}</h2>
        <p>{topic.hint}</p>
        <button type="button" className="btn btn-primary" onClick={onStart}>
          🎤 Start Speaking
        </button>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" aria-hidden="true">
            🎯
          </div>
          <select
            className="level-select"
            value={profile.level}
            onChange={(e) => onLevelChange(e.target.value)}
            aria-label="English level"
          >
            {APP_CONFIG.levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <div className="stat-label">English level</div>
        </div>
        <StatCard icon="🔥" label="Day streak" value={stats.streak} />
      </section>

      <section className="card">
        <div className="row-between">
          <h3>Today's practice</h3>
          <span className="muted">
            {stats.minutesToday} / {goal} min
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="progress-fill" style={{ width: progressPct + "%" }} />
        </div>
      </section>

      <section className="card">
        <h3>Recent practice</h3>
        {last ? (
          <p className="muted">
            Last session: {last.topic} · {Math.max(1, Math.round(last.seconds / 60))} min ({last.date}).
            Total: {stats.totalSessions} sessions, {stats.totalMinutes} min.
          </p>
        ) : (
          <p className="muted">
            Abhi koi session nahi hua. Pehla session complete karte hi yahan
            aap ki practice dikhegi.
          </p>
        )}
      </section>

    </div>
  );
}
