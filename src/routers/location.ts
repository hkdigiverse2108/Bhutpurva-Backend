import express from "express";
import { locationController } from "../controllers";
import { roleCheck, verifyToken } from "../helper";
import { ROLES } from "../common";

const router = express.Router();

router.get("/get", locationController.getLocations);
router.get("/dropdown", locationController.getLocationsDropdown);
router.get("/get/:id", locationController.getLocationById);
router.use(verifyToken);
router.post("/add", roleCheck([ROLES.ADMIN]), locationController.addLocation);
router.put("/update", roleCheck([ROLES.ADMIN]), locationController.updateLocation);
router.delete("/delete/:id", roleCheck([ROLES.ADMIN]), locationController.deleteLocation);


export default router;
