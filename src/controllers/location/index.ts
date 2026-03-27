import { apiResponse, commonIdSchema, STATUS_CODE } from "../../common";
import { locationModel } from "../../database";
import { countData, createData, findAllWithPopulate, reqInfo, updateData, findOneAndPopulate } from "../../helper";
import { createLocationSchema, getLocationsSchema, updateLocationSchema, getLocationsDropdownSchema } from "../../validation/location";

export const addLocation = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = createLocationSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        if (value.parentId) {
            const parentLocation = await findOneAndPopulate(locationModel, { _id: value.parentId, isDeleted: false }, {}, {}, []);
            if (!parentLocation) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Parent location not found", {}, {}));

            const existingName = await locationModel.findOne({ name: value.name, parentId: value.parentId, isDeleted: false });
            if (existingName) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Location name already exists in this parent", {}, {}));
        }

        const location = await createData(locationModel, value);
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Location item created successfully", location, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating location item", {}, error.message));
    }
}

export const updateLocation = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = updateLocationSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        if (value.parentId) {
            const parentLocation = await findOneAndPopulate(locationModel, { _id: value.parentId, isDeleted: false }, {}, {}, []);
            if (!parentLocation) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Parent location not found", {}, {}));

            const existingName = await locationModel.findOne({ name: value.name, parentId: value.parentId, isDeleted: false, _id: { $ne: value.locationId } });
            if (existingName) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Location name already exists in this parent", {}, {}));
        }

        const updatedLocation = await updateData(locationModel, { _id: value.locationId, isDeleted: false }, value, { new: true });
        if (!updatedLocation) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Location item not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Location item updated successfully", updatedLocation, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating location item", {}, error.message));
    }
}

export const deleteLocation = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const deletedLocation = await updateData(locationModel, { _id: value.id, isDeleted: false }, { isDeleted: true }, { new: true });
        if (!deletedLocation) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Location item not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Location item deleted successfully", deletedLocation, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting location item", {}, error.message));
    }
}

export const getLocations = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getLocationsSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false };
        if (value.search) query.name = { $regex: value.search, $options: "si" };
        if (value.typeFilter) query.type = value.typeFilter;
        if (value.parentIdFilter) query.parentId = value.parentIdFilter;
        if (value.isActive !== undefined) query.isActive = value.isActive;

        const skip = (value.page - 1) * value.limit;
        const locations = await findAllWithPopulate(locationModel, query, {}, { skip, limit: value.limit, sort: { name: 1 } }, [{ path: "parentId", select: "name type" }]);
        const total = await countData(locationModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Location items fetched successfully", {
            locations,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(total / value.limit),
            },
            totalData: total
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching location items", {}, error.message));
    }
}

export const getLocationsDropdown = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getLocationsDropdownSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = { isDeleted: false, isActive: true };
        if (value.search) query.name = { $regex: value.search, $options: "si" };
        if (value.typeFilter) query.type = value.typeFilter;
        if (value.parentIdFilter) query.parentId = value.parentIdFilter;
        if (value.isActive !== undefined) query.isActive = value.isActive;

        const locations = await locationModel.find(query).select("_id name type parentId").sort({ name: 1 }).lean();
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Location dropdown fetched successfully", locations, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching location dropdown", {}, error.message));
    }
}

export const getLocationById = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const location = await findOneAndPopulate(locationModel, { _id: value.id, isDeleted: false }, {}, {}, [{ path: "parentId", select: "name type" }]);
        if (!location) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Location item not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Location item fetched successfully", location, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching location item", {}, error.message));
    }
}
