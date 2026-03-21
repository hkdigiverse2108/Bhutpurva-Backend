import { apiResponse, commonIdSchema, STATUS_CODE } from "../../common";
import { branchModel } from "../../database";
import { countData, createData, findAllWithPopulate, reqInfo, updateData, findOneAndPopulate, getFirstMatch } from "../../helper";
import { createBranchSchema, getBranchesSchema, updateBranchSchema, getBranchesDropdownSchema } from "../../validation/branch";

export const addBranch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = createBranchSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        // check branch name already exists
        const branchExist = await getFirstMatch(branchModel, { name: { $regex: value.name, $options: "si" }, isDeleted: false }, {}, {});
        if (branchExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Branch name already exists", {}, {}));

        const branch = await createData(branchModel, value);
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Branch created successfully", branch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating branch", {}, error.message));
    }
}

export const updateBranch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = updateBranchSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const updatedBranch = await updateData(branchModel, { _id: value.branchId, isDeleted: false }, value, { new: true });
        if (!updatedBranch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Branch not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Branch updated successfully", updatedBranch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating branch", {}, error.message));
    }
}

export const deleteBranch = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const deletedBranch = await updateData(branchModel, { _id: value.id, isDeleted: false }, { isDeleted: true }, { new: true });
        if (!deletedBranch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Branch not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Branch deleted successfully", deletedBranch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting branch", {}, error.message));
    }
}

export const getBranches = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getBranchesSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false };
        if (value.search) query.name = { $regex: value.search, $options: "si" };
        if (value.isActive !== undefined) query.isActive = value.isActive;

        const skip = (value.page - 1) * value.limit;
        const branches = await findAllWithPopulate(branchModel, query, {}, { skip, limit: value.limit, sort: { name: 1 } }, []);
        const total = await countData(branchModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Branches fetched successfully", {
            branches,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(total / value.limit),
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching branches", {}, error.message));
    }
}

export const getBranchesDropdown = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getBranchesDropdownSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false, isActive: true };
        if (value.search) query.name = { $regex: value.search, $options: "si" };

        const branches = await branchModel.find(query).select("_id name").sort({ name: 1 }).lean();
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Branches dropdown fetched successfully", branches, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching branches dropdown", {}, error.message));
    }
}

export const getBranchById = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const branch = await findOneAndPopulate(branchModel, { _id: value.id, isDeleted: false }, {}, {}, []);
        if (!branch) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Branch not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Branch fetched successfully", branch, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching branch", {}, error.message));
    }
}
