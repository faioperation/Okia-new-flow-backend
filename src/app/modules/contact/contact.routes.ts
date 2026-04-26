import { Router } from "express";
import { contactControllers } from "./contact.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/create-contact", auth("ADMIN"), contactControllers.createContact);
router.get("/", auth("ADMIN"), contactControllers.getAllContacts);
router.get("/:id", auth("ADMIN"), contactControllers.getSingleContact);
router.patch("/:id", auth("ADMIN"), contactControllers.updateContact);
router.delete("/:id", auth("ADMIN"), contactControllers.deleteContact);

export const contactRoutes = router;
