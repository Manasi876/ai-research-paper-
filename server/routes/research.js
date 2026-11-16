import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { searchScholarlyPapers } from "../services/researchDiscovery.js";
import {
  deleteSavedPaper,
  listSavedPapers,
  logActivity,
  saveExternalPaper,
} from "../services/dataStore.js";

const router = Router();
router.use(requireAuth);

// GET /api/research/search?q=...&source=all|semantic_scholar|crossref
router.get("/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const source =
      req.query.source === "semantic_scholar" || req.query.source === "crossref"
        ? req.query.source
        : "all";

    if (!q) {
      res.status(400).json({ error: "Please enter a search query (topic, title, author, or keyword)." });
      return;
    }

    const results = await searchScholarlyPapers(q, source);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// POST /api/research/save
router.post("/save", async (req, res, next) => {
  try {
    const paperMetadata = req.body?.paperMetadata;
    const source =
      req.body?.source === "crossref" ? "crossref" : "semantic_scholar";

    if (!paperMetadata || !paperMetadata.title) {
      res.status(400).json({ error: "Invalid paper metadata." });
      return;
    }

    const saved = await saveExternalPaper(req.auth.userId, paperMetadata, source);
    await logActivity(req.auth.userId, "Saved external paper", paperMetadata.title);
    res.status(201).json({ saved });
  } catch (err) {
    next(err);
  }
});

// GET /api/research/saved
router.get("/saved", async (req, res, next) => {
  try {
    const savedPapers = await listSavedPapers(req.auth.userId);
    res.json({ savedPapers });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/research/saved/:id
router.delete("/saved/:id", async (req, res, next) => {
  try {
    const deleted = await deleteSavedPaper(req.auth.userId, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: "Saved paper not found." });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
