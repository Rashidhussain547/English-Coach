import { useState } from "react";
import BottomNav from "./components/BottomNav.jsx";
import OnboardingScreen from "./screens/OnboardingScreen.jsx";
import HomeScreen from "./screens/HomeScreen.jsx";
import ConversationScreen from "./screens/ConversationScreen.jsx";
import CorrectionsScreen from "./screens/CorrectionsScreen.jsx";
import ProgressScreen from "./screens/ProgressScreen.jsx";
import { APP_CONFIG } from "./config/appConfig.js";
import { getTopicForSession } from "./data/topics.js";
import {
  computeStats,
  dateKey,
  loadCorrections,
  loadProfile,
  loadSessions,
  loadVocabulary,
  saveCorrections,
  saveProfile,
  saveSessions,
  saveVocabulary,
} from "./lib/progress.js";

export default function App() {
  // "home" | "talk" | "corrections" | "progress"
  const [screen, setScreen] = useState("home");
  const [profile, setProfile] = useState(loadProfile); // null = naya user
  const [sessions, setSessions] = useState(loadSessions);
  const [corrections, setCorrections] = useState(loadCorrections);
  const [vocabulary, setVocabulary] = useState(loadVocabulary);

  // Naya user: pehle naam aur level
  if (!profile) {
    return (
      <div className="app">
        <main className="app-main">
          <OnboardingScreen
            onDone={(p) => {
              saveProfile(p);
              setProfile(p);
            }}
          />
        </main>
      </div>
    );
  }

  const stats = computeStats(sessions);
  const topic = getTopicForSession(sessions.length);
  // Pichle session ki report ne jo practice batayi thi, wo agle session mein use hoti hai
  const focus = sessions.length ? sessions[sessions.length - 1].nextFocus || [] : [];

  function changeLevel(level) {
    const updated = { ...profile, level };
    saveProfile(updated);
    setProfile(updated);
  }

  // Conversation se AI ki corrections aur vocabulary aati hain. Foran save (session beech mein band ho to bhi bachi rahein)
  function handleLearn({ corrections: newCorrections, vocabulary: newWords, topic: topicTitle }) {
    const date = dateKey();

    if (newCorrections.length) {
      const stamp = Date.now();
      const items = newCorrections.map((c, i) => ({
        ...c,
        id: stamp + i,
        date,
        topic: topicTitle,
      }));
      const next = [...corrections, ...items];
      saveCorrections(next);
      setCorrections(next.slice(-200));
    }

    if (newWords.length) {
      const known = new Set(vocabulary.map((v) => v.word.toLowerCase()));
      const fresh = newWords
        .filter((v) => !known.has(v.word.toLowerCase()))
        .map((v, i) => ({ ...v, id: Date.now() + i, date, topic: topicTitle }));
      if (fresh.length) {
        const next = [...vocabulary, ...fresh];
        saveVocabulary(next);
        setVocabulary(next.slice(-300));
      }
    }
  }

  function endSession(seconds, extra = {}) {
    if (seconds >= APP_CONFIG.minSessionSeconds) {
      const updated = [
        ...sessions,
        {
          id: Date.now(),
          date: dateKey(),
          seconds,
          topic: topic.title,
          level: profile.level,
          correctionCount: extra.correctionCount ?? 0,
          nextFocus: extra.nextFocus || [],
        },
      ];
      saveSessions(updated);
      setSessions(updated);
    }
    setScreen("home");
  }

  return (
    <div className="app">
      <main className="app-main">
        {screen === "home" && (
          <HomeScreen
            profile={profile}
            stats={stats}
            topic={topic}
            onLevelChange={changeLevel}
            onStart={() => setScreen("talk")}
          />
        )}
        {screen === "talk" && (
          <ConversationScreen
            topic={topic}
            level={profile.level}
            focus={focus}
            onLearn={handleLearn}
            onEnd={endSession}
          />
        )}
        {screen === "corrections" && (
          <CorrectionsScreen corrections={corrections} />
        )}
        {screen === "progress" && (
          <ProgressScreen
            stats={stats}
            sessions={sessions}
            corrections={corrections}
            vocabulary={vocabulary}
          />
        )}
      </main>

      {/* Conversation ke dauran nav chhupa dete hain taake screen focused rahe */}
      {screen !== "talk" && <BottomNav current={screen} onChange={setScreen} />}
    </div>
  );
}
