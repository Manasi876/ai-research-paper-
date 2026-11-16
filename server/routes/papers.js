import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import {
  extractPdfText,
  splitTextIntoChunks,
  PdfValidationError,
} from "../services/chunker.js";
import {
  embedBatch,
  extractBibliographicMetadata,
} from "../services/geminiService.js";
import {
  deletePaperForUser,
  getPaperForUser,
  listPapersByUser,
  logActivity,
  savePaperWithChunks,
  updatePaperForUser,
} from "../services/dataStore.js";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const UPLOADS_DIR = path.resolve(process.cwd(), "server", "uploads");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !isPdfExt) {
      cb(new PdfValidationError("Invalid file type. Only PDF files (.pdf) are accepted.", 400));
      return;
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

// GET /api/papers - List authenticated user's uploaded papers
router.get("/", async (req, res, next) => {
  try {
    const papers = await listPapersByUser(req.auth.userId);
    res.json({ papers });
  } catch (err) {
    next(err);
  }
});

// GET /api/papers/:id - Get single paper metadata (and optional text)
router.get("/:id", async (req, res, next) => {
  try {
    const includeText = req.query.includeText === "true";
    const paper = await getPaperForUser(
      req.auth.userId,
      String(req.params.id),
      includeText
    );
    if (!paper) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }
    res.json({ paper });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/papers/:id - Update bookmark, project assignment, or verified metadata
router.patch("/:id", async (req, res, next) => {
  try {
    const patch = {};
    if (typeof req.body?.isBookmarked === "boolean") {
      patch.isBookmarked = req.body.isBookmarked;
    }
    if (Array.isArray(req.body?.projectIds)) {
      patch.projectIds = req.body.projectIds.map(String);
    }
    if (typeof req.body?.title === "string" && req.body.title.trim()) {
      patch.title = req.body.title.trim();
    }
    if (Array.isArray(req.body?.authors)) {
      patch.authors = req.body.authors.map(String).filter(Boolean);
    }
    if (typeof req.body?.publicationYear === "string") {
      patch.publicationYear = req.body.publicationYear.trim();
    }

    const updated = await updatePaperForUser(
      req.auth.userId,
      String(req.params.id),
      patch
    );
    if (!updated) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }
    res.json({ paper: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/papers/upload - Upload PDF, extract text & metadata, chunk, embed, store
router.post(
  "/upload",
  (req, res, next) => {
    upload.single("paper")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({
            error: "File too large. Maximum allowed PDF size is 15 MB.",
          });
          return;
        }
        res.status(400).json({ error: `Upload error: ${err.message}` });
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  async (req, res, next) => {
    try {
      const userId = req.auth.userId;
      if (!req.file) {
        res.status(400).json({ error: "No PDF file provided." });
        return;
      }

      const parsed = await extractPdfText(req.file.buffer, req.file.originalname);
      const chunks = splitTextIntoChunks(parsed.text, parsed.pageCount, 900, 160);
      if (chunks.length === 0) {
        res.status(422).json({ error: "Could not extract readable chunks from this PDF." });
        return;
      }

      // Persist file locally under server/uploads/<uuid>.pdf
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      const storedName = `${crypto.randomUUID()}.pdf`;
      const storedPath = path.join(UPLOADS_DIR, storedName);
      fs.writeFileSync(storedPath, req.file.buffer);
      const fileUrl = `/uploads/${storedName}`;

      // Extract metadata + generate embeddings in parallel
      const [metadata, embeddings] = await Promise.all([
        extractBibliographicMetadata(parsed.title, parsed.text),
        embedBatch(chunks.map((c) => c.content)),
      ]);

      const paper = await savePaperWithChunks({
        userId,
        title: metadata.title || parsed.title,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        pageCount: parsed.pageCount,
        fileUrl,
        extractedText: parsed.text,
        authors: metadata.authors,
        abstract: metadata.abstract,
        keywords: metadata.keywords,
        publicationYear: metadata.publicationYear,
        chunks,
        embeddings,
      });

      await logActivity(userId, "Uploaded paper", paper.title);
      res.status(201).json({ paper });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/papers/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const deleted = await deletePaperForUser(userId, String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    if (deleted.fileUrl && deleted.fileUrl.startsWith("/uploads/")) {
      const fileName = path.basename(deleted.fileUrl);
      const localPath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    await logActivity(userId, "Deleted paper", deleted.title);
    res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    next(err);
  }
});

export default router;
