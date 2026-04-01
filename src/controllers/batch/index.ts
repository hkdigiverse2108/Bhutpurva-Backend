import mongoose from "mongoose";
import { apiResponse, batchModelName, commonIdSchema, monitorModelName, ROLES, STATUS_CODE, userModelName } from "../../common";
import { batchModel, userModel } from "../../database";
import { monitorModel, attendanceModel } from "../../database";
import { countData, createData, findAllWithPopulate, findOneAndPopulate, getFirstMatch, updateData, reqInfo, updateMany, getData } from "../../helper";
import { addDevoteeSchema, assignDevoteeSchema, createBatchSchema, createMonitorSchema, getBatchsSchema, getMonitorSchema, removeDevoteeSchema, unassignDevoteeSchema, updateBatchSchema, getBatchesDropdownSchema, getUnassignedDevoteesSchema } from "../../validation"

export const createBatch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = createBatchSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        // check batch name already exists
        const batchExist = await getFirstMatch(batchModel, { name: { $regex: value.name, $options: "si" }, isDeleted: false }, {}, {});
        if (batchExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch name already exists", {}, {}));

        const batch = await createData(batchModel, value);

        if (value.studentIds && value.studentIds.length > 0) {
            await updateData(userModel, { _id: { $in: value.studentIds }, isDeleted: false }, { batchId: batch._id }, { multi: true });
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batch created successfully", batch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating batch", {}, error.message));
    }
}

export const updateBatch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = updateBatchSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const updatePayload: any = {};

        if (value.name !== undefined) updatePayload.name = value.name;
        if (value.isActive !== undefined) updatePayload.isActive = value.isActive;
        if (value.groupId !== undefined) updatePayload.groupId = value.groupId;
        if (value.studentIds !== undefined) {
            const currentStudents = await getData(userModel, { batchId: value.batchId, isDeleted: false }, { _id: 1 }, {});
            const currentStudentIds = currentStudents.map(s => s._id.toString());
            const newStudentIds = value.studentIds.map(id => id.toString());

            const studentsToAdd = value.studentIds.filter(id => !currentStudentIds.includes(id.toString()));
            const studentsToRemove = currentStudentIds.filter(id => !newStudentIds.includes(id));

            if (studentsToAdd.length > 0) {
                await updateMany(userModel, { _id: { $in: studentsToAdd }, isDeleted: false }, { batchId: value.batchId }, {});
            }

            if (studentsToRemove.length > 0) {
                await updateMany(userModel, { _id: { $in: studentsToRemove }, isDeleted: false }, { batchId: null }, {});
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (studentsToAdd.length > 0) {
                await updateMany(
                    attendanceModel,
                    { batchId: value.batchId, date: { $gte: today } },
                    {
                        $addToSet: {
                            students: {
                                $each: studentsToAdd.map(id => ({ studentId: id, isPresent: false }))
                            }
                        }
                    },
                    {}
                );
            }

            if (studentsToRemove.length > 0) {
                await updateMany(
                    attendanceModel,
                    { batchId: value.batchId, date: { $gte: today } },
                    {
                        $pull: {
                            students: { studentId: { $in: studentsToRemove } }
                        }
                    },
                    {}
                );
            }
        }

        const batch = await updateData(batchModel, { _id: value.batchId, isDeleted: false }, updatePayload, { new: true });
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batch updated successfully", batch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating batch", {}, error.message));
    }
}

export const deleteBatch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const batch = await batchModel.findOne({ _id: value.id, isDeleted: false });
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        // 1. Role Revert: Fetch active monitors in this batch before deletion
        const monitors = await monitorModel.find({ batchId: value.id, isDeleted: false });
        const monitorUserIds = monitors.map(m => m.userId);

        if (monitorUserIds.length > 0) {
            // Revert role to USER only if it is currently MONITOR (preserve LEADER etc.)
            await userModel.updateMany(
                { _id: { $in: monitorUserIds }, role: ROLES.MONITOR },
                { role: ROLES.USER }
            );
        }

        // 2. Cascade Delete: Mark associated monitors as deleted
        await monitorModel.updateMany({ batchId: value.id, isDeleted: false }, { isDeleted: true });

        // 3. Mark Batch Deleted
        batch.isDeleted = true;
        await batch.save();

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batch deleted successfully", batch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting batch", {}, error.message));
    }
};

export const getBatches = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getBatchsSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const user = req.headers.user;

        console.log(user);

        const query: any = {
            isDeleted: false
        }

        if (value.search)
            query.name = { $regex: value.search, $options: "si" };

        if (value.groupFilter)
            query.groupId = new mongoose.Types.ObjectId(value.groupFilter);

        if (value.isActive != null && value.isActive !== undefined)
            query.isActive = value.isActive;

        const hasPagination = value.page && value.limit;

        const skip = hasPagination ? (value.page - 1) * value.limit : 0;

        const aggregationPipeline: any[] = [
            { $match: query },
            {
                $lookup: {
                    from: "groups",
                    localField: "groupId",
                    foreignField: "_id",
                    as: "groupId"
                }
            },
            { $unwind: { path: "$groupId", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "batchId",
                    pipeline: [
                        { $match: { isDeleted: false } },
                        {
                            $addFields: {
                                profileCompletion: {
                                    $round: [
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        {
                                                            $add: [
                                                                { $cond: [{ $ifNull: ["$name", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$fatherName", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$surname", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$phoneNumber", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$whatsappNumber", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$birthDate", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$gender", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$hrNo", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$currentCity", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$image", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$occupation", false] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$professions", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$educations", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$maritalStatus", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$bloodGroup", false] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$addressIds", []] } }, 0] }, 1, 0] },
                                                                { $cond: ["$isVerified", 1, 0] },
                                                                { $cond: [{ $ifNull: ["$class10", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$class12", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$studyId", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$skill", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$hobbies", false] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$talents", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$awards", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$batchId", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$email", false] }, 1, 0] }
                                                            ]
                                                        },
                                                        26
                                                    ]
                                                },
                                                100
                                            ]
                                        },
                                        0
                                    ]
                                }
                            }
                        },
                        { $project: { _id: 1, name: 1, surname: 1, email: 1, phoneNumber: 1, currentCity: 1, isVerified: 1, profileCompletion: 1 } }
                    ],
                    as: "students"
                }
            },
            {
                $addFields: {
                    studentCount: { $size: "$students" }
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    data: hasPagination
                        ? [
                            { $skip: skip },
                            { $limit: value.limit },
                        ]
                        : [], // no pagination → return all
                    totalCount: [
                        { $count: "count" }
                    ]
                }
            }
        ];

        const result = await batchModel.aggregate(aggregationPipeline);
        const batchData = result[0].data;
        const total = result[0].totalCount[0]?.count || 0;

        if (!batchData) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        const batch = await batchModel.populate(batchData, [
            {
                path: "monitorIds",
                populate: { path: "userId", select: "name email surname phoneNumber currentCity isVerified profileCompletion" }
            }
        ]);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batch fetched successfully", {
            batch,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: hasPagination
                    ? Math.ceil(total / value.limit)
                    : 1,
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting batch", {}, error.message));
    }
};

export const getBatchesDropdown = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getBatchesDropdownSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false };
        if (value.search)
            query.name = { $regex: value.search, $options: "si" };

        if (value.groupFilter)
            query.groupId = value.groupFilter;

        if (value.isUnassigned) {
            if (value.groupFilter) {
                // If groupFilter is provided, show unassigned batches OR batches belonging to this group
                query.$or = [
                    { groupId: { $exists: false } },
                    { groupId: null },
                    { groupId: value.groupFilter }
                ];
                delete query.groupId; // Remove the single groupId filter as it's now in the $or
            } else {
                // Only unassigned batches
                query.$or = [
                    { groupId: { $exists: false } },
                    { groupId: null }
                ];
            }
        }

        if (value.isActive != null && value.isActive !== undefined)
            query.isActive = value.isActive;

        const batches = await batchModel.find(query)
            .select("_id name groupId isActive")
            .populate("groupId", "name")
            .lean();

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batches dropdown fetched successfully", batches, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting batches for dropdown", {}, error.message));
    }
};

export const getBatchById = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const result = await batchModel.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(value.id), isDeleted: false } },
            {
                $lookup: {
                    from: "groups",
                    localField: "groupId",
                    foreignField: "_id",
                    as: "groupId"
                }
            },
            { $unwind: { path: "$groupId", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "batchId",
                    pipeline: [
                        { $match: { isDeleted: false } },
                        {
                            $addFields: {
                                profileCompletion: {
                                    $round: [
                                        {
                                            $multiply: [
                                                {
                                                    $divide: [
                                                        {
                                                            $add: [
                                                                { $cond: [{ $ifNull: ["$name", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$fatherName", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$surname", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$phoneNumber", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$whatsappNumber", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$birthDate", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$gender", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$hrNo", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$currentCity", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$image", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$occupation", false] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$professions", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$educations", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$maritalStatus", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$bloodGroup", false] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$addressIds", []] } }, 0] }, 1, 0] },
                                                                { $cond: ["$isVerified", 1, 0] },
                                                                { $cond: [{ $ifNull: ["$class10", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$class12", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$studyId", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$skill", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$hobbies", false] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$talents", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $gt: [{ $size: { $ifNull: ["$awards", []] } }, 0] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$batchId", false] }, 1, 0] },
                                                                { $cond: [{ $ifNull: ["$email", false] }, 1, 0] }
                                                            ]
                                                        },
                                                        26
                                                    ]
                                                },
                                                100
                                            ]
                                        },
                                        0
                                    ]
                                }
                            }
                        },
                        { $project: { _id: 1, name: 1, surname: 1, email: 1, phoneNumber: 1, currentCity: 1, isVerified: 1, profileCompletion: 1 } },
                        {
                            $lookup: {
                                from: "monitors",
                                let: { studentId: "$_id" },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $in: ["$$studentId", "$devoteeIds"] },
                                                    { $eq: ["$isDeleted", false] }
                                                ]
                                            }
                                        }
                                    },
                                    {
                                        $lookup: {
                                            from: "users",
                                            localField: "userId",
                                            foreignField: "_id",
                                            as: "monitorUser"
                                        }
                                    },
                                    { $unwind: { path: "$monitorUser", preserveNullAndEmptyArrays: true } },
                                    { $project: { _id: 1, name: "$monitorUser.name", surname: "$monitorUser.surname" } }
                                ],
                                as: "monitor"
                            }
                        },
                        { $unwind: { path: "$monitor", preserveNullAndEmptyArrays: true } }
                    ],
                    as: "students"
                }
            },
            {
                $addFields: {
                    studentCount: { $size: "$students" }
                }
            }
        ]);

        if (!result || result.length === 0) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        const batch = await batchModel.populate(result[0], [
            {
                path: "monitorIds",
                populate: { path: "userId", select: "name email surname phoneNumber currentCity isVerified profileCompletion" }
            }
        ]);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batch fetched successfully", batch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting batch", {}, error.message));
    }
};

export const addDevoteeToBatch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = addDevoteeSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const batch = await getFirstMatch(batchModel, { _id: value.batchId, isDeleted: false }, {}, {});
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        const user = await updateData(userModel, { _id: value.devoteeId, isDeleted: false }, { batchId: value.batchId }, { new: true });
        if (!user) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        // Sync future attendance records
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await updateData(
            attendanceModel,
            { batchId: value.batchId, date: { $gte: today } },
            {
                $addToSet: {
                    students: {
                        studentId: value.devoteeId,
                        isPresent: false
                    }
                }
            },
            { multi: true }
        );

        const payload = {
            batch: value.batchId,
            user: value.devoteeId,
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Devotee added to batch successfully", payload, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error adding devotee to batch", {}, error.message));
    }
};

export const removeDevoteeFromBatch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = removeDevoteeSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const batch = await batchModel.findOne({ _id: value.batchId, isDeleted: false });
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        const user = await userModel.findOne({ _id: value.devoteeId, isDeleted: false });
        if (!user) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        // Role Sync: If MONITOR, delete monitor record and reset role (preserve LEADER role)
        if (user.role === ROLES.MONITOR) {
            await monitorModel.updateMany({ userId: user._id, isDeleted: false }, { isDeleted: true });
            user.role = ROLES.USER;
        }

        // Assignment Cleanup: Pull from any monitor's devoteeIds in this batch
        await monitorModel.updateMany(
            { batchId: value.batchId, isDeleted: false },
            { $pull: { devoteeIds: value.devoteeId } }
        );

        // Sync future attendance records
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await attendanceModel.updateMany(
            { batchId: value.batchId, date: { $gte: today } },
            {
                $pull: {
                    students: { studentId: value.devoteeId }
                }
            }
        );

        user.batchId = null;
        await user.save();

        const payload = {
            batch: value.batchId,
            user: value.devoteeId,
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Devotee removed from batch successfully", payload, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error removing devotee from batch", {}, error.message));
    }
};

export const createMonitor = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = createMonitorSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const user = await getFirstMatch(userModel, { _id: value.userId, isDeleted: false }, {}, {});
        if (!user) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        if (user.role !== ROLES.USER && user.role !== ROLES.MONITOR && user.role !== ROLES.LEADER) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User does not have required role", {}, {}));
        }

        if (user.role === ROLES.USER) {
            await updateData(userModel,
                { _id: value.userId },
                { role: ROLES.MONITOR },
                { new: true }
            );
        }

        if (user.batchId != value.batchId) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User is not in this batch", {}, {}));

        const isMonitor = await getFirstMatch(monitorModel, { userId: value.userId, isDeleted: false }, {}, {});
        if (isMonitor) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User is already a monitor", {}, {}));

        const monitor = await createData(monitorModel, { batchId: value.batchId, userId: value.userId });

        const batch = await updateData(batchModel, { _id: value.batchId }, { $push: { monitorIds: monitor._id } }, { new: true });
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Monitor created successfully", {
            monitor: monitor,
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating monitor", {}, error.message));
    }
};

export const removeMonitor = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const monitor = await getFirstMatch(monitorModel, { _id: value.id, isDeleted: false }, {}, {});
        if (!monitor) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Monitor not found", {}, {}));

        const user = await getFirstMatch(userModel, { _id: monitor.userId, isDeleted: false }, {}, {});
        if (user && user.role === ROLES.MONITOR) {
            await updateData(userModel,
                { _id: monitor.userId },
                { role: ROLES.USER },
                { new: true }
            );
        }

        const batch = await updateData(batchModel, { _id: monitor.batchId }, { $pull: { monitorIds: monitor._id } }, { new: true });
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        await updateData(monitorModel, { _id: monitor._id }, { isDeleted: true }, {});

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Monitor removed successfully", {
            monitor: monitor,
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error removing monitor", {}, error.message));
    }
};

export const assignDevotee = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = assignDevoteeSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const monitor = await monitorModel.findOne({ _id: value.monitorId, isDeleted: false });
        if (!monitor) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Monitor not found", {}, {}));

        // Validate that all devotees belong to the same batch as the monitor
        const users = await userModel.find({ _id: { $in: value.devoteeIds }, isDeleted: false });
        if (users.length !== value.devoteeIds.length) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Some users not found", {}, {}));
        }

        const invalidDevotees = users.filter(u => u.batchId?.toString() !== monitor.batchId.toString());
        if (invalidDevotees.length > 0) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Some devotees do not belong to this monitor's batch", {}, {
                invalidDevoteeIds: invalidDevotees.map(u => u._id)
            }));
        }

        // Remove these devotees from any other monitors in the same batch
        await monitorModel.updateMany(
            { batchId: monitor.batchId, isDeleted: false },
            { $pull: { devoteeIds: { $in: value.devoteeIds } } }
        );

        // Add to the target monitor
        const updatedMonitor = await monitorModel.findOneAndUpdate(
            { _id: value.monitorId },
            { $addToSet: { devoteeIds: { $each: value.devoteeIds } } },
            { new: true }
        );

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Devotees assigned successfully", updatedMonitor, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error assigning devotee", {}, error.message));
    }
};

export const unassignDevotee = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = unassignDevoteeSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const monitor = await updateData(monitorModel, { _id: value.monitorId }, { $pull: { devoteeIds: { $in: value.devoteeIds } } }, { new: true });
        if (!monitor) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Monitor not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Devotee unassigned from batch successfully", monitor, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error unassigning devotee", {}, error.message));
    }
};

export const getMonitors = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getMonitorSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const { page, limit, batchFilter } = value;

        const criteria: any = {
            isDeleted: false,
        };

        if (batchFilter) {
            criteria.batchId = batchFilter;
        }

        const skip = (page - 1) * limit;

        const monitors = await findAllWithPopulate(monitorModel, criteria, {}, { skip: skip, limit: limit }, [{ path: "userId", select: "name email phoneNumber" }, { path: "batchId", select: "name isActive" }]);
        if (!monitors) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Monitors not found", {}, {}));

        const total = await countData(monitorModel, criteria);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Monitors fetched successfully", {
            monitors,
            state: {
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting monitors", {}, error.message));
    }
};

export const getMonitorById = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const monitor = await findOneAndPopulate(monitorModel, { _id: value.id, isDeleted: false }, {}, {}, [{ path: "userId", select: "name email phoneNumber" }, { path: "devoteeIds", select: "name email phoneNumber" }, { path: "batchId", select: "name isActive" }]);
        if (!monitor) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Monitor not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Monitor fetched successfully", monitor, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting monitor", {}, error.message));
    }
};

export const getBatchesByGroupId = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const batches = await findAllWithPopulate(batchModel, { groupId: value.id, isDeleted: false }, {}, {}, [{ path: 'groupId', select: "name isActive" }]);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batches fetched successfully", batches, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting batches", {}, error.message));
    }
};

export const getBatchesByMonitorId = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const batches = await findAllWithPopulate(batchModel, { monitorIds: value.id, isDeleted: false }, {}, {}, [{ path: 'monitorIds', select: "name isActive" }]);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batches fetched successfully", batches, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting batches", {}, error.message));
    }
};

export const getUnassignedDevotees = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getUnassignedDevoteesSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const monitors = await monitorModel.find({ batchId: value.batchId, isDeleted: false }).select("devoteeIds").lean();
        const assignedDevoteeIds = monitors.flatMap(m => m.devoteeIds.map(id => id.toString()));

        const unassignedDevotees = await userModel.find({
            batchId: value.batchId,
            isDeleted: false,
            _id: { $nin: assignedDevoteeIds }
        }).select("name email phoneNumber surname currentCity isVerified").lean();

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Unassigned devotees fetched successfully", unassignedDevotees, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting unassigned devotees", {}, error.message));
    }
};