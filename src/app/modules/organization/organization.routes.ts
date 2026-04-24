import { Router } from "express";
import { organizationControllers } from "./organization.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/create-organization", auth(), organizationControllers.createOrganization);
router.get("/", auth(), organizationControllers.getAllOrganizations);
router.get("/:id", auth(), organizationControllers.getSingleOrganization);
router.patch("/:id", auth(), organizationControllers.updateOrganization);
router.delete("/:id", auth(), organizationControllers.deleteOrganization);

export const organizationRoutes = router;
