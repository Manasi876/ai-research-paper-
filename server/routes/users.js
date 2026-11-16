import { Router } from "express";
import {
  hashPassword,
  verifyPassword,
  requireAuth,
} from "../middleware/auth.js";
import {
  findUserByEmail,
  findUserById,
  listActivityLogs,
  logActivity,
  updateUserProfile,
} from "../services/dataStore.js";

const router = Router();
router.use(requireAuth);

// GET /api/users/profile
router.get("/profile", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const [user, activityHistory] = await Promise.all([
      findUserById(userId),
      listActivityLogs(userId, 25),
    ]);
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }
    res.json({ user, activityHistory });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/profile
router.put("/profile", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
    const profileImage =
      typeof req.body?.profileImage === "string" ? req.body.profileImage.trim() : undefined;
    const themePreference =
      req.body?.themePreference === "dark" || req.body?.themePreference === "light"
        ? req.body.themePreference
        : undefined;
    const currentPassword =
      typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword =
      typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

    if (name !== undefined && name.length < 2) {
      res.status(400).json({ error: "Name must be at least 2 characters." });
      return;
    }

    let passwordHash;
    if (newPassword) {
      if (newPassword.length < 6) {
        res.status(400).json({ error: "New password must be at least 6 characters." });
        return;
      }
      if (!currentPassword) {
        res.status(400).json({ error: "Current password is required to change password." });
        return;
      }
      const userWithHash = await findUserByEmail(req.auth.email);
      if (!userWithHash || !(await verifyPassword(currentPassword, userWithHash.passwordHash))) {
        res.status(403).json({ error: "Current password is incorrect." });
        return;
      }
      passwordHash = await hashPassword(newPassword);
    }

    const updated = await updateUserProfile(userId, {
      name,
      profileImage,
      themePreference,
      passwordHash,
    });
    if (!updated) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    if (name || passwordHash) {
      await logActivity(
        userId,
        passwordHash ? "Updated password" : "Updated profile",
        updated.name
      );
    }

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
