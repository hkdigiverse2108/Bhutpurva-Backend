import joi from "joi";
import { ROLES, GENDER, ADDRESS_TYPE, objectId } from "../common";

export const classDetailsSchema = joi.object({
    isStudded: joi.boolean().default(false),
    branch: joi.string().when("isStudded", {
        is: true,
        then: joi.required(),
        otherwise: joi.optional(),
    }),
});

export const addressSchema = joi.object({
    id: objectId().optional(),
    address: joi.string().required(),
    city: joi.string().required(),
    district: joi.string().required(),
    state: joi.string().required(),
    country: joi.string().required(),
    pincode: joi.string().required(),
    type: joi.string().valid(...Object.values(ADDRESS_TYPE)),
});

export const classSchema = joi.object({
    class: joi.string().required(),
    isStudded: joi.boolean().default(false),
    branch: joi.string().when("isStudded", {
        is: true,
        then: joi.required(),
        otherwise: joi.optional(),
    }),
    passingYear: joi.string().when("isStudded", {
        is: true,
        then: joi.required(),
        otherwise: joi.optional(),
    }),
    medium: joi.string().when("isStudded", {
        is: true,
        then: joi.required(),
        otherwise: joi.optional(),
    }),
    hostel: joi.boolean().when("isStudded", {
        is: true,
        then: joi.required(),
        otherwise: joi.optional(),
    }),
});

export const registerSchema = joi.object({
    name: joi.string().required(),
    fatherName: joi.string().required(),
    surname: joi.string().required(),
    email: joi.string().email().allow("", null).optional(),
    role: joi.string().valid(...Object.values(ROLES)),
    birthDate: joi.date().required(),
    phoneNumber: joi.string().required(),
    whatsappNumber: joi.string().required(),
    gender: joi
        .string()
        .valid(...Object.values(GENDER))
        .required(),
    hrNo: joi.string().required(),
    currentCity: joi.string().required(),
    addresses: joi.array().items(addressSchema).required(),
    occupation: joi.string().required(),
    professions: joi.array().items(joi.string()).required(),
    education: joi.array().items(joi.string()).required(),
    maritalStatus: joi.string().required(),
    bloodGroup: joi.string().required(),
    study: joi
        .object()
        .pattern(/^class([1-9]|1[0-2])$/, classDetailsSchema)
        .optional(),
    skill: joi.string().allow("", null).optional(),
    hobbies: joi.string().allow("", null).optional(),
    talents: joi.array().items(joi.string()).optional(),
    awards: joi.array().items(joi.string()).optional(),
    class10: classSchema.required(),
    class12: classSchema.required(),
});

export const registerAdminSchema = joi.object({
    name: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
});

export const loginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
});

export const forgotPasswordSchema = joi.object({
    email: joi.string().email().required(),
});

export const verifyOtpSchema = joi.object({
    phoneNumber: joi.string().required(),
    otp: joi.string().length(6).required(),
});

export const sendOtpSchema = joi.object({
    phoneNumber: joi.string().required(),
    role: joi.string().valid(...Object.values(ROLES)).optional(),
});

export const resetPasswordSchema = joi.object({
    email: joi.string().email().required(),
    newPassword: joi.string().min(6).required(),
});