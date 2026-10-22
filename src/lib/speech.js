// Browser ki Web Speech API ke helpers. Ye free hai aur koi API key nahi chahiye.
// Do kaam: (1) awaaz ko text banana (SpeechRecognition), (2) text ko awaaz mein sunana (speechSynthesis).
//
// Note: Provider-independent hai. Phase 3+ mein AI badle to ye file nahi badlegi.

const SpeechRecognitionClass =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

export const speechSupport = {
  recognition: Boolean(SpeechRecognitionClass),
  synthesis: typeof window !== "undefined" && "speechSynthesis" in window,
};

// ---------- Text-to-speech ----------

let cachedVoice = null;

function pickEnglishVoice() {
  if (!speechSupport.synthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Pehle US/UK English dhoondo, warna koi bhi English voice
  return (
    voices.find((v) => v.lang === "en-US") ||
    voices.find((v) => v.lang === "en-GB") ||
    voices.find((v) => v.lang && v.lang.startsWith("en")) ||
    null
  );
}

if (speechSupport.synthesis) {
  // Voices kuch browsers mein der se load hoti hain
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = pickEnglishVoice();
  };
}

export function speak(text, { rate = 0.95, onStart, onEnd } = {}) {
  if (!speechSupport.synthesis || !text) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel(); // purani awaaz band
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = cachedVoice || pickEnglishVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.rate = rate;
  utterance.onstart = () => onStart?.();
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (speechSupport.synthesis) window.speechSynthesis.cancel();
}

// ---------- Speech-to-text ----------

// Error codes ko simple Roman Urdu message mein badalta hai
export function describeSpeechError(code) {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Mic ki permission nahi mili. Browser ki address bar mein mic allow karein. (Phone par ye sirf HTTPS ya localhost par chalta hai.)";
    case "no-speech":
      return "Awaaz nahi suni gayi. Dobara try karein aur mic ke qareeb bolein.";
    case "audio-capture":
      return "Mic nahi mila. Check karein ke mic laga hua hai.";
    case "network":
      return "Speech recognition ke liye internet chahiye. Connection check karein.";
    case "aborted":
      return "";
    default:
      return "Speech recognition mein masla aaya (" + code + "). Type karke jawab dein.";
  }
}

// Ek baar bolne ke liye recognizer banata hai.
// callbacks: onInterim(text), onFinal(text), onError(message), onEnd()
export function createRecognizer({ lang = "en-US", onInterim, onFinal, onError, onEnd }) {
  if (!SpeechRecognitionClass) return null;

  const rec = new SpeechRecognitionClass();
  rec.lang = lang;
  rec.continuous = false; // push-to-talk: ek jumla/jawab, phir ruk jao
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let finalText = "";

  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    if (interim) onInterim?.((finalText + interim).trim());
  };

  rec.onerror = (event) => {
    const message = describeSpeechError(event.error);
    if (message) onError?.(message);
  };

  rec.onend = () => {
    const text = finalText.trim();
    if (text) onFinal?.(text);
    onEnd?.();
  };

  return rec;
}
