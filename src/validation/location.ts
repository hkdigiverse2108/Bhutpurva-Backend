import joi from "joi";
import { objectId } from "../common";
import { LOCATION_TYPE } from "../common";

export const createLocationSchema = joi.object({
    name: joi.string().required(),
    type: joi.string().valid(...Object.values(LOCATION_TYPE)).required(),
    parentId: objectId().optional(),
    isActive: joi.boolean().optional(),
});

export const updateLocationSchema = joi.object({
    locationId: objectId().required(),
    name: joi.string().optional(),
    type: joi.string().valid(...Object.values(LOCATION_TYPE)).optional(),
    parentId: objectId().optional(),
    isActive: joi.boolean().optional(),
});

export const getLocationsSchema = joi.object({
    page: joi.number().optional(),
    limit: joi.number().optional(),
    search: joi.string().allow("", null).optional(),
    typeFilter: joi.string().valid(...Object.values(LOCATION_TYPE)).optional(),
    parentIdFilter: objectId().optional(),
    isActive: joi.boolean().optional(),
});

export const getLocationsDropdownSchema = joi.object({
    search: joi.string().allow("", null).optional(),
    typeFilter: joi.string().valid(...Object.values(LOCATION_TYPE)).optional(),
    parentIdFilter: objectId().optional(),
    isActive: joi.boolean().optional(),
});
