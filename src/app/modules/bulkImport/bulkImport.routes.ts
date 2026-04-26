import { Router } from "express";
import { bulkImportControllers } from "./bulkImport.controller";
import auth from "../../middlewares/checkAuth";
import { cvUploader } from "../../utils/bulk-import-utils/fileUploader";

const router = Router();

// Upload
router.post(
  "/cv",
  auth("ADMIN"),
  cvUploader.array("files", 100),
  bulkImportControllers.uploadCvs
);

// Monitoring
router.get("/batches", auth("ADMIN"), bulkImportControllers.getBatches);
router.get("/batch/:id", auth("ADMIN"), bulkImportControllers.getBatchById);
router.get("/batch/:id/failures", auth("ADMIN"), bulkImportControllers.getBatchFailures);
router.get("/all-candidates", auth("ADMIN"), bulkImportControllers.getAllCandidates);
router.get("/candidate/:id", auth("ADMIN"), bulkImportControllers.getCandidateById);

export const bulkImportRoutes = router;
