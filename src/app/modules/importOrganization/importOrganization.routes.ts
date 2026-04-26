import { Router } from "express";
import { importOrganizationControllers } from "./importOrganization.controller";
import { excelUploader } from "../../utils/excelUploader";
import auth from "../../middlewares/checkAuth";

const router = Router();

// Excel upload and parsing (Saves to database under the logged user)
router.post(
  "/upload",
  auth(),
  excelUploader.array("files", 100),
  importOrganizationControllers.uploadExcelFiles
);

// Fetch all uploaded information for the logged user
router.get("/all", auth(), importOrganizationControllers.getAllImports);



export const importOrganizationRoutes = router;
