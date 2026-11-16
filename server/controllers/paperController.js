import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  extractPdfText,
  splitTextIntoChunks,
} from "../services/chunker.js";
import {
  buildLocalEmbedding,
  embedBatch,
  extractBibliographicMetadata,
  extractLocalMetadata,
  hasGeminiApiKey,
} from "../services/geminiService.js";
import {
  deletePaperForUser,
  getPaperForUser,
  listAnalyzedPaperIdsByUser,
  listPapersByUser,
  savePaperWithChunks,
} from "../services/dataStore.js";

export const UPLOADS_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "ai-research-uploads")
  : path.resolve(process.cwd(), "server", "uploads");

export async function listPapers(req, res, next) {
  try {
    const userId = req.auth.userId;
    const [papers, analyzedIds] = await Promise.all([
      listPapersByUser(userId),
      listAnalyzedPaperIdsByUser(userId),
    ]);
    const analyzedSet = new Set(analyzedIds);
    const enriched = papers.map((p) => ({
      ...p,
      analysisStatus: analyzedSet.has(p.id) ? "analyzed" : "pending",
    }));
    res.json({ papers: enriched });
  } catch (err) {
    next(err);
  }
}

export async function getPaper(req, res, next) {
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
    const analyzedIds = await listAnalyzedPaperIdsByUser(req.auth.userId);
    res.json({
      paper: {
        ...paper,
        analysisStatus: analyzedIds.includes(paper.id) ? "analyzed" : "pending",
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function uploadPaper(req, res, next) {
  try {
    const userId = req.auth.userId;
    if (!req.file) {
      res.status(400).json({ error: "No PDF file provided." });
      return;
    }

    const parsed = await extractPdfText(req.file.buffer, req.file.originalname);
    const chunks = splitTextIntoChunks(parsed.text, parsed.pageCount, 900, 160);
    if (chunks.length === 0) {
      res.status(422).json({
        error: "Could not extract readable chunks from this PDF.",
      });
      return;
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    const storedName = `${crypto.randomUUID()}.pdf`;
    const storedPath = path.join(UPLOADS_DIR, storedName);
    fs.writeFileSync(storedPath, req.file.buffer);
    const fileUrl = `/uploads/${storedName}`;

    let metadata = extractLocalMetadata(parsed.title, parsed.text);
    let embeddings = chunks.map((c) => buildLocalEmbedding(c.content));
    let embeddingSource = "local";
    let warning = null;

    if (hasGeminiApiKey()) {
      const [metaRes, embedRes] = await Promise.allSettled([
        extractBibliographicMetadata(parsed.title, parsed.text),
        embedBatch(chunks.map((c) => c.content)),
      ]);

      if (metaRes.status === "fulfilled") {
        metadata = metaRes.value;
      }
      if (embedRes.status === "fulfilled") {
        embeddings = embedRes.value;
        embeddingSource = "gemini";
      } else {
        const aiMsg =
          embedRes.reason instanceof Error
            ? embedRes.reason.message
            : String(embedRes.reason);
        console.warn(`[papers/upload] Gemini embedding fallback used: ${aiMsg}`);
      }
    }

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
      embeddingSource,
    });

    res.status(201).json({
      paper: { ...paper, analysisStatus: "pending" },
      ...(warning ? { warning } : {}),
    });
  } catch (err) {
    next(err);
  }
}

export async function deletePaper(req, res, next) {
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

    res.json({ deleted: true, id: deleted.id });
  } catch (err) {
    next(err);
  }
}
