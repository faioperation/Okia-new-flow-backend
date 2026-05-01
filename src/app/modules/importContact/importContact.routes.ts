import { Router } from "express";
import { importContactControllers } from "./importContact.controller";
import auth from "../../middlewares/checkAuth";
import { excelUploader } from "../../utils/excelUploader";

const router = Router();

router.post(
  "/upload",
  auth("ADMIN"),
  excelUploader.array("files"),
  importContactControllers.processExcelFiles
);

router.get("/filters", auth("ADMIN"), importContactControllers.getFilters);
router.get("/all", auth("ADMIN"), importContactControllers.getAllImports);
router.get("/:id", auth("ADMIN"), importContactControllers.getImportById);
router.patch("/:id", auth("ADMIN"), importContactControllers.updateImport);
router.delete("/delete-all", auth("ADMIN"), importContactControllers.deleteAllImports);
router.delete("/:id", auth("ADMIN"), importContactControllers.deleteImport);

export const importContactRoutes = router;
