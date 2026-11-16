import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createProject,
  deleteProject,
  getProjectById,
  listProjectsByUser,
  logActivity,
  updateProject,
} from "../services/dataStore.js";

const router = Router();
router.use(requireAuth);

// POST /api/projects
router.post("/", async (req, res, next) => {
  try {
    const projectName =
      typeof req.body?.projectName === "string" ? req.body.projectName.trim() : "";
    const description =
      typeof req.body?.description === "string" ? req.body.description.trim() : "";
    const paperIds = Array.isArray(req.body?.paperIds)
      ? req.body.paperIds.map(String)
      : [];

    if (!projectName) {
      res.status(400).json({ error: "Project name is required." });
      return;
    }

    const project = await createProject({
      userId: req.auth.userId,
      projectName,
      description,
      paperIds,
    });
    await logActivity(req.auth.userId, "Created project", project.projectName);
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects
router.get("/", async (req, res, next) => {
  try {
    const projects = await listProjectsByUser(req.auth.userId);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id
router.get("/:id", async (req, res, next) => {
  try {
    const project = await getProjectById(req.auth.userId, String(req.params.id));
    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
router.put("/:id", async (req, res, next) => {
  try {
    const patch = {};
    if (typeof req.body?.projectName === "string" && req.body.projectName.trim()) {
      patch.projectName = req.body.projectName.trim();
    }
    if (typeof req.body?.description === "string") {
      patch.description = req.body.description.trim();
    }
    if (Array.isArray(req.body?.paperIds)) {
      patch.paperIds = req.body.paperIds.map(String);
    }

    const updated = await updateProject(
      req.auth.userId,
      String(req.params.id),
      patch
    );
    if (!updated) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json({ project: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await deleteProject(req.auth.userId, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
