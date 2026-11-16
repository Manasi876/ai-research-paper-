import {
  hashPassword,
  verifyPassword,
  signAuthToken,
} from "../middleware/auth.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
} from "../services/dataStore.js";

export async function register(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
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

    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
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
}

export async function getMe(req, res, next) {
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
}
