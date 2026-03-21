import express from "express";
import { branchController } from "../controllers";
import { roleCheck, verifyToken } from "../helper";
import { ROLES } from "../common";

const router = express.Router();

router.get("/get", branchController.getBranches);
router.get("/dropdown", branchController.getBranchesDropdown);
router.get("/get/:id", branchController.getBranchById);

router.use(verifyToken);
router.post("/add", roleCheck([ROLES.ADMIN]), branchController.addBranch);
router.put("/update", roleCheck([ROLES.ADMIN]), branchController.updateBranch);
router.delete("/delete/:id", roleCheck([ROLES.ADMIN]), branchController.deleteBranch);

export default router;
