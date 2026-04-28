import { Router } from "express";
import { bulkCVRoutes } from "./bulkCV/bulkCV.routes";
import { qualityCheckPublicRoutes } from "./qualityCheck/qualityCheck.routes";
import { generatedCvPublicRoutes } from "./generatedCvPublic/generatedCvPublic.routes";

const router = Router();

router.use("/", bulkCVRoutes);
router.use("/quality-check", qualityCheckPublicRoutes);
router.use("/generated-cv", generatedCvPublicRoutes);

export const publicRoutes = router;
