import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { isMongoConnected } from "../config/db.js";

const EPHEMERAL_DEV_SECRET = crypto.randomBytes(32).toString("hex");

function getJwtSecret() {
  const envSecret = process.env.JWT_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  return EPHEMERAL_DEV_SECRET;
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signAuthToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required. Please sign in." });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({ error: "Invalid authentication token." });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || !decoded.userId) {
      res.status(401).json({ error: "Invalid token payload." });
      return;
    }
    if (isMongoConnected() && !mongoose.Types.ObjectId.isValid(decoded.userId)) {
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }
    req.auth = { userId: decoded.userId, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
  }
}
