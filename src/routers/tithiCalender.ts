import { Router } from "express";
import { tithiCalenderController } from "../controllers";
import { roleCheck } from "../helper";
import { ROLES } from "../common";

const router = Router();

router.post("/add-update", roleCheck([ROLES.ADMIN]), tithiCalenderController.addUpdateTithiCalender);
router.post("/add-update-month", roleCheck([ROLES.ADMIN]), tithiCalenderController.addUpdateMonth);
router.get("/", roleCheck([ROLES.ADMIN, ROLES.USER, ROLES.MONITOR, ROLES.LEADER]), tithiCalenderController.getTithiCalender);

export = router;
