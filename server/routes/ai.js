import { Router } from "express";
import {
  analyzePaper,
  chatWithPaper,
  getAnalysis,
  listConversations,
  removeConversation,
  summarizePaper,
} from "../controllers/aiController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/analyze/:paperId", getAnalysis);
router.post("/analyze/:paperId", analyzePaper);
router.post("/summarize/:paperId", summarizePaper);
router.get("/chat/:paperId", listConversations);
router.post("/chat/:paperId", chatWithPaper);
router.delete("/chat/:paperId/:conversationId", removeConversation);

export default router;
