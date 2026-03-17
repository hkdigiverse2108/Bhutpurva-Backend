import { apiResponse, batchModelName, commonIdSchema, monitorModelName, ROLES, STATUS_CODE, userModelName } from "../../common";
import { batchModel, userModel } from "../../database";
import { monitorModel, attendanceModel } from "../../database";
import { countData, createData, findAllWithPopulate, findOneAndPopulate, getFirstMatch, updateData, reqInfo } from "../../helper";
import { addDevoteeSchema, assignDevoteeSchema, createBatchSchema, createMonitorSchema, getBatchsSchema, getMonitorSchema, removeDevoteeSchema, unassignDevoteeSchema, updateBatchSchema, getBatchesDropdownSchema } from "../../validation"

export const createBatch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = createBatchSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const batch = await createData(batchModel, value);
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

        const batch = await updateData(batchModel, { _id: value.id, isDeleted: false }, { isDeleted: true }, { new: true });
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batch deleted successfully", batch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting batch", {}, error.message));
    }
}

export const getBatches = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getBatchsSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = {
            isDeleted: false
        }

        if (value.search)
            query.name = { $regex: value.search, $options: "si" };

        if (value.groupFilter)
            query.group = value.groupFilter;

        if (value.isActive != null && value.isActive !== undefined)
            query.isActive = value.isActive;

        const skip = (value.page - 1) * value.limit;

        const batch = await findAllWithPopulate(
            batchModel,
            query,
            { _id: 1, name: 1, group: 1, isActive: 1, createdAt: 1 },
            { skip, limit: value.limit },
            { 
               path: "monitorIds",
               populate: { path: "userId", select: "name email surname" }
            }
        );
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        const total = await countData(batchModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Batch fetched successfully", {
            batch,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(total / value.limit),
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

        const batch = await findOneAndPopulate(
            batchModel,
            { _id: value.id, isDeleted: false },
            { _id: 1, name: 1, group: 1, isActive: 1, createdAt: 1 },
            {},
            { 
                path: "monitorIds",
                populate: { path: "userId", select: "name email surname" }
            }
        );
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

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

        const batch = await getFirstMatch(batchModel, { _id: value.batchId, isDeleted: false }, {}, {});
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

        const user = await updateData(userModel, { _id: value.devoteeId, isDeleted: false }, { batchId: null }, { new: true });
        if (!user) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        // Sync future attendance records
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await updateData(
            attendanceModel,
            { batchId: value.batchId, date: { $gte: today } },
            {
                $pull: {
                    students: { studentId: value.devoteeId }
                }
            },
            { multi: true }
        );

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

        if (user.role !== ROLES.MONITOR && user.role !== ROLES.LEADER) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User does not have the required MONITOR or LEADER role.", {}, {}));
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

        const batch = await updateData(batchModel, { _id: monitor.batchId }, { $pull: { monitorIds: monitor._id } }, { new: true });
        if (!batch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Batch not found", {}, {}));

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

        const monitor = await updateData(monitorModel, { _id: value.monitorId }, { $addToSet: { devoteeIds: { $each: value.devoteeIds } } }, { new: true });
        if (!monitor) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Monitor not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Devotee assigned to batch successfully", monitor, {}));
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

        const monitor = await updateData(monitorModel, { _id: value.monitorId }, { $pull: { devoteeIds: { $each: value.devoteeIds } } }, { new: true });
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

        const monitors = await findAllWithPopulate(monitorModel, criteria, {}, { skip: skip, limit: limit }, [{ path: userModelName, select: "name email" }, { path: batchModelName, select: "name isActive" }]);
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

        const monitor = await findOneAndPopulate(monitorModel, { _id: value.id, isDeleted: false }, {}, {}, [{ path: "devoteeIds", select: "name email" }, { path: "batchId", select: "name isActive" }]);
        if (!monitor) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Monitor not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Monitor fetched successfully", monitor, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting monitor", {}, error.message));
    }
};