import { Router } from "express";
import multer from "multer";
import { env } from "../config/env";
import { badRequest } from "../utils/errors";
import * as batch from "../controllers/batch.controller";
import * as farmer from "../controllers/farmer.controller";

/** Photos are held in memory only — they are forwarded to the AI service, not stored. */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(badRequest("Please upload a photo (JPG, PNG or WebP)."));
      return;
    }
    cb(null, true);
  },
});

export const router = Router();

// ---- batches -------------------------------------------------------------
router.post("/register-batch", upload.single("photo"), batch.postRegisterBatch);
router.get("/get-batches", batch.getBatches);
router.get("/batches", batch.getBatches); // alias — reads better in a REST client
router.get("/batches/stats", batch.getStats);
router.get("/batches/crop-types", batch.getCropTypes);
router.get("/batches/:id", batch.getBatchById);
router.post("/update-status", batch.patchUpdateStatus);
router.patch("/batches/:batchId/status", batch.patchUpdateStatus);
router.post("/batches/:batchId/assess", upload.single("photo"), batch.postAssessQuality);

// ---- farmers -------------------------------------------------------------
router.put("/farmers", farmer.putFarmer);
router.post("/farmers", farmer.putFarmer);
router.get("/farmers/:wallet", farmer.getFarmer);
router.get("/farmers/:wallet/wallet", farmer.getWallet);
router.get("/farmers/:wallet/trace-map", farmer.getTraceMap);
