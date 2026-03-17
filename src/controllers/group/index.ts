import { apiResponse, commonIdSchema, ROLES, STATUS_CODE } from "../../common";
import { batchModel, groupModel, userModel } from "../../database";
import { countData, createData, findAllWithPopulate, findOneAndPopulate, getData, reqInfo, updateData, updateMany, getFirstMatch } from "../../helper";
import { createGroupSchema, getGroupsSchema, updateGroupSchema } from "../../validation";

export const creategroup = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = createGroupSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const { batches, leaders, ...rest } = value;

        const groupData: any = { ...rest };
        if (leaders) {
            groupData.leaderIds = leaders;
        }

        const group = await createData(groupModel, groupData);

        if (leaders) {
            await updateMany(userModel, { _id: { $in: leaders } }, { $set: { role: ROLES.LEADER } }, {});
        }

        if (batches) {
            await updateMany(batchModel, { _id: { $in: batches } }, { $set: { groupId: group._id } }, {});
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Group created successfully", group, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating group", {}, error.message));
    }
};

export const updateGroup = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = updateGroupSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const previousGroup = await getFirstMatch(groupModel, { _id: value.groupId }, {}, {});

        const { batches, leaders, ...rest } = value;

        const updatePayload: any = { ...rest };
        if (leaders) {
            updatePayload.leaderIds = leaders;
        }

        const group = await updateData(groupModel, { _id: value.groupId }, updatePayload, {});
        if (!group) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Group not found", {}, {}));

        if (leaders) {
            await updateMany(userModel, { _id: { $in: leaders } }, { $set: { role: ROLES.LEADER } }, {});

            if (previousGroup && previousGroup.leaderIds) {
                const previousLeadersStr = previousGroup.leaderIds.map(id => id.toString());
                const newLeadersStr = leaders.map(id => id.toString());
                const removedLeaders = previousLeadersStr.filter(id => !newLeadersStr.includes(id));

                for (let i = 0; i < removedLeaders.length; i++) {
                    const isLeaderElsewhere = await getFirstMatch(groupModel, {
                        leaderIds: removedLeaders[i],
                        isDeleted: false
                    }, {}, {});

                    if (!isLeaderElsewhere) {
                        await updateData(userModel, { _id: removedLeaders[i] }, { $set: { role: ROLES.USER } }, {});
                    }
                }
            }
        }

        if (batches) {
            const batchesDate = await getData(batchModel, { groupId: value.groupId }, {}, {});

            if (batchesDate) {
                await updateMany(batchModel, { _id: { $in: batchesDate } }, { $unset: { groupId: value.groupId } }, {});
            }

            await updateMany(batchModel, { _id: { $in: batches } }, { $set: { groupId: value.groupId } }, {});
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Group updated successfully", group, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating group", {}, error.message));
    }
};

export const deleteGroup = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const group = await updateData(groupModel, { _id: value.id, isDeleted: false }, { $set: { isDeleted: true } }, { new: true });
        if (!group) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Group not found", {}, {}));

        await updateMany(batchModel, { groupId: group._id }, { $unset: { groupId: group._id } }, {});

        if (group.leaderIds && group.leaderIds.length > 0) {
            for (let i = 0; i < group.leaderIds.length; i++) {
                const leaderId = group.leaderIds[i].toString();
                const isLeaderElsewhere = await getFirstMatch(groupModel, {
                    leaderIds: leaderId,
                    isDeleted: false
                }, {}, {});

                if (!isLeaderElsewhere) {
                    await updateData(userModel, { _id: leaderId }, { $set: { role: ROLES.USER } }, {});
                }
            }
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Group deleted successfully", group, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting group", {}, error.message));
    }
};

export const getGroups = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getGroupsSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false };
        if (value.search && value.search != "")
            query.name = { $regex: value.search, $options: "si" };

        if (value.isActive != null && value.isActive != undefined)
            query.isActive = value.isActive;

        const skip = (value.page - 1) * value.limit;

        const groups = await findAllWithPopulate(groupModel, query, {}, { skip, limit: value.limit }, [{ path: 'leaderIds', select: "name fatherName surname phoneNumber whatsappNumber" }]);

        const total = await countData(groupModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Groups fetched successfully", {
            groups,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(total / value.limit),
            },
            totalData: total,
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting groups", {}, error.message));
    }
};

export const getGroupById = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const group: any = await findOneAndPopulate(groupModel, { _id: value.id }, {}, {}, [{ path: 'leaderIds', select: "name fatherName surname phoneNumber whatsappNumber" }]);
        if (!group) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Group not found", {}, {}));

        const batches = await getData(batchModel, { groupId: group._id, isDeleted: false }, {}, {});
        group.batches = batches;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Group fetched successfully", group, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting group", {}, error.message));
    }
};