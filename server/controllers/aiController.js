import crypto from "node:crypto";
import {
  analyzeResearchPaper,
  answerRagQuestion,
  embedBatch,
  embedText,
  hasGeminiApiKey,
  summarizeResearchPaper,
} from "../services/geminiService.js";
import {
  deleteConversation,
  getConversationById,
  getPaperAnalysis,
  getPaperForUser,
  listConversationsForPaper,
  listPaperChunks,
  savePaperAnalysis,
  searchPaperChunks,
  updatePaperChunksEmbeddings,
  upsertConversationMessages,
} from "../services/dataStore.js";

export async function getAnalysis(req, res, next) {
  try {
    const analysis = await getPaperAnalysis(
      req.auth.userId,
      String(req.params.paperId)
    );
    res.json({ analysis });
  } catch (err) {
    next(err);
  }
}

export async function analyzePaper(req, res, next) {
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

    const structured = await analyzeResearchPaper(
      paper.title,
      paper.extractedText
    );
    const saved = await savePaperAnalysis(userId, paperId, structured);

    res.json({ analysis: saved, cached: false });
  } catch (err) {
    next(err);
  }
}

export async function summarizePaper(req, res, next) {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const format = req.body?.format === "short" ? "short" : "detailed";

    const paper = await getPaperForUser(userId, paperId, true);
    if (!paper || !paper.extractedText) {
      res.status(404).json({ error: "Research paper not found." });
      return;
    }

    const summary = await summarizeResearchPaper(
      paper.title,
      paper.extractedText,
      format
    );

    res.json({ summary, format });
  } catch (err) {
    next(err);
  }
}

export async function listConversations(req, res, next) {
  try {
    const conversations = await listConversationsForPaper(
      req.auth.userId,
      String(req.params.paperId)
    );
    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}

export async function removeConversation(req, res, next) {
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
}

export async function chatWithPaper(req, res, next) {
  try {
    const userId = req.auth.userId;
    const paperId = String(req.params.paperId);
    const question =
      typeof req.body?.question === "string" ? req.body.question.trim() : "";
    const conversationId =
      typeof req.body?.conversationId === "string"
        ? req.body.conversationId
        : undefined;

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
    const answer = await answerRagQuestion(
      question,
      paper.title,
      topChunks,
      recentHistory
    );

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
}
