import { Router } from "express";
import { importOrganizationControllers } from "./importOrganization.controller";
import { excelUploader } from "../../utils/excelUploader";
import auth from "../../middlewares/checkAuth";

const router = Router();

// Excel upload and parsing (Saves to database under the logged user)
router.post(
  "/upload",
  auth("ADMIN"),
  excelUploader.array("files", 100),
  importOrganizationControllers.uploadExcelFiles
);

// Fetch all uploaded information for the logged user
router.get("/filters", auth("ADMIN"), importOrganizationControllers.getFilters);
router.get('/all', auth('ADMIN'), importOrganizationControllers.getAllImports);
router.get('/:id', auth('ADMIN'), importOrganizationControllers.getImportById);

router.patch('/:id', auth('ADMIN'), importOrganizationControllers.updateImport);
router.delete("/delete-all", auth("ADMIN"), importOrganizationControllers.deleteAllImports);
router.delete('/:id', auth('ADMIN'), importOrganizationControllers.deleteImport);

export const importOrganizationRoutes = router;
