import crypto from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  analyzeResearchPaper,
  answerRagQuestion,
  compareResearchPapers,
  embedBatch,
  embedText,
  findResearchGaps,
  generatePaperQuestions,
  generatePresentationOutline,
  hasGeminiApiKey,
  summarizeResearchPaper,
} from "../services/geminiService.js";
import { buildCitations } from "../services/citationService.js";
import {
  deleteConversation,
  getConversationById,
  getPaperAnalysis,
  getPaperForUser,
  listConversationsForPaper,
  listGeneratedContent,
  listPaperChunks,
  logActivity,
  saveGeneratedContent,
  savePaperAnalysis,
  searchPaperChunks,
  updatePaperChunksEmbeddings,
  upsertConversationMessages,
} from "../services/dataStore.js";

const router = Router();
router.use(requireAuth);

// GET /api/ai/history - List generated content history for the user
router.get("/history", async (req, res, next) => {
  try {
    const paperId = typeof req.query.paperId === "string" ? req.query.paperId : undefined;
    const items = await listGeneratedContent(req.auth.userId, paperId);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/analyze/:paperId - Fetch existing saved analysis
router.get("/analyze/:paperId", async (req, res, next) => {
  try {
    const analysis = await getPaperAnalysis(req.auth.userId, String(req.params.paperId));
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/analyze/:paperId - Run full 11-section AI analysis
router.post("/analyze/:paperId", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const refresh = Boolean(req.body?.refresh);

    const paper = await getPaperForUser(userId, paperId, true);
    if (!paper || !paper.extractedText) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    if (!refresh) {
      const existing = await getPaperAnalysis(userId, paperId);
      if (existing) {
        res.json({ analysis: existing, cached: true });
        return;
      }
    }

    const structured = await analyzeResearchPaper(paper.title, paper.extractedText);
    const saved = await savePaperAnalysis(userId, paperId, structured);
    await saveGeneratedContent({
      userId,
      paperId,
      contentType: "paper_analysis",
      content: saved,
    });
    await logActivity(userId, "Analyzed paper", paper.title);

    res.json({ analysis: saved, cached: false });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/summarize/:paperId - Short, medium, or detailed summary
router.post("/summarize/:paperId", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const format =
      req.body?.format === "short" || req.body?.format === "detailed"
        ? req.body.format
        : "medium";

    const paper = await getPaperForUser(userId, paperId, true);
    if (!paper || !paper.extractedText) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    const summary = await summarizeResearchPaper(paper.title, paper.extractedText, format);
    await saveGeneratedContent({
      userId,
      paperId,
      contentType: `summary_${format}`,
      content: summary,
    });
    await logActivity(userId, `Generated ${format} summary`, paper.title);

    res.json({ summary, format });
  } catch (err) {
    next(err);
  }
});

// GET /api/ai/chat/:paperId - List all conversations for a paper
router.get("/chat/:paperId", async (req, res, next) => {
  try {
    const conversations = await listConversationsForPaper(
      req.auth.userId,
      String(req.params.paperId)
    );
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/ai/chat/:paperId/:conversationId
router.delete("/chat/:paperId/:conversationId", async (req, res, next) => {
  try {
    const deleted = await deleteConversation(
      req.auth.userId,
      String(req.params.conversationId)
    );
    if (!deleted) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/chat/:paperId - RAG chat with conversation history
router.post("/chat/:paperId", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const question = typeof req.body?.question === "string" ? req.body.question.trim() : "";
    const conversationId =
      typeof req.body?.conversationId === "string" ? req.body.conversationId : undefined;

    if (!question) {
      res.status(400).json({ error: "Question cannot be empty." });
      return;
    }

    const paper = await getPaperForUser(userId, paperId, false);
    if (!paper) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    let recentHistory = [];
    if (conversationId) {
      const existingConv = await getConversationById(userId, conversationId);
      if (existingConv) {
        recentHistory = existingConv.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }

    if (paper.embeddingSource === "local" && hasGeminiApiKey()) {
      const existingChunks = await listPaperChunks(userId, paperId);
      if (existingChunks.length > 0) {
        const geminiEmbeddings = await embedBatch(
          existingChunks.map((c) => c.content)
        );
        await updatePaperChunksEmbeddings(userId, paperId, geminiEmbeddings);
      }
    }

    const queryEmbedding = await embedText(question);
    const topChunks = await searchPaperChunks(userId, paperId, queryEmbedding, 5);
    const answer = await answerRagQuestion(question, paper.title, topChunks, recentHistory);

    const sources = topChunks.map((c) => ({
      chunkIndex: c.chunkIndex,
      pageEstimate: c.pageEstimate,
      content: c.content,
      score: Number(c.score.toFixed(4)),
    }));

    const now = new Date().toISOString();
    const userMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      createdAt: now,
    };
    const assistantMsg = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: answer,
      sources,
      createdAt: new Date().toISOString(),
    };

    const convTitle =
      question.length > 52 ? `${question.slice(0, 52)}...` : question;

    const conversation = await upsertConversationMessages({
      userId,
      paperId,
      conversationId,
      title: convTitle,
      newMessages: [userMsg, assistantMsg],
    });

    res.json({ answer, sources, conversation });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/compare - Compare 2 or more uploaded papers
router.post("/compare", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperIds = Array.isArray(req.body?.paperIds)
      ? req.body.paperIds.map(String)
      : [];

    if (paperIds.length < 2) {
      res.status(400).json({ error: "Select at least 2 research papers to compare." });
      return;
    }
    if (paperIds.length > 5) {
      res.status(400).json({ error: "You can compare up to 5 papers at a time." });
      return;
    }

    const loaded = await Promise.all(
      paperIds.map((id) => getPaperForUser(userId, id, true))
    );
    const validPapers = loaded.filter((p) => Boolean(p && p.extractedText));

    if (validPapers.length < 2) {
      res.status(404).json({ error: "Could not load 2 valid papers for comparison." });
      return;
    }

    const comparison = await compareResearchPapers(
      validPapers.map((p) => ({
        id: p.id,
        title: p.title,
        text: p.extractedText,
      }))
    );

    await saveGeneratedContent({
      userId,
      paperId: validPapers[0].id,
      contentType: "comparison",
      content: comparison,
    });
    await logActivity(
      userId,
      `Compared ${validPapers.length} papers`,
      validPapers.map((p) => p.title).join(" vs ")
    );

    res.json({ comparison });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/research-gaps - Find research gaps across 1 or more papers
router.post("/research-gaps", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperIds = Array.isArray(req.body?.paperIds)
      ? req.body.paperIds.map(String)
      : [];

    if (paperIds.length === 0) {
      res.status(400).json({ error: "Select at least 1 paper to analyze for research gaps." });
      return;
    }

    const loaded = await Promise.all(
      paperIds.slice(0, 5).map((id) => getPaperForUser(userId, id, true))
    );
    const validPapers = loaded.filter((p) => Boolean(p && p.extractedText));

    if (validPapers.length === 0) {
      res.status(404).json({ error: "No valid papers found." });
      return;
    }

    const gaps = await findResearchGaps(
      validPapers.map((p) => ({ title: p.title, text: p.extractedText }))
    );

    await saveGeneratedContent({
      userId,
      paperId: validPapers[0].id,
      contentType: "research_gaps",
      content: gaps,
    });
    await logActivity(
      userId,
      "Discovered research gaps",
      validPapers.map((p) => p.title).join(", ")
    );

    res.json({ gaps });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-questions/:paperId
router.post("/generate-questions/:paperId", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const questionType = ["mcq", "technical", "viva", "short", "long"].includes(
      req.body?.questionType
    )
      ? req.body.questionType
      : "mcq";
    const difficulty = ["easy", "medium", "hard"].includes(req.body?.difficulty)
      ? req.body.difficulty
      : "medium";
    const count = Math.min(10, Math.max(3, Number(req.body?.count) || 5));

    const paper = await getPaperForUser(userId, paperId, true);
    if (!paper || !paper.extractedText) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    const questions = await generatePaperQuestions({
      title: paper.title,
      text: paper.extractedText,
      questionType,
      difficulty,
      count,
    });

    await saveGeneratedContent({
      userId,
      paperId,
      contentType: `questions_${questionType}`,
      content: questions,
    });
    await logActivity(
      userId,
      `Generated ${questionType.toUpperCase()} questions`,
      paper.title
    );

    res.json({ questions, questionType, difficulty });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/generate-presentation/:paperId
router.post("/generate-presentation/:paperId", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const paper = await getPaperForUser(userId, paperId, true);
    if (!paper || !paper.extractedText) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    const slides = await generatePresentationOutline(paper.title, paper.extractedText);
    await saveGeneratedContent({
      userId,
      paperId,
      contentType: "presentation",
      content: slides,
    });
    await logActivity(userId, "Generated presentation outline", paper.title);

    res.json({ slides, paperTitle: paper.title });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/citations/:paperId - Generate IEEE, APA, MLA strictly from verified metadata
router.post("/citations/:paperId", async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const paper = await getPaperForUser(userId, paperId, false);
    if (!paper) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    const override = req.body?.metadata || {};
    const citations = buildCitations({
      title: typeof override.title === "string" && override.title.trim() ? override.title.trim() : paper.title,
      authors: Array.isArray(override.authors) ? override.authors : paper.authors,
      publicationYear:
        typeof override.publicationYear === "string"
          ? override.publicationYear.trim()
          : paper.publicationYear,
      venue: typeof override.venue === "string" ? override.venue.trim() : "",
      doi: typeof override.doi === "string" ? override.doi.trim() : "",
      url: typeof override.url === "string" ? override.url.trim() : "",
    });

    res.json({ citations });
  } catch (err) {
    next(err);
  }
});

export default router;
