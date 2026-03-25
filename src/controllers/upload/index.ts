import { ALLOWED_FILE_TYPES, apiResponse, FILE_TYPE, STATUS_CODE } from "../../common";
import path from "path";
import fs from "fs";
import { getFilesValidator } from "../../validation";
import { reqInfo } from "../../helper";

export const uploadImages = async (req, res) => {
    reqInfo(req);
    try {
        // Handling deletion of old images if provided in form data
        let { oldImages } = req.body;
        if (oldImages) {
            // Converting single string to array if necessary
            const imagesToDelete = Array.isArray(oldImages) ? oldImages : [oldImages];

            imagesToDelete.forEach(imagePath => {
                if (imagePath && typeof imagePath === 'string') {
                    const filename = path.basename(imagePath);
                    const filePath = path.join(process.cwd(), "uploads", filename);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (err) {
                            console.error(`Error deleting file ${filePath}:`, err);
                        }
                    }
                }
            });
        }

        if (!req.files || (req.files as any[]).length === 0) {
            return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Old files handled, no new files uploaded.", { files: [] }, {}));
        }

        const files = req.files as any[];
        const fileUrls = files.map((file) => {
            // Assuming the server serves static files from the 'uploads' directory
            // Modify this URL construction based on your actual server setup
            return `uploads/${file.filename}`;
        });

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Files uploaded successfully.", { files: fileUrls }, {}));
    } catch (error) {
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, error.message, {}, error));
    }
};

export const getImages = async (req, res) => {
    reqInfo(req);
    try {
        const { error, value } = getFilesValidator.validate(req.query);
        if (error) {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, error.details[0].message, {}, {}));
        }
        const { page, limit, type } = value;

        const skip = (page - 1) * limit;
        const directoryPath = path.join(process.cwd(), "uploads");

        fs.readdir(directoryPath, (err, files) => {
            if (err) {
                return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, err.message, {}, err));
            }

            if (type) {
                if (type === FILE_TYPE.IMAGE) {
                    files = files.filter(file => file.endsWith(".jpg") || file.endsWith(".jpeg") || file.endsWith(".png"));
                } else if (type === FILE_TYPE.PDF) {
                    files = files.filter(file => file.endsWith(".pdf"));
                }
            }

            // Filter out non-file entries if necessary
            const fileNames = files.filter(file => fs.statSync(path.join(directoryPath, file)).isFile());
            const fileUrls = fileNames.map(file => `uploads/${file}`);
            const paginatedFiles = limit ? fileUrls.slice(skip, skip + limit) : fileUrls;

            return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Files fetched successfully.", {
                files: paginatedFiles,
                state: {
                    page,
                    limit,
                    totalPages: Math.ceil(fileUrls.length / limit),
                },
                totalData: fileUrls.length
            }, {}));
        });
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, error.message, {}, error));
    }
};

export const deleteImage = async (req, res) => {
    reqInfo(req);
    try {
        const { url, filename } = req.body;
        let fileToDelete = "";

        if (filename) {
            fileToDelete = filename;
        } else if (url) {
            // Extract filename from URL
            // Assuming URL format: .../uploads/filename.ext or just uploads/filename.ext
            const parts = url.split('/');
            fileToDelete = parts[parts.length - 1];
        } else {
            return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Please provide 'url' or 'filename' to delete.", {}, {}));
        }

        // Prevent directory traversal attacks
        const safeFilename = path.basename(fileToDelete);
        const filePath = path.join(process.cwd(), "uploads", safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(STATUS_CODE.NOT_FOUND).json(new apiResponse(STATUS_CODE.NOT_FOUND, "File not found.", {}, {}));
        }

        fs.unlinkSync(filePath);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "File deleted successfully.", {}, {}));
    } catch (error: any) {
        return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, error.message, {}, error));
    }
};