import { createData, getFirstMatch, updateData } from "../../helper";
import { addFamilySchema, updateFamilySchema } from "../../validation";
import { familyModel, userModel } from "../../database";
import { apiResponse, ROLES, STATUS_CODE } from "../../common";

export const getFamily = async (req, res) => {
    try {
        const user = req.headers.user;


        const familyData = await getFirstMatch(familyModel, { userId: user._id }, {}, {});
        if (!familyData) {
            return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "Family not found", {}, "Family not found"));
        }

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Family fetched successfully", familyData, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
    }
}

export const addFamily = async (req, res) => {
    try {
        const { error, value } = addFamilySchema.validate(req.body);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));
        }
        const { userId, members } = value;

        const user = await getFirstMatch(userModel, { _id: userId }, {}, {});
        if (!user) {
            return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "User not found", {}, "User not found"));
        }

        const familyData = await getFirstMatch(familyModel, { userId }, {}, {});
        if (familyData) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Family already exists", {}, "Family already exists"));
        }

        const family = await createData(familyModel, { userId, members });
        return res.status(STATUS_CODE.CREATED).json(new apiResponse(STATUS_CODE.CREATED, "Family added successfully", family, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
    }
};

export const updateFamily = async (req, res) => {
    try {
        const { error, value } = updateFamilySchema.validate(req.body);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));
        }
        const { familyId, members } = value;

        const familyData = await getFirstMatch(familyModel, { _id: familyId }, {}, {});
        if (!familyData) {
            return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "Family not found", {}, "Family not found"));
        }

        const reqUser = req.headers.user;

        if (reqUser.role == ROLES.USER) {
            if (familyData.userId.toString() !== reqUser._id.toString()) {
                return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "You can not update other user's family", {}, {}));
            }
        }

        const family = await updateData(familyModel, { _id: familyId }, { members }, { new: true });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Family updated successfully", family, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Internal server error", {}, error));
    }
};
