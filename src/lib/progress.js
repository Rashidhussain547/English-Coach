// Profile, sessions aur stats (streak, minutes). Sab data LocalStorage se aata hai.
// Kuch bhi hardcoded nahi: naya user ho to sab zero/khali hota hai.

import { loadData, saveData } from "./storage.js";
import { APP_CONFIG } from "../config/appConfig.js";

// "2026-10-21" jaisi local date (aap ke timezone ke hisaab se)
export function dateKey(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

export function loadProfile() {
  return loadData("profile", null); // null = abhi naam/level set nahi hua
}

export function saveProfile(profile) {
  saveData("profile", profile);
}

export function loadSessions() {
  return loadData("sessions", []);
}

export function saveSessions(sessions) {
  saveData("sessions", sessions);
}

const MAX_CORRECTIONS = 200; // LocalStorage bharne se bachane ke liye
const MAX_VOCABULARY = 300;

export function loadCorrections() {
  return loadData("corrections", []);
}

export function saveCorrections(list) {
  saveData("corrections", list.slice(-MAX_CORRECTIONS));
}

export function loadVocabulary() {
  return loadData("vocabulary", []);
}

export function saveVocabulary(list) {
  saveData("vocabulary", list.slice(-MAX_VOCABULARY));
}

// Sessions se stats nikalta hai
export function computeStats(sessions) {
  const today = dateKey();

  const secondsByDay = {};
  for (const s of sessions) {
    secondsByDay[s.date] = (secondsByDay[s.date] || 0) + s.seconds;
  }

  const minutesToday = Math.floor((secondsByDay[today] || 0) / 60);

  // Streak: aaj (ya kal) se peeche, lagatar kitne din practice hui
  const counts = (key) => (secondsByDay[key] || 0) >= APP_CONFIG.streakMinSeconds;
  const cursor = new Date();
  if (!counts(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1); // aaj abhi baaki ho sakta hai
  let streak = 0;
  while (counts(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const totalMinutes = Math.floor(
    sessions.reduce((sum, s) => sum + s.seconds, 0) / 60
  );

  return {
    minutesToday,
    streak,
    totalSessions: sessions.length,
    totalMinutes,
    lastSession: sessions.length ? sessions[sessions.length - 1] : null,
  };
}

// Pichle n din ke minutes (aaj sab se aakhir mein)
export function lastDays(sessions, n = 7) {
  const days = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const key = dateKey(cursor);
    const seconds = sessions.filter((s) => s.date === key).reduce((sum, s) => sum + s.seconds, 0);
    days.push({
      date: key,
      label: cursor.toLocaleDateString("en-US", { weekday: "short" }),
      minutes: Math.round(seconds / 60),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
