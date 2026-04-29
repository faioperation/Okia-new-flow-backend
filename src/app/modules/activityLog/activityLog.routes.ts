import { Router } from "express";
import { activityLogControllers } from "./activityLog.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.get("/all", auth("ADMIN"), activityLogControllers.getAllLogs);

export const activityLogRoutes = router;
