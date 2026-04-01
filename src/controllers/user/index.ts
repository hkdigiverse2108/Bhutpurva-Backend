import { apiResponse, DELETE_REQUEST_STATUS, ROLES, STATUS_CODE } from "../../common";
import { addressModel, studyDetailsModel, userModel, deleteRequestModel, groupModel, batchModel } from "../../database";
import { countData, createData, findAllWithPopulate, findOneAndPopulate, getFirstMatch, reqInfo, responseMessage, updateData, deleteFile } from "../../helper";
import { deleteUserSchema, getAllUsersSchema, getUserByIdSchema, updateImageSchema, updateUserSchema, getUsersDropdownSchema, searchUserByPhoneSchema } from "../../validation";
import bcrypt from "bcryptjs";

export const getAllUsers = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getAllUsersSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const user = req.headers.user;

        const { page, limit, search, roleFilter, isVerified, isDeleted } = value;

        const query: any = { isDeleted: isDeleted };

        if (user.role === ROLES.USER) {
            query._id = user._id;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "si" } },
                { surname: { $regex: search, $options: "si" } },
                { fatherName: { $regex: search, $options: "si" } },
            ];
        }

        if (roleFilter) {
            query.role = { $in: roleFilter };
        } else {
            query.role = { $ne: ROLES.ADMIN }
        }

        if (isVerified) {
            query.isVerified = isVerified;
        }

        const skip = (page - 1) * limit;

        const users = await findAllWithPopulate(userModel, query, {}, { skip, limit }, [{ path: "batchId", select: "name isActive" }, { path: "addressIds" }, { path: "studyId" }]);
        const totalUsers = await countData(userModel, query);

        // remove password and other sensitive data
        const usersData = users.map((user: any) => {
            const { password, activeSessions, ...data } = user;
            return data;
        });

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Users fetched successfully", {
            users: usersData,
            state: {
                page,
                limit,
                totalPages: Math.ceil(totalUsers / limit),
            },
            totalData: totalUsers,
        }, {}));

    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching users", {}, error.message));
    }
};

export const getUsersDropdown = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getUsersDropdownSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const { search, roleFilter, isUnassigned } = value;

        const query: any = { isDeleted: false };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "si" } },
                { surname: { $regex: search, $options: "si" } },
                { fatherName: { $regex: search, $options: "si" } },
            ];
        }

        if (value.roleFilter && value.roleFilter.length > 0) {
            query.role = { $in: value.roleFilter };
        } else {
            query.role = { $ne: ROLES.ADMIN };
        }

        if (isUnassigned) {
            if (!value.roleFilter || value.roleFilter.includes(ROLES.USER)) {
                const unassignedCondition = {
                    $or: [
                        { batchId: { $exists: false } },
                        { batchId: null }
                    ]
                };

                if (query.$or) {
                    const searchOr = query.$or;
                    delete query.$or;
                    query.$and = [
                        { $or: searchOr },
                        unassignedCondition
                    ];
                } else {
                    query.$or = unassignedCondition.$or;
                }
            }
        }

        // Fetch minimal fields suitable for a dropdown
        const users = await userModel.find(query).select("_id name surname fatherName role").lean();

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Users dropdown fetched successfully", users, {}));

    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching users for dropdown", {}, error.message));
    }
};

export const updateUser = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = updateUserSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const existingUser = await getFirstMatch(userModel, { _id: value.userId, isDeleted: false }, {}, {});
        if (!existingUser) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        if (value.email) {
            const isUserExist = await getFirstMatch(userModel, {
                email: value.email,
                isDeleted: false,
                _id: { $ne: value.userId },
            }, {}, {});
            if (isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, responseMessage.alreadyEmail, {}, {}));
        }

        const updatePayload = { ...value };
        delete updatePayload.userId;

        const addressIds = [];

        if (
            Array.isArray(updatePayload.addresses) &&
            updatePayload.addresses.length > 0
        ) {
            for (const address of updatePayload.addresses) {
                // UPDATE existing address
                if (address.id) {
                    const { id, ...addressUpdate } = address;

                    await updateData(addressModel, { _id: id }, addressUpdate, {});

                    addressIds.push(id);
                }
                // CREATE new address
                else {
                    const newAddress: any = await createData(addressModel, address);
                    addressIds.push(newAddress._id);
                }
            }
        }

        // assign ids only
        updatePayload.addressIds = addressIds;

        delete updatePayload.addresses;

        updatePayload.educations = updatePayload.education;
        delete updatePayload.education;

        if (updatePayload.study) {
            if (updatePayload.studyId) {
                await updateData(studyDetailsModel, { _id: updatePayload.studyId }, { classes: updatePayload.study }, {});
            } else {
                const studyData = await createData(studyDetailsModel, { classes: updatePayload.study });
                updatePayload.studyId = studyData._id;
            }
        }

        const updatedUser = await updateData(userModel, { _id: value.userId }, updatePayload, {});

        const user = await findOneAndPopulate(userModel, { _id: value.userId }, {}, {}, [{ path: "batchId", select: "name isActive" }, { path: "addressIds" }, { path: "studyId" }]);

        const { password, activeSessions, ...rest } = user;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, responseMessage?.updateDataSuccess("User"), rest, {}));

    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, responseMessage?.internalServerError, {}, error.message));
    }
};

export const updateImage = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = updateImageSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const existingUser = await getFirstMatch(userModel, { _id: value.userId, isDeleted: false }, {}, {});
        if (!existingUser) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        if (existingUser.image && existingUser.image !== value.image) {
            deleteFile(existingUser.image);
        }

        const updatedUser = await updateData(userModel, { _id: value.userId }, { image: value.image }, {});

        const { password, activeSessions, ...rest } = updatedUser;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Image updated successfully", rest, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating image", {}, error.message));
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { error, value } = deleteUserSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const existingUser = await getFirstMatch(userModel, { _id: value.userId, isDeleted: false }, {}, {});
        if (!existingUser) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        const isDeleteRequestExist = await getFirstMatch(deleteRequestModel, { userId: value.userId, status: DELETE_REQUEST_STATUS.PENDING }, {}, {});
        if (isDeleteRequestExist)
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Delete request already exists", {}, {}));

        const deleteRequest = await createData(deleteRequestModel, { userId: value.userId });

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "User delete request sent successfully", deleteRequest, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting user", {}, error.message));
    }
};

export const getUserById = async (req, res) => {
    try {
        const { error, value } = getUserByIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const existingUser = await findOneAndPopulate(userModel, { _id: value.id, isDeleted: false }, {}, {}, [{ path: "addressIds" }]);

        if (!existingUser) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        const { password, activeSessions, studyId, otp, isDeleted, ...rest } = existingUser;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "User fetched successfully", rest, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching user", {}, error.message));
    }
};

export const searchUserByPhone = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = searchUserByPhoneSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const user = await userModel.findOne({ phoneNumber: value.phone, isDeleted: false }, { _id: 1, name: 1, phoneNumber: 1 });
        if (!user) return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "User not found", {}, {}));

        if (user._id.toString() === req.headers.user._id.toString()) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "You cannot add yourself as a family member", {}, {}));
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "User fetched successfully", user, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error searching user", {}, error.message));
    }
}


