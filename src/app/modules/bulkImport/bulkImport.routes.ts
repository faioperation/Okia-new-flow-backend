import { Router } from "express";
import { bulkImportControllers } from "./bulkImport.controller";
import auth from "../../middlewares/checkAuth";
import { cvUploader } from "../../utils/bulk-import-utils/fileUploader";

const router = Router();

// Upload
router.post(
  "/cv",
  auth(),
  cvUploader.array("files", 100),
  bulkImportControllers.uploadCvs
);

// Monitoring
router.get("/batches", auth(), bulkImportControllers.getBatches);
router.get("/batch/:id", auth(), bulkImportControllers.getBatchById);
router.get("/batch/:id/failures", auth(), bulkImportControllers.getBatchFailures);

export const bulkImportRoutes = router;
