import express from "express";
import { protect, allow } from "../middleware/auth.js";
import { getAllCertificates, getMyCertificates, createCertificate, deleteCertificate } from "../controllers/certificateController.js";

const router = express.Router();

router.get("/",          protect, allow("superadmin"), getAllCertificates);
router.post("/",         protect, allow("superadmin"), createCertificate);
router.delete("/:id",    protect, allow("superadmin"), deleteCertificate);
router.get("/mine",      protect, allow("student"),    getMyCertificates);

export default router;
