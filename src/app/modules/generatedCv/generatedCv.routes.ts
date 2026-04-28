import { Router } from "express";
import { generatedCvControllers } from "./generatedCv.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/create", auth("ADMIN"), generatedCvControllers.createGeneratedCv);
router.get("/all", auth("ADMIN"), generatedCvControllers.getAllGeneratedCvs);
router.patch("/generate-pdf/:id", auth("ADMIN"), generatedCvControllers.generatePdf);
router.get("/download-pdf/:id", auth("ADMIN"), generatedCvControllers.downloadPdf);
router.get("/:id", auth("ADMIN"), generatedCvControllers.getGeneratedCvById);
router.patch("/:id", auth("ADMIN"), generatedCvControllers.updateGeneratedCv);
router.delete("/delete-all", auth("ADMIN"), generatedCvControllers.deleteAllGeneratedCvs);
router.delete("/:id", auth("ADMIN"), generatedCvControllers.deleteGeneratedCv);

export const generatedCvRoutes = router;
