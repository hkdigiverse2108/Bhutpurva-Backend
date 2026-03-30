import mongoose from "mongoose";
import { apiResponse, commonIdSchema, ROLES, STATUS_CODE, SURVEY_SCOPE } from "../../common";
import { batchModel, surveyModel, surveyResponseModel, userModel } from "../../database";
import { countData, createData, findAllWithPopulate, findOneAndPopulate, getFirstMatch, reqInfo, updateData } from "../../helper";
import {
    createSurveySchema,
    getSurveyResponsesSchema,
    getSurveysSchema,
    submitSurveyResponseSchema,
    updateSurveySchema,
} from "../../validation";

export const createSurvey = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = createSurveySchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        if (value.scope === SURVEY_SCOPE.GROUP && !value.groupId)
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "groupId is required when scope is 'group'", {}, {}));

        if (value.scope === SURVEY_SCOPE.BATCH && !value.batchId)
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "batchId is required when scope is 'batch'", {}, {}));

        value.createdBy = req.headers.user._id;

        const survey = await createData(surveyModel, value);
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Survey created successfully", survey, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error creating survey", {}, error.message));
    }
};

export const updateSurvey = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = updateSurveySchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const { surveyId, ...updatePayload } = value;

        const survey = await updateData(surveyModel, { _id: surveyId, isDeleted: false }, updatePayload, { new: true });
        if (!survey) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Survey not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Survey updated successfully", survey, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error updating survey", {}, error.message));
    }
};

export const deleteSurvey = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const survey = await updateData(surveyModel, { _id: value.id, isDeleted: false }, { isDeleted: true }, { new: true });
        if (!survey) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Survey not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Survey deleted successfully", survey, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error deleting survey", {}, error.message));
    }
};

export const getSurveys = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getSurveysSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false };

        const isAdmin = [ROLES.ADMIN, ROLES.MONITOR, ROLES.LEADER].includes(req.headers.user.role);

        if (isAdmin) {
            // Admin/Monitor/Leader: optional explicit filters
            if (value.search) query.title = { $regex: value.search, $options: "si" };
            if (value.scope) query.scope = value.scope;
            if (value.groupFilter) query.groupId = new mongoose.Types.ObjectId(value.groupFilter);
            if (value.batchFilter) query.batchId = new mongoose.Types.ObjectId(value.batchFilter);
            if (value.isActive !== undefined && value.isActive !== null) query.isActive = value.isActive;
        } else {
            // Regular user: smart scope filtering based on their batch & group
            const user = await getFirstMatch(userModel, { _id: req.headers.user._id, isDeleted: false }, { batchId: 1 }, {});
            const userBatchId = user?.batchId || null;

            // Resolve groupId from the user's batch
            let userGroupId = null;
            if (userBatchId) {
                const batch = await getFirstMatch(batchModel, { _id: userBatchId, isDeleted: false }, { groupId: 1 }, {});
                userGroupId = batch?.groupId || null;
            }

            const scopeConditions: any[] = [{ scope: SURVEY_SCOPE.OVERALL }];

            if (userGroupId) {
                scopeConditions.push({ scope: SURVEY_SCOPE.GROUP, groupId: new mongoose.Types.ObjectId(userGroupId) });
            }

            if (userBatchId) {
                scopeConditions.push({ scope: SURVEY_SCOPE.BATCH, batchId: new mongoose.Types.ObjectId(userBatchId) });
            }

            query.$or = scopeConditions;
            query.isActive = true; // users only see active surveys
        }

        const hasPagination = value.page && value.limit;
        const skip = hasPagination ? (value.page - 1) * value.limit : 0;

        const pipeline: any[] = [
            { $match: query },
            {
                $lookup: {
                    from: "groups",
                    localField: "groupId",
                    foreignField: "_id",
                    as: "groupId",
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
                }
            },
            { $unwind: { path: "$groupId", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "batches",
                    localField: "batchId",
                    foreignField: "_id",
                    as: "batchId",
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
                }
            },
            { $unwind: { path: "$batchId", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "createdBy",
                    pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
                }
            },
            { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
            { $sort: { createdAt: -1 } },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    data: [
                        ...(hasPagination ? [{ $skip: skip }, { $limit: value.limit }] : [{ $skip: 0 }]),
                        {
                            $addFields: {
                                isCompleted: false, // Default
                                debugStatus: "Pipeline Executed" // Debug flag
                            }
                        },
                        {
                            $lookup: {
                                from: "surveyresponses",
                                let: { surveyId: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$surveyId", "$$surveyId"] },
                                                    { $eq: ["$userId", new mongoose.Types.ObjectId(req.headers.user._id)] },
                                                    { $eq: ["$isDeleted", false] }
                                                ]
                                            }
                                        }
                                    },
                                    { $project: { _id: 1 } },
                                    { $limit: 1 }
                                ],
                                as: "userResponses",
                            }
                        },
                        {
                            $addFields: {
                                isCompleted: { $gt: [{ $size: "$userResponses" }, 0] }
                            }
                        },
                        { $project: { userResponses: 0 } }
                    ],
                    totalCount: [{ $count: "count" }],
                }
            }
        ];

        const result = await surveyModel.aggregate(pipeline);
        const surveys = result[0]?.data || [];
        const total = result[0]?.totalCount[0]?.count || 0;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Surveys fetched successfully", {
            surveys,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: hasPagination ? Math.ceil(total / value.limit) : 1,
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error fetching surveys", {}, error.message));
    }
};

export const getSurveyById = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const survey = await surveyModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(value.id), isDeleted: false } },
            {
                $lookup: {
                    from: "groups",
                    localField: "groupId",
                    foreignField: "_id",
                    as: "groupId",
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
                }
            },
            { $unwind: { path: "$groupId", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "batches",
                    localField: "batchId",
                    foreignField: "_id",
                    as: "batchId",
                    pipeline: [{ $project: { _id: 1, name: 1 } }],
                }
            },
            { $unwind: { path: "$batchId", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "createdBy",
                    pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }],
                }
            },
            { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "surveyresponses",
                    let: { surveyId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$surveyId", "$$surveyId"] },
                                        { $eq: ["$userId", new mongoose.Types.ObjectId(req.headers.user._id)] },
                                        { $eq: ["$isDeleted", false] }
                                    ]
                                }
                            }
                        },
                        { $project: { _id: 1 } },
                        { $limit: 1 }
                    ],
                    as: "userResponses",
                }
            },
            {
                $addFields: {
                    isCompleted: { $gt: [{ $size: "$userResponses" }, 0] }
                }
            },
            { $project: { userResponses: 0 } },
        ]);

        if (!survey || survey.length === 0)
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Survey not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Survey fetched successfully", survey[0], {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error fetching survey", {}, error.message));
    }
};

export const submitSurveyResponse = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = submitSurveyResponseSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const survey = await getFirstMatch(surveyModel, { _id: value.surveyId, isDeleted: false, isActive: true }, {}, {});
        if (!survey) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Survey not found or inactive", {}, {}));

        // Check for existing response (unique index handles this too, but better UX with explicit error)
        const existing = await getFirstMatch(surveyResponseModel, { surveyId: value.surveyId, userId: req.headers.user._id, isDeleted: false }, {}, {});
        if (existing) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "You have already submitted a response to this survey", {}, {}));

        const response = await createData(surveyResponseModel, {
            surveyId: value.surveyId,
            userId: req.headers.user._id,
            answers: value.answers,
        });

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Survey response submitted successfully", response, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error submitting survey response", {}, error.message));
    }
};

export const getSurveyResponses = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getSurveyResponsesSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const survey = await getFirstMatch(surveyModel, { _id: value.surveyId, isDeleted: false }, {}, {});
        if (!survey) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Survey not found", {}, {}));

        const query: any = { surveyId: value.surveyId, isDeleted: false };

        const hasPagination = value.page && value.limit;
        const skip = hasPagination ? (value.page - 1) * value.limit : 0;

        const responses = await findAllWithPopulate(
            surveyResponseModel,
            query,
            {},
            hasPagination ? { skip, limit: value.limit } : {},
            [{ path: "userId", select: "name surname email phoneNumber" }]
        );
        const total = await countData(surveyResponseModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Survey responses fetched successfully", {
            survey: { _id: survey._id, title: survey.title, scope: survey.scope },
            responses,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: hasPagination ? Math.ceil(total / value.limit) : 1,
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error fetching survey responses", {}, error.message));
    }
};

export const getSurveyResponseById = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const response = await findOneAndPopulate(
            surveyResponseModel,
            { _id: value.id, isDeleted: false },
            {},
            {},
            [
                { path: "userId", select: "name surname email phoneNumber" },
                { path: "surveyId", select: "title scope questions" },
            ]
        );

        if (!response) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Response not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Survey response fetched successfully", response, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Error fetching survey response", {}, error.message));
    }
};
