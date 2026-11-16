import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { isMongoConnected } from "../config/db.js";
import { UserModel } from "../models/User.js";
import { PaperModel } from "../models/Paper.js";
import { ChunkModel } from "../models/Chunk.js";
import {
  ActivityLogModel,
  ConversationModel,
  GeneratedContentModel,
  PaperAnalysisModel,
  ResearchProjectModel,
  SavedPaperModel,
} from "../models/Schemas.js";

const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "ai-research-data")
  : path.resolve(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function emptyStore() {
  return {
    users: [],
    papers: [],
    chunks: [],
    analyses: [],
    conversations: [],
    projects: [],
    savedPapers: [],
    generatedContent: [],
    activityLogs: [],
  };
}

function readLocalStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return emptyStore();
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      papers: Array.isArray(parsed.papers) ? parsed.papers : [],
      chunks: Array.isArray(parsed.chunks) ? parsed.chunks : [],
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : [],
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      savedPapers: Array.isArray(parsed.savedPapers) ? parsed.savedPapers : [],
      generatedContent: Array.isArray(parsed.generatedContent) ? parsed.generatedContent : [],
      activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeLocalStore(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_PATH, JSON.stringify(data), "utf-8");
}

function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function toPaperDTO(doc, includeText = false) {
  const base = {
    id: String(doc._id ?? doc.id),
    userId: String(doc.userId),
    title: String(doc.title ?? "Untitled"),
    fileName: String(doc.fileName ?? ""),
    fileSize: Number(doc.fileSize ?? 0),
    pageCount: Number(doc.pageCount ?? 1),
    chunkCount: Number(doc.chunkCount ?? 0),
    fileUrl: String(doc.fileUrl ?? ""),
    authors: Array.isArray(doc.authors) ? doc.authors : [],
    abstract: String(doc.abstract ?? ""),
    keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
    publicationYear: String(doc.publicationYear ?? ""),
    isBookmarked: Boolean(doc.isBookmarked),
    projectIds: Array.isArray(doc.projectIds) ? doc.projectIds.map((p) => String(p)) : [],
    uploadDate:
      doc.uploadDate instanceof Date
        ? doc.uploadDate.toISOString()
        : String(doc.uploadDate ?? new Date().toISOString()),
    embeddingSource: doc.embeddingSource ?? "gemini",
    processingStatus: doc.processingStatus ?? "completed",
  };
  if (includeText) {
    base.extractedText = String(doc.extractedText ?? "");
  }
  return base;
}

export async function createUser(params) {
  const normalizedEmail = params.email.trim().toLowerCase();

  if (isMongoConnected()) {
    const doc = await UserModel.create({
      name: params.name.trim(),
      email: normalizedEmail,
      password: params.passwordHash,
      profileImage: "",
      themePreference: "light",
    });
    return {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      profileImage: doc.profileImage,
      themePreference: doc.themePreference,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  const store = readLocalStore();
  const user = {
    id: crypto.randomUUID(),
    name: params.name.trim(),
    email: normalizedEmail,
    password: params.passwordHash,
    profileImage: "",
    themePreference: "light",
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  writeLocalStore(store);
  const { password: _, ...dto } = user;
  return dto;
}

export async function findUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (isMongoConnected()) {
    const doc = await UserModel.findOne({ email: normalizedEmail }).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      passwordHash: doc.password,
      profileImage: doc.profileImage || "",
      themePreference: doc.themePreference || "light",
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }

  const store = readLocalStore();
  const user = store.users.find((u) => u.email === normalizedEmail);
  if (!user) return null;
  const { password, ...dto } = user;
  return { ...dto, passwordHash: password };
}

export async function findUserById(userId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const doc = await UserModel.findById(userId).select("-password").lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      profileImage: doc.profileImage || "",
      themePreference: doc.themePreference || "light",
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }

  const store = readLocalStore();
  const user = store.users.find((u) => u.id === userId);
  if (!user) return null;
  const { password: _, ...dto } = user;
  return dto;
}

export async function updateUserProfile(userId, updates) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return null;
    const patch = {};
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.profileImage !== undefined) patch.profileImage = updates.profileImage;
    if (updates.themePreference !== undefined) patch.themePreference = updates.themePreference;
    if (updates.passwordHash !== undefined) patch.password = updates.passwordHash;

    const doc = await UserModel.findByIdAndUpdate(userId, patch, { new: true })
      .select("-password")
      .lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      profileImage: doc.profileImage || "",
      themePreference: doc.themePreference || "light",
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }

  const store = readLocalStore();
  const idx = store.users.findIndex((u) => u.id === userId);
  if (idx === -1) return null;
  if (updates.name !== undefined) store.users[idx].name = updates.name.trim();
  if (updates.profileImage !== undefined) store.users[idx].profileImage = updates.profileImage;
  if (updates.themePreference !== undefined) store.users[idx].themePreference = updates.themePreference;
  if (updates.passwordHash !== undefined) store.users[idx].password = updates.passwordHash;
  writeLocalStore(store);
  const { password: _, ...dto } = store.users[idx];
  return dto;
}

export async function logActivity(userId, action, targetTitle) {
  if (isMongoConnected()) {
    await ActivityLogModel.create({ userId, action, targetTitle });
    return;
  }
  const store = readLocalStore();
  store.activityLogs.unshift({
    id: crypto.randomUUID(),
    userId,
    action,
    targetTitle,
    createdAt: new Date().toISOString(),
  });
  store.activityLogs = store.activityLogs.slice(0, 300);
  writeLocalStore(store);
}

export async function listActivityLogs(userId, limit = 20) {
  if (isMongoConnected()) {
    const docs = await ActivityLogModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      userId: String(d.userId),
      action: d.action,
      targetTitle: d.targetTitle,
      createdAt: new Date(d.createdAt).toISOString(),
    }));
  }
  const store = readLocalStore();
  return store.activityLogs.filter((a) => a.userId === userId).slice(0, limit);
}

export async function savePaperWithChunks(params) {
  if (isMongoConnected()) {
    const paperDoc = await PaperModel.create({
      userId: params.userId,
      title: params.title,
      fileName: params.fileName,
      fileSize: params.fileSize,
      pageCount: params.pageCount,
      chunkCount: params.chunks.length,
      fileUrl: params.fileUrl,
      extractedText: params.extractedText,
      authors: params.authors,
      abstract: params.abstract,
      keywords: params.keywords,
      publicationYear: params.publicationYear,
      isBookmarked: false,
      projectIds: [],
      uploadDate: new Date(),
      embeddingSource: params.embeddingSource ?? "gemini",
      processingStatus: "completed",
    });

    const chunkDocs = params.chunks.map((chunk, i) => ({
      userId: params.userId,
      paperId: paperDoc._id,
      chunkIndex: chunk.chunkIndex,
      pageEstimate: chunk.pageEstimate,
      content: chunk.content,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
      embedding: params.embeddings[i],
    }));

    if (chunkDocs.length > 0) {
      await ChunkModel.insertMany(chunkDocs);
    }

    return toPaperDTO(paperDoc.toObject());
  }

  const store = readLocalStore();
  const paperId = crypto.randomUUID();
  const paper = {
    id: paperId,
    userId: params.userId,
    title: params.title,
    fileName: params.fileName,
    fileSize: params.fileSize,
    pageCount: params.pageCount,
    chunkCount: params.chunks.length,
    fileUrl: params.fileUrl,
    extractedText: params.extractedText,
    authors: params.authors,
    abstract: params.abstract,
    keywords: params.keywords,
    publicationYear: params.publicationYear,
    isBookmarked: false,
    projectIds: [],
    uploadDate: new Date().toISOString(),
    embeddingSource: params.embeddingSource ?? "gemini",
    processingStatus: "completed",
  };

  store.papers.unshift(paper);
  for (let i = 0; i < params.chunks.length; i++) {
    store.chunks.push({
      id: crypto.randomUUID(),
      userId: params.userId,
      paperId,
      chunkIndex: params.chunks[i].chunkIndex,
      pageEstimate: params.chunks[i].pageEstimate,
      content: params.chunks[i].content,
      charStart: params.chunks[i].charStart,
      charEnd: params.chunks[i].charEnd,
      embedding: params.embeddings[i],
    });
  }
  writeLocalStore(store);

  const { extractedText: _, ...dto } = paper;
  return dto;
}

export async function listPapersByUser(userId) {
  if (isMongoConnected()) {
    const docs = await PaperModel.find({ userId })
      .select("-extractedText")
      .sort({ uploadDate: -1 })
      .lean();
    return docs.map((d) => toPaperDTO(d));
  }

  const store = readLocalStore();
  return store.papers
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
    .map(({ extractedText: _, ...dto }) => dto);
}

export async function getPaperForUser(userId, paperId, includeText = false) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return null;
    const query = PaperModel.findOne({ _id: paperId, userId });
    if (!includeText) query.select("-extractedText");
    const doc = await query.lean();
    if (!doc) return null;
    return toPaperDTO(doc, includeText);
  }

  const store = readLocalStore();
  const found = store.papers.find((p) => p.id === paperId && p.userId === userId);
  if (!found) return null;
  if (includeText) return { ...found };
  const { extractedText: _, ...dto } = found;
  return dto;
}

export async function updatePaperForUser(userId, paperId, patch) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return null;
    const doc = await PaperModel.findOneAndUpdate({ _id: paperId, userId }, patch, {
      new: true,
    })
      .select("-extractedText")
      .lean();
    if (!doc) return null;
    return toPaperDTO(doc);
  }

  const store = readLocalStore();
  const idx = store.papers.findIndex((p) => p.id === paperId && p.userId === userId);
  if (idx === -1) return null;
  Object.assign(store.papers[idx], patch);
  writeLocalStore(store);
  const { extractedText: _, ...dto } = store.papers[idx];
  return dto;
}

export async function deletePaperForUser(userId, paperId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return null;
    const deleted = await PaperModel.findOneAndDelete({ _id: paperId, userId }).lean();
    if (!deleted) return null;
    await Promise.all([
      ChunkModel.deleteMany({ paperId, userId }),
      PaperAnalysisModel.deleteMany({ paperId, userId }),
      ConversationModel.deleteMany({ paperId, userId }),
      GeneratedContentModel.deleteMany({ paperId, userId }),
      ResearchProjectModel.updateMany({ userId }, { $pull: { paperIds: paperId } }),
    ]);
    return toPaperDTO(deleted);
  }

  const store = readLocalStore();
  const target = store.papers.find((p) => p.id === paperId && p.userId === userId);
  if (!target) return null;

  store.papers = store.papers.filter((p) => !(p.id === paperId && p.userId === userId));
  store.chunks = store.chunks.filter((c) => !(c.paperId === paperId && c.userId === userId));
  store.analyses = store.analyses.filter((a) => !(a.paperId === paperId && a.userId === userId));
  store.conversations = store.conversations.filter(
    (c) => !(c.paperId === paperId && c.userId === userId)
  );
  store.generatedContent = store.generatedContent.filter(
    (g) => !(g.paperId === paperId && g.userId === userId)
  );
  store.projects = store.projects.map((proj) =>
    proj.userId === userId
      ? { ...proj, paperIds: proj.paperIds.filter((id) => id !== paperId) }
      : proj
  );
  writeLocalStore(store);
  const { extractedText: _, ...dto } = target;
  return dto;
}

export async function searchPaperChunks(userId, paperId, queryEmbedding, topK = 5) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return [];
    const objectPaperId = new mongoose.Types.ObjectId(paperId);
    const objectUserId = new mongoose.Types.ObjectId(userId);

    try {
      const results = await ChunkModel.aggregate([
        {
          $vectorSearch: {
            index: "vector_index",
            path: "embedding",
            queryVector: queryEmbedding,
            numCandidates: Math.max(topK * 10, 50),
            limit: topK,
            filter: { paperId: objectPaperId, userId: objectUserId },
          },
        },
        {
          $project: {
            _id: 0,
            chunkIndex: 1,
            pageEstimate: 1,
            content: 1,
            charStart: 1,
            charEnd: 1,
            score: { $meta: "vectorSearchScore" },
          },
        },
      ]);
      if (results.length > 0) return results;
    } catch {
      // Fallback to Mongoose cosine similarity
    }

    const chunks = await ChunkModel.find({
      paperId: objectPaperId,
      userId: objectUserId,
    }).lean();
    return chunks
      .map((c) => ({
        chunkIndex: c.chunkIndex,
        pageEstimate: c.pageEstimate || 1,
        content: c.content,
        charStart: c.charStart,
        charEnd: c.charEnd,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  const store = readLocalStore();
  return store.chunks
    .filter((c) => c.paperId === paperId && c.userId === userId)
    .map((c) => ({
      chunkIndex: c.chunkIndex,
      pageEstimate: c.pageEstimate || 1,
      content: c.content,
      charStart: c.charStart,
      charEnd: c.charEnd,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function listPaperChunks(userId, paperId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return [];
    const docs = await ChunkModel.find({
      paperId: new mongoose.Types.ObjectId(paperId),
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ chunkIndex: 1 })
      .lean();
    return docs.map((c) => ({
      id: String(c._id),
      chunkIndex: c.chunkIndex,
      pageEstimate: c.pageEstimate || 1,
      content: c.content,
      charStart: c.charStart,
      charEnd: c.charEnd,
    }));
  }

  const store = readLocalStore();
  return store.chunks
    .filter((c) => c.paperId === paperId && c.userId === userId)
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      pageEstimate: c.pageEstimate || 1,
      content: c.content,
      charStart: c.charStart,
      charEnd: c.charEnd,
    }));
}

export async function updatePaperChunksEmbeddings(userId, paperId, embeddings) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return;
    const objectPaperId = new mongoose.Types.ObjectId(paperId);
    const objectUserId = new mongoose.Types.ObjectId(userId);
    await Promise.all(
      embeddings.map((embedding, idx) =>
        ChunkModel.updateOne(
          { paperId: objectPaperId, userId: objectUserId, chunkIndex: idx },
          { $set: { embedding } }
        )
      )
    );
    await PaperModel.updateOne(
      { _id: objectPaperId, userId: objectUserId },
      { $set: { embeddingSource: "gemini" } }
    );
    return;
  }

  const store = readLocalStore();
  for (const chunk of store.chunks) {
    if (chunk.paperId === paperId && chunk.userId === userId) {
      const next = embeddings[chunk.chunkIndex];
      if (next) chunk.embedding = next;
    }
  }
  const pIdx = store.papers.findIndex((p) => p.id === paperId && p.userId === userId);
  if (pIdx !== -1) {
    store.papers[pIdx].embeddingSource = "gemini";
  }
  writeLocalStore(store);
}

export async function getPaperAnalysis(userId, paperId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return null;
    const doc = await PaperAnalysisModel.findOne({ userId, paperId }).lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      userId: String(doc.userId),
      paperId: String(doc.paperId),
      overview: doc.overview,
      problemStatement: doc.problemStatement,
      objectives: doc.objectives,
      methodology: doc.methodology,
      technologiesAndAlgorithms: doc.technologiesAndAlgorithms,
      datasetInfo: doc.datasetInfo,
      results: doc.results,
      advantages: doc.advantages,
      limitations: doc.limitations,
      futureScope: doc.futureScope,
      conclusion: doc.conclusion,
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }

  const store = readLocalStore();
  return store.analyses.find((a) => a.userId === userId && a.paperId === paperId) ?? null;
}

export async function savePaperAnalysis(userId, paperId, analysis) {
  if (isMongoConnected()) {
    const doc = await PaperAnalysisModel.findOneAndUpdate(
      { userId, paperId },
      { ...analysis, userId, paperId, createdAt: new Date() },
      { upsert: true, new: true }
    ).lean();
    return {
      id: String(doc._id),
      userId: String(doc.userId),
      paperId: String(doc.paperId),
      overview: doc.overview,
      problemStatement: doc.problemStatement,
      objectives: doc.objectives,
      methodology: doc.methodology,
      technologiesAndAlgorithms: doc.technologiesAndAlgorithms,
      datasetInfo: doc.datasetInfo,
      results: doc.results,
      advantages: doc.advantages,
      limitations: doc.limitations,
      futureScope: doc.futureScope,
      conclusion: doc.conclusion,
      createdAt: new Date(doc.createdAt).toISOString(),
    };
  }

  const store = readLocalStore();
  const record = {
    id: crypto.randomUUID(),
    userId,
    paperId,
    ...analysis,
    createdAt: new Date().toISOString(),
  };
  store.analyses = store.analyses.filter(
    (a) => !(a.userId === userId && a.paperId === paperId)
  );
  store.analyses.unshift(record);
  writeLocalStore(store);
  return record;
}

export async function countAnalysesByUser(userId) {
  if (isMongoConnected()) {
    return PaperAnalysisModel.countDocuments({ userId });
  }
  const store = readLocalStore();
  return store.analyses.filter((a) => a.userId === userId).length;
}

export async function listAnalyzedPaperIdsByUser(userId) {
  if (isMongoConnected()) {
    const docs = await PaperAnalysisModel.find({ userId }).select("paperId").lean();
    return docs.map((d) => String(d.paperId));
  }
  const store = readLocalStore();
  return store.analyses
    .filter((a) => a.userId === userId)
    .map((a) => String(a.paperId));
}

export async function listConversationsForPaper(userId, paperId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(paperId)) return [];
    const docs = await ConversationModel.find({ userId, paperId })
      .sort({ updatedAt: -1 })
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      userId: String(d.userId),
      paperId: String(d.paperId),
      title: d.title,
      messages: (d.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        createdAt: new Date(m.createdAt).toISOString(),
      })),
      createdAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
    }));
  }

  const store = readLocalStore();
  return store.conversations
    .filter((c) => c.userId === userId && c.paperId === paperId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getConversationById(userId, conversationId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return null;
    const d = await ConversationModel.findOne({ _id: conversationId, userId }).lean();
    if (!d) return null;
    return {
      id: String(d._id),
      userId: String(d.userId),
      paperId: String(d.paperId),
      title: d.title,
      messages: (d.messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        sources: m.sources,
        createdAt: new Date(m.createdAt).toISOString(),
      })),
      createdAt: new Date(d.createdAt).toISOString(),
      updatedAt: new Date(d.updatedAt).toISOString(),
    };
  }

  const store = readLocalStore();
  return (
    store.conversations.find((c) => c.id === conversationId && c.userId === userId) ?? null
  );
}

export async function upsertConversationMessages(params) {
  if (isMongoConnected()) {
    if (params.conversationId && mongoose.Types.ObjectId.isValid(params.conversationId)) {
      const updated = await ConversationModel.findOneAndUpdate(
        { _id: params.conversationId, userId: params.userId, paperId: params.paperId },
        {
          $push: { messages: { $each: params.newMessages } },
          $set: { updatedAt: new Date() },
        },
        { new: true }
      ).lean();
      if (updated) {
        return {
          id: String(updated._id),
          userId: String(updated.userId),
          paperId: String(updated.paperId),
          title: updated.title,
          messages: (updated.messages || []).map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            sources: m.sources,
            createdAt: new Date(m.createdAt).toISOString(),
          })),
          createdAt: new Date(updated.createdAt).toISOString(),
          updatedAt: new Date(updated.updatedAt).toISOString(),
        };
      }
    }

    const created = await ConversationModel.create({
      userId: params.userId,
      paperId: params.paperId,
      title: params.title,
      messages: params.newMessages,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return {
      id: String(created._id),
      userId: String(created.userId),
      paperId: String(created.paperId),
      title: created.title,
      messages: params.newMessages,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  const store = readLocalStore();
  if (params.conversationId) {
    const idx = store.conversations.findIndex(
      (c) =>
        c.id === params.conversationId &&
        c.userId === params.userId &&
        c.paperId === params.paperId
    );
    if (idx !== -1) {
      store.conversations[idx].messages.push(...params.newMessages);
      store.conversations[idx].updatedAt = new Date().toISOString();
      writeLocalStore(store);
      return store.conversations[idx];
    }
  }

  const conv = {
    id: crypto.randomUUID(),
    userId: params.userId,
    paperId: params.paperId,
    title: params.title,
    messages: params.newMessages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.conversations.unshift(conv);
  writeLocalStore(store);
  return conv;
}

export async function deleteConversation(userId, conversationId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) return false;
    const deleted = await ConversationModel.findOneAndDelete({
      _id: conversationId,
      userId,
    });
    return Boolean(deleted);
  }
  const store = readLocalStore();
  const before = store.conversations.length;
  store.conversations = store.conversations.filter(
    (c) => !(c.id === conversationId && c.userId === userId)
  );
  writeLocalStore(store);
  return store.conversations.length < before;
}

export async function createProject(params) {
  if (isMongoConnected()) {
    const doc = await ResearchProjectModel.create({
      userId: params.userId,
      projectName: params.projectName,
      description: params.description,
      paperIds: params.paperIds || [],
    });
    return {
      id: String(doc._id),
      userId: String(doc.userId),
      projectName: doc.projectName,
      description: doc.description,
      paperIds: doc.paperIds.map((id) => String(id)),
      createdAt: doc.createdAt.toISOString(),
    };
  }

  const store = readLocalStore();
  const project = {
    id: crypto.randomUUID(),
    userId: params.userId,
    projectName: params.projectName,
    description: params.description,
    paperIds: params.paperIds || [],
    createdAt: new Date().toISOString(),
  };
  store.projects.unshift(project);
  writeLocalStore(store);
  return project;
}

export async function listProjectsByUser(userId) {
  if (isMongoConnected()) {
    const docs = await ResearchProjectModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      userId: String(d.userId),
      projectName: d.projectName,
      description: d.description,
      paperIds: (d.paperIds || []).map((id) => String(id)),
      createdAt: new Date(d.createdAt).toISOString(),
    }));
  }

  const store = readLocalStore();
  return store.projects.filter((p) => p.userId === userId);
}

export async function getProjectById(userId, projectId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
    const d = await ResearchProjectModel.findOne({ _id: projectId, userId }).lean();
    if (!d) return null;
    return {
      id: String(d._id),
      userId: String(d.userId),
      projectName: d.projectName,
      description: d.description,
      paperIds: (d.paperIds || []).map((id) => String(id)),
      createdAt: new Date(d.createdAt).toISOString(),
    };
  }

  const store = readLocalStore();
  return store.projects.find((p) => p.id === projectId && p.userId === userId) ?? null;
}

export async function updateProject(userId, projectId, patch) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
    const d = await ResearchProjectModel.findOneAndUpdate(
      { _id: projectId, userId },
      patch,
      { new: true }
    ).lean();
    if (!d) return null;
    return {
      id: String(d._id),
      userId: String(d.userId),
      projectName: d.projectName,
      description: d.description,
      paperIds: (d.paperIds || []).map((id) => String(id)),
      createdAt: new Date(d.createdAt).toISOString(),
    };
  }

  const store = readLocalStore();
  const idx = store.projects.findIndex((p) => p.id === projectId && p.userId === userId);
  if (idx === -1) return null;
  Object.assign(store.projects[idx], patch);
  writeLocalStore(store);
  return store.projects[idx];
}

export async function deleteProject(userId, projectId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) return false;
    const deleted = await ResearchProjectModel.findOneAndDelete({
      _id: projectId,
      userId,
    });
    return Boolean(deleted);
  }
  const store = readLocalStore();
  const before = store.projects.length;
  store.projects = store.projects.filter(
    (p) => !(p.id === projectId && p.userId === userId)
  );
  writeLocalStore(store);
  return store.projects.length < before;
}

export async function saveExternalPaper(userId, paperMetadata, source) {
  if (isMongoConnected()) {
    const doc = await SavedPaperModel.create({
      userId,
      paperMetadata,
      source,
    });
    return {
      id: String(doc._id),
      userId: String(doc.userId),
      paperMetadata: doc.paperMetadata,
      source: doc.source,
      savedAt: doc.savedAt.toISOString(),
    };
  }

  const store = readLocalStore();
  const existing = store.savedPapers.find(
    (s) =>
      s.userId === userId &&
      s.paperMetadata.externalId === paperMetadata.externalId
  );
  if (existing) return existing;

  const saved = {
    id: crypto.randomUUID(),
    userId,
    paperMetadata,
    source,
    savedAt: new Date().toISOString(),
  };
  store.savedPapers.unshift(saved);
  writeLocalStore(store);
  return saved;
}

export async function listSavedPapers(userId) {
  if (isMongoConnected()) {
    const docs = await SavedPaperModel.find({ userId }).sort({ savedAt: -1 }).lean();
    return docs.map((d) => ({
      id: String(d._id),
      userId: String(d.userId),
      paperMetadata: d.paperMetadata,
      source: d.source,
      savedAt: new Date(d.savedAt).toISOString(),
    }));
  }

  const store = readLocalStore();
  return store.savedPapers.filter((s) => s.userId === userId);
}

export async function deleteSavedPaper(userId, savedId) {
  if (isMongoConnected()) {
    if (!mongoose.Types.ObjectId.isValid(savedId)) return false;
    const deleted = await SavedPaperModel.findOneAndDelete({
      _id: savedId,
      userId,
    });
    return Boolean(deleted);
  }
  const store = readLocalStore();
  const before = store.savedPapers.length;
  store.savedPapers = store.savedPapers.filter(
    (s) => !(s.id === savedId && s.userId === userId)
  );
  writeLocalStore(store);
  return store.savedPapers.length < before;
}

export async function saveGeneratedContent(params) {
  if (isMongoConnected()) {
    const doc = await GeneratedContentModel.create({
      userId: params.userId,
      paperId: params.paperId,
      contentType: params.contentType,
      content: params.content,
    });
    return {
      id: String(doc._id),
      userId: String(doc.userId),
      paperId: doc.paperId ? String(doc.paperId) : null,
      contentType: doc.contentType,
      content: doc.content,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  const store = readLocalStore();
  const entry = {
    id: crypto.randomUUID(),
    userId: params.userId,
    paperId: params.paperId,
    contentType: params.contentType,
    content: params.content,
    createdAt: new Date().toISOString(),
  };
  store.generatedContent.unshift(entry);
  writeLocalStore(store);
  return entry;
}

export async function listGeneratedContent(userId, paperId, contentType) {
  if (isMongoConnected()) {
    const filter = { userId };
    if (paperId && mongoose.Types.ObjectId.isValid(paperId)) filter.paperId = paperId;
    if (contentType) filter.contentType = contentType;
    const docs = await GeneratedContentModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return docs.map((d) => ({
      id: String(d._id),
      userId: String(d.userId),
      paperId: d.paperId ? String(d.paperId) : null,
      contentType: d.contentType,
      content: d.content,
      createdAt: new Date(d.createdAt).toISOString(),
    }));
  }

  const store = readLocalStore();
  return store.generatedContent
    .filter((g) => {
      if (g.userId !== userId) return false;
      if (paperId && g.paperId !== paperId) return false;
      if (contentType && g.contentType !== contentType) return false;
      return true;
    })
    .slice(0, 50);
}
