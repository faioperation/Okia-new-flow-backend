import { Router } from "express";
import { qualityCheckControllers } from "./qualityCheck.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/", auth("ADMIN"), qualityCheckControllers.createQualityCheck);
router.get("/all", auth("ADMIN"), qualityCheckControllers.getAllQualityChecks);
router.get("/:id", auth("ADMIN"), qualityCheckControllers.getQualityCheckById);
router.patch("/:id", auth("ADMIN"), qualityCheckControllers.updateQualityCheck);
router.delete("/:id", auth("ADMIN"), qualityCheckControllers.deleteQualityCheck);


export const qualityCheckRoutes = router;
