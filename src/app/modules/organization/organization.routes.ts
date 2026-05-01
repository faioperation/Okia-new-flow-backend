import { Router } from "express";
import { organizationControllers } from "./organization.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/create-organization", auth("ADMIN"), organizationControllers.createOrganization);
router.get("/", auth("ADMIN"), organizationControllers.getAllOrganizations);
router.get("/:id", auth("ADMIN"), organizationControllers.getSingleOrganization);
router.patch("/:id", auth("ADMIN"), organizationControllers.updateOrganization);
router.delete("/delete-all", auth("ADMIN"), organizationControllers.deleteAllOrganizations);
router.delete("/:id", auth("ADMIN"), organizationControllers.deleteOrganization);

export const organizationRoutes = router;
