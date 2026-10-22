import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { devApiPlugin } from "./server/devApi.js";

export default defineConfig(({ mode }) => {
  // .env ki values (jaise GEMINI_API_KEY) sirf local backend ke process mein jati hain.
  // "VITE_" se shuru na hone wali values browser bundle mein kabhi nahi jatin.
  const env = loadEnv(mode, process.cwd(), "");
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), devApiPlugin()],
    server: {
      host: true, // phone se same Wi-Fi par test karne ke liye
      port: 5173,
    },
  };
});
