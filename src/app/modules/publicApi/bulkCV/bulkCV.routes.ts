import { Router } from "express";
import { bulkCVControllers } from "./bulkCV.controller";
import checkBackendHeader from "../../../middlewares/checkBackendHeader";

const router = Router();

router.get(
  "/bulk-import/all-candidates",
  checkBackendHeader,
  bulkCVControllers.getAllCandidates
);


export const bulkCVRoutes = router;
