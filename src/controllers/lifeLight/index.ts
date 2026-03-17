import { apiResponse, commonIdSchema, STATUS_CODE } from "../../common";
import { lifeLightModel } from "../../database/models/lifeLight";
import { countData, createData, findAllWithPopulate, getData, updateData } from "../../helper";
import { addLifeLightSchema, getLifeLightSchema, updateLifeLightSchema } from "../../validation"

export const addLifeLight = async (req, res) => {
    try {
        const { error, value } = addLifeLightSchema.validate(req.body);
        if (error)
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const lifeLight = await createData(lifeLightModel, value);
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Life light added successfully", lifeLight, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error adding life light", {}, error));
    }
}

export const updateLifeLight = async (req, res) => {
    try {
        const { error, value } = updateLifeLightSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const updatePayload = { ...value };
        delete updatePayload.lifeLightId;

        const lifeLight = await updateData(lifeLightModel, { _id: value.lifeLightId }, { $set: updatePayload }, { new: true });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Life light updated successfully", lifeLight, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating life light", {}, error));
    }
}

export const getLifeLight = async (req, res) => {
    try {
        const { error, value } = getLifeLightSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const { page, limit, userFilter, statusFilter } = value;

        const skip = (page - 1) * limit;

        const query: any = { isDeleted: false };
        if (userFilter) query.userId = userFilter;
        if (statusFilter) query.status = statusFilter;

        const populate = [
            { path: "userId", select: "name email" }
        ]

        const lifeLight = await findAllWithPopulate(lifeLightModel, query, {}, { skip, limit }, populate);
        const total = await countData(lifeLightModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Life light fetched successfully", {
            lifeLight,
            state: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching life light", {}, error));
    }
}

export const getByUserId = async (req, res) => {
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const lifeLight = await getData(lifeLightModel, { userId: value.id, isDeleted: false }, {}, {});
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Life light fetched successfully", lifeLight, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching life light", {}, error));
    }
};

export const getById = async (req, res) => {
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const lifeLight = await getData(lifeLightModel, { _id: value.id, isDeleted: false }, {}, {});
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Life light fetched successfully", lifeLight, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching life light", {}, error));
    }
};

export const deleteLifeLight = async (req, res) => {
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const lifeLight = await updateData(lifeLightModel, { _id: value.id }, { $set: { isDeleted: true } }, { new: true });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Life light deleted successfully", {}, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting life light", {}, error));
    }
};
