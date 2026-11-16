import "dotenv/config";
import path from "node:path";
import express from "express";
import { connectDatabase } from "./server/config/db.js";
import { attachErrorHandler, createApiApp } from "./server/app.js";

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await connectDatabase();

  const app = createApiApp();

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  attachErrorHandler(app);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI in Research Paper server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
