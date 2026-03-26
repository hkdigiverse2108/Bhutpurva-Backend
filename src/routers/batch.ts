import express from "express";
import { batchController } from "../controllers";
import { roleCheck } from "../helper";
import { ROLES } from "../common";

const router = express.Router();

router.post("/create", roleCheck([ROLES.ADMIN]), batchController.createBatch);
router.get("/get", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER, ROLES.USER]), batchController.getBatches);
router.get("/dropdown", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER, ROLES.USER]), batchController.getBatchesDropdown);
router.put("/update", roleCheck([ROLES.ADMIN]), batchController.updateBatch);
router.delete("/delete/:id", roleCheck([ROLES.ADMIN]), batchController.deleteBatch);
router.get("/get/:id", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER, ROLES.USER]), batchController.getBatchById);
router.get("/group/:id", roleCheck([ROLES.ADMIN, ROLES.LEADER]), batchController.getBatchesByGroupId);
router.get("/monitor/:id", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER, ROLES.USER]), batchController.getBatchesByMonitorId);
router.post("/add-devotee", roleCheck([ROLES.ADMIN]), batchController.addDevoteeToBatch);
router.post("/remove-devotee", roleCheck([ROLES.ADMIN]), batchController.removeDevoteeFromBatch);
router.post("/add-monitor", roleCheck([ROLES.ADMIN]), batchController.createMonitor);
router.post("/remove-monitor", roleCheck([ROLES.ADMIN]), batchController.removeMonitor);
router.post("/assign-devotee", roleCheck([ROLES.ADMIN]), batchController.assignDevotee);
router.post("/unassign-devotee", roleCheck([ROLES.ADMIN]), batchController.unassignDevotee);
router.get("/get-monitors", roleCheck([ROLES.ADMIN]), batchController.getMonitors);
router.get("/get-monitor/:id", roleCheck([ROLES.ADMIN]), batchController.getMonitorById);

export default router;
