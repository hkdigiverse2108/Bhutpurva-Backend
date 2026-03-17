import { apiResponse, STATUS_CODE } from "../../common";
import { bannerModel } from "../../database";
import { createData, getData, getFirstMatch, reqInfo, responseMessage, updateData } from "../../helper";
import { createBannerSchema, updateBannerSchema, getBannerByIdSchema } from "../../validation";

export const createBanner = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = createBannerSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const newBanner = await createData(bannerModel, value);
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Banner created successfully", newBanner, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating banner", {}, error.message));
    }
};

export const getAllBanners = async (req, res) => {
    reqInfo(req);
    try {
        const banners = await getData(bannerModel, { isDeleted: false }, {}, {}); // Soft delete check
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Banners fetched successfully", banners, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching banners", {}, error.message));
    }
};

export const getBannerById = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getBannerByIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const banner = await getFirstMatch(bannerModel, { _id: value.id, isDeleted: false }, {}, {});
        if (!banner) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Banner not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Banner fetched successfully", banner, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching banner", {}, error.message));
    }
};

export const updateBanner = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = updateBannerSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const existingBanner = await getFirstMatch(bannerModel, { _id: value.id, isDeleted: false }, {}, {});
        if (!existingBanner) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Banner not found", {}, {}));

        const updatePayload = { ...value };
        delete updatePayload.id;

        const updatedBanner = await updateData(bannerModel, { _id: value.id }, updatePayload, { new: true });
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Banner updated successfully", updatedBanner, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating banner", {}, error.message));
    }
};

export const deleteBanner = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getBannerByIdSchema.validate(req.params); // Reusing getById schema as it only needs ID
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const existingBanner = await getFirstMatch(bannerModel, { _id: value.id, isDeleted: false }, {}, {});
        if (!existingBanner) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Banner not found", {}, {}));

        // Soft delete
        await updateData(bannerModel, { _id: value.id }, { isDeleted: true }, {});
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Banner deleted successfully", {}, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting banner", {}, error.message));
    }
};
