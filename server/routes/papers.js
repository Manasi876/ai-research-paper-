import { Router } from "express";
import multer from "multer";
import {
  deletePaper,
  getPaper,
  listPapers,
  uploadPaper,
} from "../controllers/paperController.js";
import { requireAuth } from "../middleware/auth.js";
import { PdfValidationError } from "../services/chunker.js";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdfMime && !isPdfExt) {
      cb(
        new PdfValidationError(
          "Invalid file type. Only PDF files (.pdf) are accepted.",
          400
        )
      );
      return;
    }
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);

router.get("/", listPapers);
router.get("/:id", getPaper);
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
  uploadPaper
);
router.delete("/:id", deletePaper);

export default router;
