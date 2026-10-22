# English Coach - Architecture

```
 Browser (React + Vite)                      Vercel serverless (Node.js)
 ------------------------                    ---------------------------
 Screens                                     api/chat.js      conversation + corrections
 lib/speech  (mic + voice, Web Speech)       api/summary.js   end-of-session report
 lib/api  --------- fetch /api/* ---------->  api/health.js    config check
 lib/progress (LocalStorage)                        |
                                              server/ai/index.js   <- only place that picks the provider
                                                |-- providers/gemini.js
                                                |-- providers/openai.js   (any OpenAI-compatible API)
                                              server/prompts/coach.js   coach + report instructions
                                              server/ai/parse.js        safe JSON parsing
```

Rules
1. The browser never sees the AI provider or API key. It only calls `/api/*`.
2. Providers sit behind one adapter interface: `generate({ apiKey, model, system, messages, ... }) -> { text }`.
3. Switching model/provider = environment variables (`AI_PROVIDER`, `AI_MODEL`, `AI_BASE_URL`, `<PROVIDER>_API_KEY`).
4. Capabilities are separate: text generation uses the provider, speech-to-text and text-to-speech use the browser. If a provider has no audio support nothing changes.
5. Learning logic (prompts, correction rules, report format) is independent of the provider.
6. Quota care: only the last 12 messages are sent, one call per turn, one call for the report.

## Folders

```
api/            Vercel functions (chat, summary, health)
server/         provider layer, prompts, parser, local dev middleware
scripts/        test-ai.mjs (npm run test:ai)
src/
  App.jsx       screen switching, saves sessions/corrections/vocabulary
  config/       appConfig.js (goal minutes, levels, speech language)
  data/         topics.js
  lib/          api.js, speech.js, progress.js, storage.js
  hooks/        useSpeechRecognition.js
  components/   BottomNav, StatCard, CorrectionCard, SessionSummary
  screens/      Onboarding, Home, Conversation, Corrections, Progress
```

## Phase status
All phases are implemented: 1 UI, 2 speech, 3 secure backend, 4 conversation and corrections, 5 daily topics and session report, 6 progress and streak, 7 provider switching and tests, 8 deployment config.
Future ideas: PWA install, optional free database for cross-device sync, level auto-adjust.
