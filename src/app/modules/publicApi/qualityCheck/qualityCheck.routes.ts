import { Router } from "express";
import checkBackendHeader from "../../../middlewares/checkBackendHeader";
import { qualityCheckPublicControllers } from "./qualityCheck.controller";

const router = Router();

router.get(
  "/all",
  checkBackendHeader,
  qualityCheckPublicControllers.getAllQualityChecks
);

router.get(
  "/:id",
  checkBackendHeader,
  qualityCheckPublicControllers.getQualityCheckById
);

export const qualityCheckPublicRoutes = router;
