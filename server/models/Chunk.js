import mongoose, { Schema } from "mongoose";

const ChunkSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  paperId: {
    type: Schema.Types.ObjectId,
    ref: "ResearchPaper",
    required: true,
    index: true,
  },
  chunkIndex: { type: Number, required: true },
  pageEstimate: { type: Number, required: true, default: 1 },
  content: { type: String, required: true },
  charStart: { type: Number, required: true },
  charEnd: { type: Number, required: true },
  embedding: { type: [Number], required: true },
});

ChunkSchema.index({ userId: 1, paperId: 1, chunkIndex: 1 });

export const ChunkModel = mongoose.models.Chunk || mongoose.model("Chunk", ChunkSchema);
