import { Router } from "express";
import { candidateControllers } from "./candidate.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/create-candidate", auth("ADMIN"), candidateControllers.createCandidate);
router.get("/", auth("ADMIN"), candidateControllers.getAllCandidates);
router.get("/:id", auth("ADMIN"), candidateControllers.getSingleCandidate);
router.patch("/:id", auth("ADMIN"), candidateControllers.updateCandidate);
router.delete("/:id", auth("ADMIN"), candidateControllers.deleteCandidate);

export const candidateRoutes = router;
