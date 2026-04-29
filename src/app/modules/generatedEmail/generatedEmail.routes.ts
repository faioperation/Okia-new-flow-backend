import { Router } from "express";
import { generatedEmailControllers } from "./generatedEmail.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/generate", auth(), generatedEmailControllers.createGeneratedEmail);
router.get("/all", auth(), generatedEmailControllers.getAllGeneratedEmails);

// Move static routes BEFORE parameterized routes to avoid matching conflicts
router.get("/sent-logs", auth(), generatedEmailControllers.getAllSentEmailLogs);
router.get("/sent-logs/:id", auth(), generatedEmailControllers.getSentEmailLogs);

router.get("/:id", auth(), generatedEmailControllers.getGeneratedEmailById);
router.patch("/:id", auth(), generatedEmailControllers.updateGeneratedEmail);
router.delete("/:id", auth(), generatedEmailControllers.deleteGeneratedEmail);
router.post("/send/:id", auth(), generatedEmailControllers.sendGeneratedEmail);

export const generatedEmailRoutes = router;
