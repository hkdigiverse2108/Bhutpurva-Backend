import { tithiCalenderSchema, addUpdateMonthSchema } from "../../validation";
import { TithiCalender } from "../../database";
import { apiResponse, STATUS_CODE } from "../../common";
import { updateData, getFirstMatch } from "../../helper";

export const addUpdateTithiCalender = async (req, res) => {
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
    try {
        const currentYear = new Date().getFullYear()
        const tithiCalender = await getFirstMatch(TithiCalender, { year: currentYear, isDeleted: false }, {}, {})
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Tithi Calender fetched successfully.", { tithiCalender }, {}));
    } catch (error) {
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.message, {}, error));
    }
}

export const addUpdateMonth = async (req, res) => {
    try {
        const { error, value } = addUpdateMonthSchema.validate(req.body);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.details[0].message, {}, {}));
        }

        const updatePayload = { ...value };
        delete updatePayload.tithiCalenderId;

        const tithiCalender = await updateData(TithiCalender, {
            _id: value.tithiCalenderId, isDeleted: false
        }, updatePayload, { upsert: true, new: true });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Tithi Calender updated successfully.", { tithiCalender }, {}));
    } catch (error) {
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.message, {}, error));
    }
};
