import express from "express";
import { surveyController } from "../controllers";
import { roleCheck } from "../helper";
import { ROLES } from "../common";

const router = express.Router();

// Admin only
router.post("/create", roleCheck([ROLES.ADMIN]), surveyController.createSurvey);
router.put("/update", roleCheck([ROLES.ADMIN]), surveyController.updateSurvey);
router.delete("/delete/:id", roleCheck([ROLES.ADMIN]), surveyController.deleteSurvey);

// All authenticated users (user gets auto-scoped; admin/monitor/leader can filter)
router.get("/get", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER, ROLES.USER]), surveyController.getSurveys);
router.get("/get/:id", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER, ROLES.USER]), surveyController.getSurveyById);

// Response submission (any authenticated user)
router.post("/response", roleCheck([ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER, ROLES.USER]), surveyController.submitSurveyResponse);

// Admin views responses
router.get("/responses", roleCheck([ROLES.ADMIN]), surveyController.getSurveyResponses);
router.get("/response/:id", roleCheck([ROLES.ADMIN]), surveyController.getSurveyResponseById);

export default router;
