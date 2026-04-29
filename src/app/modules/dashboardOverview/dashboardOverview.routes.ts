import { Router } from "express";
import { dashboardOverviewControllers } from "./dashboardOverview.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.get("/stats", auth("ADMIN"), dashboardOverviewControllers.getStats);

export const dashboardOverviewRoutes = router;
