import { useCallback, useEffect, useRef, useState } from "react";
import { createRecognizer, speechSupport } from "../lib/speech.js";

// React hook: mic ka start/stop, live text aur errors sambhalta hai.
// Use: const { listening, interim, error, supported, start, stop } = useSpeechRecognition({ onFinal })
export function useSpeechRecognition({ onFinal, lang = "en-US" } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const onFinalRef = useRef(onFinal);

  // Hamesha latest callback use ho
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!speechSupport.recognition || recRef.current) return;
    setError("");
    setInterim("");

    const rec = createRecognizer({
      lang,
      onInterim: setInterim,
      onFinal: (text) => onFinalRef.current?.(text),
      onError: setError,
      onEnd: () => {
        recRef.current = null;
        setListening(false);
        setInterim("");
      },
    });

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
      setError("Mic start nahi ho saka. Dobara try karein.");
    }
  }, [lang]);

  // Screen se nikalte waqt mic band
  useEffect(() => {
    return () => recRef.current?.abort();
  }, []);

  return {
    listening,
    interim,
    error,
    supported: speechSupport.recognition,
    start,
    stop,
  };
}
