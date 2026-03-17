import express from "express";
import { groupController } from "../controllers";
import { roleCheck } from "../helper";
import { ROLES } from "../common";

const router = express.Router();

router.post("/create", roleCheck([ROLES.ADMIN]), groupController.creategroup);
router.get("/get", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER]), groupController.getGroups);
router.get("/dropdown", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER]), groupController.getGroupsDropdown);
router.get("/get/:id", roleCheck([ROLES.ADMIN, ROLES.LEADER]), groupController.getGroupById);
router.put("/update", roleCheck([ROLES.ADMIN]), groupController.updateGroup);
router.delete("/delete/:id", roleCheck([ROLES.ADMIN]), groupController.deleteGroup);

export default router;