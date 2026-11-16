import mongoose, { Schema } from "mongoose";

const PaperSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  pageCount: { type: Number, required: true, min: 1 },
  chunkCount: { type: Number, required: true, default: 0 },
  fileUrl: { type: String, default: "" },
  extractedText: { type: String, required: true },
  authors: { type: [String], default: [] },
  abstract: { type: String, default: "" },
  keywords: { type: [String], default: [] },
  publicationYear: { type: String, default: "" },
  isBookmarked: { type: Boolean, default: false },
  projectIds: { type: [Schema.Types.ObjectId], ref: "ResearchProject", default: [] },
  uploadDate: { type: Date, default: Date.now, index: true },
  embeddingSource: {
    type: String,
    enum: ["gemini", "local"],
    default: "gemini",
  },
  processingStatus: {
    type: String,
    enum: ["processing", "completed", "failed"],
    default: "completed",
  },
});

PaperSchema.index({ userId: 1, uploadDate: -1 });

export const PaperModel =
  mongoose.models.ResearchPaper || mongoose.model("ResearchPaper", PaperSchema);
