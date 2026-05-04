import { Router } from "express";
import { userControllers } from "./user.controller";
import auth from "../../middlewares/checkAuth";
import { imageUploader } from "../../utils/imageUploader";

const router = Router();

router.get("/profile", auth("ADMIN"), userControllers.getProfile);
router.patch(
  "/update-profile",
  auth("ADMIN"),
  imageUploader.single("profilePicture"),
  userControllers.updateProfile
);
router.post("/change-password", auth("ADMIN"), userControllers.changePassword);

export const userRoutes = router;
