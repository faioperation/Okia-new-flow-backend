import { Router } from "express";
import { bulkOutreachLogControllers } from "./bulkOutreachLog.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.get("/", auth("ADMIN"), bulkOutreachLogControllers.getAllOutreachLogs);
router.get("/batch/:batchId", auth("ADMIN"), bulkOutreachLogControllers.getOutreachLogsByBatch);

export const bulkOutreachLogRoutes = router;
