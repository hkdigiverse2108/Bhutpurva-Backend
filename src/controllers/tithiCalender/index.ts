import { tithiCalenderSchema, addUpdateMonthSchema, getTithiCalenderSchema } from "../../validation";
import { TithiCalender } from "../../database";
import { apiResponse, STATUS_CODE } from "../../common";
import { updateData, getFirstMatch, reqInfo } from "../../helper";

export const addUpdateTithiCalender = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = tithiCalenderSchema.validate(req.body);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.details[0].message, {}, {}));
        }

        const tithiCalender = await updateData(TithiCalender, {
            year: value.year, isDeleted: false
        }, value, { upsert: true, new: true });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Tithi Calender updated successfully.", { tithiCalender }, {}));
    } catch (error) {
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.message, {}, error));
    }
};

export const getTithiCalender = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getTithiCalenderSchema.validate(req.query);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.details[0].message, {}, {}));
        }

        const tithiCalender = await getFirstMatch(TithiCalender, { year: value.year, isDeleted: false }, {}, {})

        if (!tithiCalender) {
            return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "Tithi Calender not found.", {}, {}));
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Tithi Calender fetched successfully.", { tithiCalender }, {}));
    } catch (error) {
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.message, {}, error));
    }
}

export const addUpdateMonth = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = addUpdateMonthSchema.validate(req.body);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.details[0].message, {}, {}));
        }

        // 1. Try to update existing month in the array
        let tithiCalender = await TithiCalender.findOneAndUpdate(
            { _id: value.tithiCalenderId, "calender.month": value.month, isDeleted: false },
            { $set: { "calender.$.image": value.image } },
            { new: true, lean: true }
        );

        // 2. If month doesn't exist in array, push it
        if (!tithiCalender) {
            tithiCalender = await TithiCalender.findOneAndUpdate(
                { _id: value.tithiCalenderId, isDeleted: false },
                { $push: { calender: { month: value.month, image: value.image } } },
                { new: true, lean: true }
            );
        }

        if (!tithiCalender) {
            return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "Tithi Calender not found.", {}, {}));
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Tithi Calendar month updated successfully.", { tithiCalender }, {}));
    } catch (error) {
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.message, {}, error));
    }
};
