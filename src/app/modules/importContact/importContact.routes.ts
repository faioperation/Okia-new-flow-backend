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

router.get("/all", auth("ADMIN"), importContactControllers.getAllImports);
router.delete("/delete-all", auth("ADMIN"), importContactControllers.deleteAllImports);
router.delete("/:id", auth("ADMIN"), importContactControllers.deleteImport);

export const importContactRoutes = router;
