import joi from "joi";
import { objectId } from "../common";

const studentItemsSchema = joi.object({
    studentId: objectId().required(),
    isPresent: joi.boolean().required().allow(null),
});

export const getAttendanceSchema = joi.object({
    page: joi.number().optional().default(1),
    limit: joi.number().optional(),
    startDateFilter: joi.string().optional(),
    endDateFilter: joi.string().optional(),
    programFilter: objectId().optional(),
});

export const updateAttendanceSchema = joi.object({
    attendanceId: objectId().required(),
    students: joi.array().items(studentItemsSchema).required(),
});