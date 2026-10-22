// Daily topics ki list (ye app ka content hai, aap ne jo topics diye the wahi). Jitne chahein yahan add/edit karein.
// Phase 5 mein level aur purani mistakes ke mutabiq personalized topics aayenge.

export const DAILY_TOPICS = [
  { title: "Introducing Yourself", hint: "Name, city, family, hobbies" },
  { title: "Daily Routine", hint: "Subah se raat tak aap kya karte hain" },
  { title: "Ordering Food at a Restaurant", hint: "Menu, order, bill" },
  { title: "Talking About Your Job", hint: "Kaam, office, colleagues" },
  { title: "Expressing Your Opinions", hint: "I think, I believe, in my opinion" },
  { title: "Telling a Story", hint: "Past tense mein koi waqia sunana" },
  {
    title: "Weekly Review and Free Conversation",
    hint: "Is hafte ki revision, koi bhi topic",
  },
];

// Ab tak kitne sessions hue, us hisaab se agla topic. Pehle din = Day 1.
export function getTopicForSession(sessionCount) {
  const index = sessionCount % DAILY_TOPICS.length;
  return { day: index + 1, ...DAILY_TOPICS[index] };
}
