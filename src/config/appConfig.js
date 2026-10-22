// App-wide settings. Numbers aur options yahan ek jagah hain, code mein kahin hardcoded nahi.
// Note: AI provider/model yahan NAHI hai - wo backend ke .env mein hota hai (Phase 3).

export const APP_CONFIG = {
  appName: "English Coach",
  levels: ["Beginner", "Intermediate", "Advanced"],
  defaultLevel: "Beginner",
  dailyGoalMinutes: 15, // roz ka target (10-20 minute)
  streakMinSeconds: 60, // din tabhi streak mein ginta hai jab kam az kam itni practice ho
  minSessionSeconds: 5, // isse chhota session save nahi hota
  speechLang: "en-US", // mic kis zabaan mein sune
};
