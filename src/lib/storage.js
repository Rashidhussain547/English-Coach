// LocalStorage ke safe helpers. Phase 6 mein poora progress yahan se save/load hoga.
// LocalStorage kabhi block ya full ho sakta hai, isliye har call try/catch mein hai.

const PREFIX = "englishCoach:";

export function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveData(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
