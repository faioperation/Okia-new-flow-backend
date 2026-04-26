import { Router } from "express";
import { userControllers } from "./user.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.get("/profile", auth("ADMIN"), userControllers.getProfile);
router.post("/change-password", auth("ADMIN"), userControllers.changePassword);

export const userRoutes = router;
