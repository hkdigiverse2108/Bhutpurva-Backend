import express from "express";
import { attendanceController } from "../controllers";
import { roleCheck } from "../helper";
import { ROLES } from "../common";

const router = express.Router();

router.get("/get", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER]), attendanceController.getAttendance);
router.get("/user/:id", attendanceController.getUserAttendance);
router.put("/update", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER]), attendanceController.updateAttendance);
router.get("/program/:id", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER]), attendanceController.getAttendanceByProgramId);
router.get("/:id", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER]), attendanceController.getAttendanceById);

export default router;