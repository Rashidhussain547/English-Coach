// Sirf local development ke liye: Vite ke andar /api/* ko wahi handlers se chalata hai jo Vercel par chalenge.
// Is wajah se local par alag server (Express) ya "vercel dev" ki zaroorat nahi.

export function devApiPlugin() {
  return {
    name: "dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://localhost");
        if (!url.pathname.startsWith("/api/")) return next();

        const name = url.pathname.replace("/api/", "").replace(/[^a-z0-9-]/gi, "");

        // Vercel jaisa res.status().json()
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (data) => {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        };

        try {
          // JSON body parse
          if (req.method === "POST") {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const raw = Buffer.concat(chunks).toString("utf8");
            req.body = raw ? JSON.parse(raw) : {};
          }
          // ssrLoadModule: handler file badalne par server restart nahi karna padta
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          await mod.default(req, res);
        } catch (err) {
          if (err.code === "ERR_LOAD_URL" || /Failed to load url/i.test(err.message)) {
            return res.status(404).json({ ok: false, code: "not_found", detail: "Ye API nahi mili." });
          }
          console.error("Dev API error:", err.message);
          return res.status(500).json({ ok: false, code: "provider", detail: err.message });
        }
      });
    },
  };
}
