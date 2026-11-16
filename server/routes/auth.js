import { Router } from "express";
import {
  hashPassword,
  verifyPassword,
  signAuthToken,
  requireAuth,
} from "../middleware/auth.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  logActivity,
} from "../services/dataStore.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!name || name.length < 2) {
      res.status(400).json({ error: "Name must be at least 2 characters." });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Please provide a valid email address." });
      return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ name, email, passwordHash });
    const token = signAuthToken({ userId: user.id, email: user.email });
    await logActivity(user.id, "Account created", user.email);

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const found = await findUserByEmail(email);
    if (!found) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const valid = await verifyPassword(password, found.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const { passwordHash: _ignored, ...user } = found;
    const token = signAuthToken({ userId: user.id, email: user.email });

    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.auth.userId);
    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
  if (!smtpConfigured) {
    res.status(200).json({
      emailConfigured: false,
      message:
        "Email delivery (SMTP) is not configured in this environment. Please contact an administrator or update your password from Profile Settings while signed in.",
    });
    return;
  }

  res.status(200).json({
    emailConfigured: true,
    message: "If an account exists for that email, reset instructions have been queued.",
  });
});

export default router;
