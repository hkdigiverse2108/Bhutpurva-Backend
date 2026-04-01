import joi from "joi";
import { objectId } from "../common";

export const createBatchSchema = joi.object({
    name: joi.string().required(),
    isActive: joi.boolean().optional(),
    groupId: objectId().optional(),
    studentIds: joi.array().items(objectId()).optional(),
});

export const updateBatchSchema = joi.object({
    batchId: objectId().required(),
    name: joi.string().optional(),
    isActive: joi.boolean().optional(),
    groupId: objectId().optional(),
    studentIds: joi.array().items(objectId()).optional(),
});

export const getBatchsSchema = joi.object({
    page: joi.number().optional().default(1),
    limit: joi.number().optional(),
    search: joi.string().allow("", null).optional(),
    groupFilter: joi.string().allow("", null).optional(),
    isActive: joi.boolean().optional(),
});

export const getBatchesDropdownSchema = joi.object({
    search: joi.string().allow("", null).optional(),
    groupFilter: objectId().allow("", null).optional(),
    isActive: joi.boolean().optional(),
    isUnassigned: joi.boolean().optional(),
});

export const addDevoteeSchema = joi.object({
    batchId: objectId().required(),
    devoteeId: objectId().required(),
});

export const removeDevoteeSchema = joi.object({
    batchId: objectId().required(),
    devoteeId: objectId().required(),
});

export const createMonitorSchema = joi.object({
    batchId: objectId().required(),
    userId: objectId().required(),
});

export const assignDevoteeSchema = joi.object({
    monitorId: objectId().required(),
    devoteeIds: joi.array().items(objectId()).required(),
});

export const unassignDevoteeSchema = joi.object({
    monitorId: objectId().required(),
    devoteeIds: joi.array().items(objectId()).required(),
});

export const getMonitorSchema = joi.object({
    page: joi.number().optional().default(1),
    limit: joi.number().optional(),
    // search: joi.string().allow("", null).optional(),
    batchFilter: objectId().optional(),
});

export const getUnassignedDevoteesSchema = joi.object({
    batchId: objectId().required(),
});