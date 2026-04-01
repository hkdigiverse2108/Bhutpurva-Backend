import express from "express";
import { userController } from "../controllers";

const router = express.Router();

router.get("/get", userController.getAllUsers);
router.get("/dropdown", userController.getUsersDropdown);
router.get("/search", userController.searchUserByPhone);
router.put("/update", userController.updateUser);
router.put("/update-image", userController.updateImage);
router.delete("/delete", userController.deleteUser);
router.get("/get/:id", userController.getUserById);

export default router;