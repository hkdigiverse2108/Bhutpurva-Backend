import { apiResponse, commonIdSchema, ROLES, STATUS_CODE } from "../../common";
import { batchModel, groupModel, userModel } from "../../database";
import { countData, createData, findAllWithPopulate, findOneAndPopulate, getData, reqInfo, updateData, updateMany, getFirstMatch } from "../../helper";
import { createGroupSchema, getGroupsSchema, updateGroupSchema, getGroupsDropdownSchema } from "../../validation";

export const creategroup = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = createGroupSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const { batches, leaders, ...rest } = value;

        const groupData: any = { ...rest };
        if (leaders) {
            const validLeadersCount = await countData(userModel, { _id: { $in: leaders }, role: ROLES.LEADER, isDeleted: false });
            if (validLeadersCount !== leaders.length) {
                return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "One or more assigned users do not have the LEADER role.", {}, {}));
            }
            groupData.leaderIds = leaders;
        }

        const isGroupExist = await countData(groupModel, { name: value.name, isDeleted: false });
        if (isGroupExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Group already exists", {}, {}));

        const group = await createData(groupModel, groupData);

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
            const validLeadersCount = await countData(userModel, { _id: { $in: leaders }, role: ROLES.LEADER, isDeleted: false });
            if (validLeadersCount !== leaders.length) {
                return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "One or more assigned users do not have the LEADER role.", {}, {}));
            }
            updatePayload.leaderIds = leaders;
        }

        const group = await updateData(groupModel, { _id: value.groupId }, updatePayload, {});
        if (!group) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Group not found", {}, {}));

        if (batches) {
            const batchesDate = await getData(batchModel, { groupId: value.groupId }, {}, {});

            if (batchesDate && batchesDate.length > 0) {
                const batchIds = batchesDate.map(b => b._id);
                await updateMany(batchModel, { _id: { $in: batchIds } }, { $unset: { groupId: 1 } }, {});
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

        await updateMany(batchModel, { groupId: group._id }, { $unset: { groupId: 1 } }, {});

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

        const groupIds = groups.map((g: any) => g._id);
        const batches = await batchModel.find({ groupId: { $in: groupIds }, isDeleted: false }).select("_id name groupId isActive");

        const groupsWithBatches = groups.map((group: any) => {
            const groupBatches = batches.filter(b => String(b.groupId) === String(group._id));
            return {
                ...group.toObject ? group.toObject() : group,
                batches: groupBatches,
                batchCount: groupBatches.length
            };
        });

        const total = await countData(groupModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Groups fetched successfully", {
            groups: groupsWithBatches,
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

export const getGroupsDropdown = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getGroupsDropdownSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false };
        if (value.search && value.search != "")
            query.name = { $regex: value.search, $options: "si" };

        if (value.isActive != null && value.isActive != undefined)
            query.isActive = value.isActive;

        const groups = await groupModel.find(query).select("_id name isActive").lean();

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Groups dropdown fetched successfully", groups, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting groups for dropdown", {}, error.message));
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

export const getGroupsByLeaderId = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const groups = await findAllWithPopulate(groupModel, { leaderIds: value.id, isDeleted: false }, {}, {}, [{ path: 'leaderIds', select: "name fatherName surname phoneNumber whatsappNumber" }]);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Groups fetched successfully", groups, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error getting groups", {}, error.message));
    }
};