import { Router } from "express";
import { candidateControllers } from "./candidate.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/create-candidate", auth(), candidateControllers.createCandidate);
router.get("/", auth(), candidateControllers.getAllCandidates);
router.get("/:id", auth(), candidateControllers.getSingleCandidate);
router.patch("/:id", auth(), candidateControllers.updateCandidate);
router.delete("/:id", auth(), candidateControllers.deleteCandidate);

export const candidateRoutes = router;
