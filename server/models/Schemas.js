import mongoose, { Schema } from "mongoose";

const PaperAnalysisSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  paperId: { type: Schema.Types.ObjectId, ref: "ResearchPaper", required: true, index: true },
  overview: { type: String, required: true },
  problemStatement: { type: String, required: true },
  objectives: { type: String, required: true },
  methodology: { type: String, required: true },
  technologiesAndAlgorithms: { type: String, required: true },
  datasetInfo: { type: String, required: true },
  results: { type: String, required: true },
  advantages: { type: String, required: true },
  limitations: { type: String, required: true },
  futureScope: { type: String, required: true },
  conclusion: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const PaperAnalysisModel =
  mongoose.models.PaperAnalysis || mongoose.model("PaperAnalysis", PaperAnalysisSchema);

const ConversationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  paperId: { type: Schema.Types.ObjectId, ref: "ResearchPaper", required: true, index: true },
  title: { type: String, required: true },
  messages: {
    type: [
      {
        id: String,
        role: { type: String, enum: ["user", "assistant"] },
        content: String,
        sources: { type: Schema.Types.Mixed, default: undefined },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const ConversationModel =
  mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);

const ResearchProjectSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  projectName: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  paperIds: { type: [Schema.Types.ObjectId], ref: "ResearchPaper", default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const ResearchProjectModel =
  mongoose.models.ResearchProject || mongoose.model("ResearchProject", ResearchProjectSchema);

const SavedPaperSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  paperMetadata: { type: Schema.Types.Mixed, required: true },
  source: { type: String, enum: ["semantic_scholar", "crossref"], required: true },
  savedAt: { type: Date, default: Date.now },
});

export const SavedPaperModel =
  mongoose.models.SavedPaper || mongoose.model("SavedPaper", SavedPaperSchema);

const GeneratedContentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  paperId: { type: Schema.Types.ObjectId, ref: "ResearchPaper", default: null, index: true },
  contentType: { type: String, required: true },
  content: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const GeneratedContentModel =
  mongoose.models.GeneratedContent || mongoose.model("GeneratedContent", GeneratedContentSchema);

const ActivityLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  action: { type: String, required: true },
  targetTitle: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ActivityLogModel =
  mongoose.models.ActivityLog || mongoose.model("ActivityLog", ActivityLogSchema);
