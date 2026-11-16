import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDatabase, isMongoConnected } from "./config/db.js";
import { PdfValidationError } from "./services/chunker.js";
import { hasGeminiApiKey } from "./services/geminiService.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import papersRouter from "./routes/papers.js";
import aiRouter from "./routes/ai.js";

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const configuredOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configuredOrigins.includes("*") || configuredOrigins.includes(origin)) {
    return true;
  }

  const candidateUrls = [
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "",
  ]
    .map((u) => (u || "").trim().replace(/\/+$/, ""))
    .filter(Boolean);

  if (candidateUrls.includes(origin)) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname.endsWith(".run.app") ||
      parsed.hostname.endsWith(".vercel.app")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function createApiApp() {
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

  app.use("/api", async (_req, _res, next) => {
    try {
      await connectDatabase();
      next();
    } catch (err) {
      next(err);
    }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many authentication requests. Please try again later.",
    },
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 45,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Rate limit exceeded for AI requests. Please wait a moment.",
    },
  });

  app.use("/api/auth", authLimiter, authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/papers", papersRouter);
  app.use("/api/ai", aiLimiter, aiRouter);

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "ai-research-paper-analyzer",
      dbMode: isMongoConnected() ? "mongodb" : "local",
      aiConfigured: hasGeminiApiKey(),
      environment: process.env.VERCEL ? "vercel" : "node",
    });
  });

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });

  return app;
}

export function attachErrorHandler(app) {
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
}
