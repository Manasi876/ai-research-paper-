import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  countAnalysesByUser,
  listActivityLogs,
  listGeneratedContent,
  listPapersByUser,
  listProjectsByUser,
  listSavedPapers,
} from "../services/dataStore.js";

const router = Router();
router.use(requireAuth);

// GET /api/dashboard/summary
router.get("/summary", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const [papers, analysisCount, savedPapers, projects, activities, generated] =
      await Promise.all([
        listPapersByUser(userId),
        countAnalysesByUser(userId),
        listSavedPapers(userId),
        listProjectsByUser(userId),
        listActivityLogs(userId, 12),
        listGeneratedContent(userId),
      ]);

    // Build 7-day activity series for Recharts from real timestamps
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const isoPrefix = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      days.push({ date: isoPrefix, label, uploads: 0, aiTasks: 0 });
    }

    for (const p of papers) {
      const dayKey = p.uploadDate.slice(0, 10);
      const bucket = days.find((d) => d.date === dayKey);
      if (bucket) bucket.uploads += 1;
    }

    for (const g of generated) {
      const dayKey = g.createdAt.slice(0, 10);
      const bucket = days.find((d) => d.date === dayKey);
      if (bucket) bucket.aiTasks += 1;
    }

    res.json({
      stats: {
        totalPapers: papers.length,
        totalAnalyses: analysisCount,
        totalSavedPapers: savedPapers.length,
        totalProjects: projects.length,
      },
      recentPapers: papers.slice(0, 5),
      projects: projects.slice(0, 5),
      recentActivity: activities,
      activityChart: days,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
