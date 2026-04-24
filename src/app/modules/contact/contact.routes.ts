import { Router } from "express";
import { contactControllers } from "./contact.controller";
import auth from "../../middlewares/checkAuth";

const router = Router();

router.post("/create-contact", auth(), contactControllers.createContact);
router.get("/", auth(), contactControllers.getAllContacts);
router.get("/:id", auth(), contactControllers.getSingleContact);
router.patch("/:id", auth(), contactControllers.updateContact);
router.delete("/:id", auth(), contactControllers.deleteContact);

export const contactRoutes = router;
