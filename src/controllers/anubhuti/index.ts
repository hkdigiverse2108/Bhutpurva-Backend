import { apiResponse, commonIdSchema, ROLES, STATUS_CODE } from "../../common";
import { anubhutiModel } from "../../database";
import { countData, createData, findAllWithPopulate, getFirstMatch, reqInfo, updateData } from "../../helper";
import { addAnubhutiSchema, getAnubhutiSchema, updateAnubhutiSchema } from "../../validation";

export const createAnubhuti = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = addAnubhutiSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const user = req.headers.user;

        const newAnubhuti = await createData(anubhutiModel, { ...value, userId: user._id });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Anubhuti created successfully", newAnubhuti, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating anubhuti", {}, error.message));
    }
};

export const updateAnubhuti = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = updateAnubhutiSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const updatePayload = { ...value };
        delete updatePayload.anubhutiId;

        const updatedAnubhuti = await updateData(anubhutiModel, { _id: value.anubhutiId }, updatePayload, { new: true });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Anubhuti updated successfully", updatedAnubhuti, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating anubhuti", {}, error.message));
    }
};

export const deleteAnubhuti = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = commonIdSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const updatedAnubhuti = await updateData(anubhutiModel, { _id: value.id }, { isDeleted: true }, {});
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Anubhuti deleted successfully", updatedAnubhuti, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting anubhuti", {}, error.message));
    }
};

export const getAnubhuti = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getAnubhutiSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const { page, limit, userFilter } = value;

        const query: any = { isDeleted: false };

        const user = req.headers.user;

        if (user.role === ROLES.USER) {
            query.userId = user._id;
        }

        if (userFilter) {
            query.userId = userFilter;
        }

        const skip = (page - 1) * limit;

        const anubhutis = await findAllWithPopulate(anubhutiModel, query, {}, { skip, limit }, [{ path: "userId", select: "name" }]);
        const totalAnubhutis = await countData(anubhutiModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Anubhutis fetched successfully", {
            anubhutis,
            state: {
                page,
                limit,
                totalPages: Math.ceil(totalAnubhutis / limit),
            },
            totalData: totalAnubhutis
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching anubhutis", {}, error.message));
    }
};