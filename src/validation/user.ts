import joi from "joi";
import { ADDRESS_TYPE, commonIdSchema, GENDER, objectId, ROLES } from "../common";
import { addressSchema, classDetailsSchema, classSchema } from ".";

export const getAllUsersSchema = joi.object({
    page: joi.number().optional().default(1),
    limit: joi.number().optional().min(1).max(100),
    search: joi.string().allow("", null).optional(),
    roleFilter: joi.array().items(joi.string().valid(...Object.values(ROLES))).optional(),
    isVerified: joi.boolean().optional(),
    isDeleted: joi.boolean().optional().default(false),
});

export const getUsersDropdownSchema = joi.object({
    search: joi.string().allow("", null).optional(),
    roleFilter: joi.array().items(joi.string().valid(...Object.values(ROLES))).optional(),
    isUnassigned: joi.boolean().optional(),
});

export const updateUserSchema = joi.object({
    userId: objectId().required(),
    name: joi.string().min(3).max(30).optional(),
    email: joi.string().email().optional(),
    role: joi.string().valid(...Object.values(ROLES)).optional(),
    fatherName: joi.string().optional(),
    surname: joi.string().optional(),
    birthDate: joi.date().optional(),
    phoneNumber: joi.string().optional(),
    whatsappNumber: joi.string().optional(),
    gender: joi.string().valid(...Object.values(GENDER)).optional(),
    hrNo: joi.string().optional(),
    currentCity: joi.string().optional(),
    addresses: joi.array().items(addressSchema).optional(),
    occupation: joi.string().optional(),
    professions: joi.array().items(joi.string()).optional(),
    education: joi.array().items(joi.string()).optional(),
    maritalStatus: joi.string().optional(),
    bloodGroup: joi.string().optional(),
    study: joi
        .object()
        .pattern(/^class([1-9]|1[0-2])$/, classDetailsSchema)
        .optional(),
    skill: joi.string().allow("", null).optional(),
    hobbies: joi.string().allow("", null).optional(),
    talents: joi.array().items(joi.string()).optional(),
    awards: joi.array().items(joi.string()).optional(),
    class10: classSchema.optional(),
    class12: classSchema.optional(),
});

export const updateImageSchema = joi.object({
    userId: objectId().required(),
    image: joi.string().required(),
});

export const deleteUserSchema = joi.object({
    userId: objectId().required(),
    email: joi.string().email().required(),
    password: joi.string().required(),
});

export const getUserByIdSchema = commonIdSchema;