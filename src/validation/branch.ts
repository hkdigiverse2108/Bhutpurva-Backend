import joi from "joi";
import { objectId } from "../common";

export const createBranchSchema = joi.object({
    name: joi.string().required(),
    isActive: joi.boolean().optional(),
});

export const updateBranchSchema = joi.object({
    branchId: objectId().required(),
    name: joi.string().optional(),
    isActive: joi.boolean().optional(),
});

export const getBranchesSchema = joi.object({
    page: joi.number().optional(),
    limit: joi.number().optional(),
    search: joi.string().allow("", null).optional(),
    isActive: joi.boolean().optional(),
});

export const getBranchesDropdownSchema = joi.object({
    search: joi.string().allow("", null).optional(),
    isActive: joi.boolean().optional(),
});
