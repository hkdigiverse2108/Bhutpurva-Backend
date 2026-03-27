import { apiResponse, DELETE_REQUEST_STATUS, STATUS_CODE } from "../../common";
import { userModel } from "../../database";
import { deleteRequestModel } from "../../database/models/deleteRequest";
import { countData, findAllWithPopulate, updateData } from "../../helper";
import { getDeleteRequestSchema, updateDeleteRequestSchema } from "../../validation";

export const getDeleteRequest = async (req, res) => {
    try {
        const { error, value } = getDeleteRequestSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = {
            status: value.statusFilter,
        }

        if (value.search) {
            query.$or = [
                { name: { $regex: value.search, $options: "si" } },
                { email: { $regex: value.search, $options: "si" } },
            ];
        }

        const skip = (value.page - 1) * value.limit;

        const deleteRequests = await findAllWithPopulate(deleteRequestModel, query, {}, { skip, limit: value.limit }, [{ path: "userId", select: "name email" }]);
        const totalDeleteRequests = await countData(deleteRequestModel, {});

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Delete requests fetched successfully", {
            deleteRequests,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(totalDeleteRequests / value.limit),
            },
            totalData: totalDeleteRequests
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching delete requests", {}, error.message));
    }
}

export const updateDeleteRequest = async (req, res) => {
    try {
        const { error, value } = updateDeleteRequestSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const deleteRequest = await updateData(deleteRequestModel, { _id: value.id }, { status: value.status }, {});

        if (value.status === DELETE_REQUEST_STATUS.APPROVED) {
            await updateData(userModel, { _id: deleteRequest.userId }, { isDeleted: true }, {});
        }
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Delete request updated successfully", { deleteRequest }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating delete request", {}, error.message));
    }
}
