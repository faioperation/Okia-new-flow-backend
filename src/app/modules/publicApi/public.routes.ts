import { Router } from "express";
import { bulkCVRoutes } from "./bulkCV/bulkCV.routes";
import { qualityCheckPublicRoutes } from "./qualityCheck/qualityCheck.routes";

const router = Router();

router.use("/", bulkCVRoutes);
router.use("/quality-check", qualityCheckPublicRoutes);

export const publicRoutes = router;
