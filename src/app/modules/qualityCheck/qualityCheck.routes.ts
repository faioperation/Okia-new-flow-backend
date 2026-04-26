import { Router } from "express";
import { qualityCheckControllers } from "./qualityCheck.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/", auth(), qualityCheckControllers.createQualityCheck);
router.get("/all", auth(), qualityCheckControllers.getAllQualityChecks);
router.get("/:id", auth(), qualityCheckControllers.getQualityCheckById);
router.delete("/:id", auth(), qualityCheckControllers.deleteQualityCheck);


export const qualityCheckRoutes = router;
