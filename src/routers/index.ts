"use strict"
import { Router } from "express";
import { verifyToken } from "../helper";
import authRouter from "./auth";
import userRouter from "./user";
import batchRouter from "./batch";
import groupRouter from "./group";
import programRouter from "./program";
import attendanceRouter from "./attendance";
import anubhutiRouter from "./anubhuti";
import deleteRequestRouter from "./deleteRequest";
import familyRouter from "./family";
import feedbackRouter from "./feedback";
import legalityRouter from "./legality";
import lifeLightRouter from "./lifeLight";
import uploadRouter from "./upload";
import settingRouter from "./setting";
import tithiCalenderRouter from "./tithiCalender";
import bannerRouter from "./banner";
import locationRouter from "./location";
import branchRouter from "./branch";


const router = Router();

// with out Token
router.use("/auth", authRouter);
router.use("/upload", uploadRouter);
router.use("/location", locationRouter);
router.use("/branch", branchRouter);


// with Token
router.use(verifyToken);
router.use("/user", userRouter);
router.use("/batch", batchRouter);
router.use("/group", groupRouter);
router.use("/program", programRouter);
router.use("/attendance", attendanceRouter);
router.use("/anubhuti", anubhutiRouter);
router.use("/deleteRequest", deleteRequestRouter);
router.use("/family", familyRouter);
router.use("/feedback", feedbackRouter);
router.use("/legality", legalityRouter);
router.use("/lifeLight", lifeLightRouter);
router.use("/setting", settingRouter);
router.use("/tithiCalender", tithiCalenderRouter);
router.use("/banner", bannerRouter);


export { router };