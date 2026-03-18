import { apiResponse, commonIdSchema, STATUS_CODE } from "../../common";
import { userModel } from "../../database";
import { feedbackModel } from "../../database/models/feedback";
import { countData, createData, findAllWithPopulate, getFirstMatch, reqInfo, updateData } from "../../helper";
import { feedbackSchema, getFeedbackSchema } from "../../validation";

export const addFeedback = async (req, res) => {
    try {
        const { error, value } = feedbackSchema.validate(req.body);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));
        }

        const user = await getFirstMatch(userModel, { _id: value.userId }, {}, {});
        if (!user) {
            return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "User not found", {}, "User not found"));
        }

        const feedback = await createData(feedbackModel, { userId: value.userId, feedback: value.feedback });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Feedback added successfully", feedback, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
    }
}

export const getFeedback = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getFeedbackSchema.validate(req.query);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));
        }

        const query: any = { isDeleted: false };
        if (value.userFilter) {
            query.userId = value.userFilter;
        }

        const skip = (value.page - 1) * value.limit;

        const feedback = await findAllWithPopulate(feedbackModel, query, {}, {
            skip,
            limit: value.limit,
        }, [{ path: "userId", select: "name email" }]);
        const total = await countData(feedbackModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Feedback fetched successfully", {
            feedback,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(total / value.limit),
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
    }
}

export const deleteFeedback = async (req, res) => {
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));
        }

        const feedback = await updateData(feedbackModel, { _id: value.id }, { isDeleted: true }, {});
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Feedback deleted successfully", feedback, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error while deleting feedback", {}, error));
    }
}