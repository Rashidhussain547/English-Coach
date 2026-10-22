# English Coach (Zero-Cost)

Personal AI English speaking coach. React + Vite frontend, Node.js serverless backend (Vercel), Google Gemini free tier as the default AI provider. Voice uses the browser's free Web Speech API.

## Features
- Voice conversation: speak (mic) -> AI coach replies in English and speaks it
- Mistakes are collected silently during the chat, never interrupting you
- Corrections tab: original, corrected, Roman Urdu explanation, better phrase, Listen and Repeat
- Session report at the end: duration, corrections, new vocabulary, fluency tips, what to practise next
- Daily topics, streak, 7-day practice chart, progress history
- Model/provider switchable from environment variables only

## Run locally

```bash
npm install
cp .env.example .env      # Windows: .env.example ki copy banake naam .env rakhein
# .env kholen aur GEMINI_API_KEY bharein
npm run dev
```

Open `http://localhost:5173` in Chrome or Edge.

## Tests (no real API calls)

```bash
npm run test:ai
```

## Switching the AI model or provider

Only environment variables change (`.env` locally, Environment Variables on Vercel). No code change.

| Goal | What to set |
|------|-------------|
| Another Gemini model | `AI_MODEL=<model id>` |
| Another provider with an OpenAI-compatible API | `AI_PROVIDER=openai`, `AI_MODEL`, `AI_BASE_URL`, `OPENAI_API_KEY` |

After changing variables: restart `npm run dev` locally, or redeploy on Vercel.

To add a brand-new provider: copy `server/ai/providers/gemini.js`, change the request/response format, register it in `server/ai/index.js`.

## Deploy (GitHub + Vercel Hobby)

1. Create an empty **private** repository on GitHub (no README).
2. In the project folder:
   ```bash
   git init
   git add .
   git commit -m "English Coach"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
   `.env` is in `.gitignore`, so your key is not uploaded.
3. On vercel.com sign in with GitHub, click **Add New > Project**, import the repository.
4. Framework preset: **Vite** (auto-detected). Leave build settings as they are.
5. Before deploying, open **Environment Variables** and add:
   - `AI_PROVIDER` = `gemini`
   - `AI_MODEL` = the same model id as in your `.env`
   - `GEMINI_API_KEY` = your key
6. Click **Deploy**. You get a free `https://<name>.vercel.app` link.
7. Open the link on your phone (HTTPS is needed for the mic). Every `git push` to `main` redeploys automatically.

## Free-tier notes
- Gemini free tier limits are per project and can change; check Google AI Studio. When the quota is exhausted the app shows a message and a retry button. It never switches to a paid service.
- Vercel Hobby is free and for personal, non-commercial use. If its usage limits are exceeded, features pause for up to 30 days instead of billing.
- Free-tier prompts may be used by the provider to improve their products, so do not say private or sensitive information.

## Data and privacy
- Progress is stored in this browser's LocalStorage only: no sync between devices, and clearing browser data deletes it.
- Voice recordings are not saved. Chrome/Edge send audio to their speech services to produce text.
- The API key lives only in backend environment variables.

See `ARCHITECTURE.md` for the folder structure.
