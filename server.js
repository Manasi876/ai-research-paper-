import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDatabase, isMongoConnected } from "./server/config/db.js";
import { PdfValidationError } from "./server/services/chunker.js";
import authRouter from "./server/routes/auth.js";
import usersRouter from "./server/routes/users.js";
import papersRouter from "./server/routes/papers.js";
import aiRouter from "./server/routes/ai.js";
import researchRouter from "./server/routes/research.js";
import projectsRouter from "./server/routes/projects.js";
import dashboardRouter from "./server/routes/dashboard.js";

const PORT = Number(process.env.PORT) || 3000;

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const configuredOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configuredOrigins.includes("*") || configuredOrigins.includes(origin)) {
    return true;
  }

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl && origin === appUrl.replace(/\/+$/, "")) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".run.app")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function startServer() {
  await connectDatabase();

  const app = express();
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: "3mb" }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication requests. Please try again later." },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 45,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded for AI requests. Please wait a moment." },
  });

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/papers", papersRouter);
  app.use("/api/ai", aiLimiter, aiRouter);
  app.use("/api/research", researchRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "ai-in-research-paper",
      dbMode: isMongoConnected() ? "mongodb" : "local",
    });
  });

  app.use((err, _req, res, _next) => {
    if (err instanceof PdfValidationError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }

    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    const statusCode =
      message.includes("GEMINI_API_KEY") || message.includes("API_KEY_INVALID")
        ? 503
        : 500;

    console.error("[api error]", err);
    res.status(statusCode).json({ error: message });
  });

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI in Research Paper server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
