import joi from "joi";
import { FAMILY_RELATIONSHIP, objectId } from "../common";

export const memberSchema = joi.object({
    memberId: objectId().required(),
    relationship: joi.string().valid(...Object.values(FAMILY_RELATIONSHIP)).required(),
});

export const addFamilySchema = joi.object({
    userId: objectId().required(),
    members: joi.array().items(memberSchema).optional(),
});

export const updateFamilySchema = joi.object({
    familyId: objectId().required(),
    members: joi.array().items(memberSchema).optional(),
});