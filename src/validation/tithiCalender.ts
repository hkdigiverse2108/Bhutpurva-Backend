import joi from "joi";
import { MONTH, objectId } from "../common";

export const calenderSchema = joi.object({
    month: joi.string().valid(...Object.values(MONTH)).required(),
    image: joi.string().required(),
});

export const tithiCalenderSchema = joi.object({
    year: joi.number().required(),
    calender: joi.array().items(calenderSchema).required(),
});

export const getTithiCalenderSchema = joi.object({
    year: joi.number().required(),
});

export const addUpdateMonthSchema = joi.object({
    tithiCalenderId: objectId().required(),
    month: joi.string().valid(...Object.values(MONTH)).required(),
    image: joi.string().required(),
});