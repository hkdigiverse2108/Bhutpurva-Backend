import joi from "joi";
import { objectId } from "../common";

export const feedbackSchema = joi.object({
    userId: objectId().required(),
    feedback: joi.string().required(),
});

export const getFeedbackSchema = joi.object({
    page: joi.number().optional().default(1),
    limit: joi.number().optional(),
    userFilter: objectId().optional(),
    search: joi.string().optional(),
});