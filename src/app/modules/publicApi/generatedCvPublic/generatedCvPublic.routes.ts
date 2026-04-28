import { Router } from "express";
import { generatedCvPublicControllers } from "./generatedCvPublic.controller";
import checkBackendHeader from "../../../middlewares/checkBackendHeader";

const router = Router();

router.get(
  "/all",
  checkBackendHeader,
  generatedCvPublicControllers.getAllGeneratedCvs
);

router.get(
  "/:id",
  checkBackendHeader,
  generatedCvPublicControllers.getGeneratedCvById
);

export const generatedCvPublicRoutes = router;
