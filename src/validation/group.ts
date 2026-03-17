import joi from "joi";
import { objectId } from "../common";

export const createGroupSchema = joi.object({
    name: joi.string().required(),
    leaders: joi.array().items(objectId()).optional(),
    batches: joi.array().items(objectId()).optional(),
    isActive: joi.boolean().optional(),
});

export const updateGroupSchema = joi.object({
    groupId: joi.string().required(),
    name: joi.string().optional(),
    leaders: joi.array().items(objectId()).optional(),
    batches: joi.array().items(objectId()).optional(),
    isActive: joi.boolean().optional(),
});

export const getGroupsSchema = joi.object({
    page: joi.number().optional().default(1),
    limit: joi.number().optional(),
    search: joi.string().allow("", null).optional(),
    isActive: joi.boolean().optional(),
});