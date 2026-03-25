import mongoose from "mongoose";
import { attendanceModel, batchModel, programModel, userModel } from "../../database";
import { countData, createData, findAllWithPopulate, findOneAndPopulate, getData, getFirstMatch, reqInfo, updateData } from "../../helper";
import { apiResponse, commonIdSchema, STATUS_CODE } from "../../common";
import { createProgramSchema, getProgramsSchema, updateProgramSchema } from "../../validation";

export const createProgram = async (req, res) => {
    reqInfo(req)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { error, value } = createProgramSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const program = await createData(programModel, value, { session });

        const students = await getData(userModel, { batchId: value.batchId, isDeleted: false }, {}, { session });

        const attendance = await createData(attendanceModel, {
            programId: program._id,
            batchId: value.batchId,
            students: students.map((student) => ({ studentId: student._id })),
            date: value.date
        }, { session });

        if (!attendance) {
            throw new Error("Attendance not created");
        }

        await session.commitTransaction();
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Program created successfully", program, {}));
    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error creating program", {}, error.message));
    } finally {
        session.endSession();
    }
};

export const updateProgram = async (req, res) => {
    reqInfo(req)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { error, value } = updateProgramSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const existingProgram = await getFirstMatch(programModel, { _id: value.programId, isDeleted: false }, {}, { session });
        if (!existingProgram) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Program not found", {}, {}));

        const isDateChanged = value.date && new Date(value.date).toISOString() !== new Date(existingProgram.date).toISOString();
        const isBatchChanged = value.batchId && value.batchId !== existingProgram.batchId.toString();

        let attendanceUpdate: any = {};

        if (isBatchChanged) {
            const students = await getData(userModel, { batchId: value.batchId, isDeleted: false }, {}, { session });
            attendanceUpdate.batchId = value.batchId;
            attendanceUpdate.students = students.map((student) => ({ studentId: student._id }));
        }

        if (isDateChanged) {
            attendanceUpdate.date = value.date;
        }

        if (Object.keys(attendanceUpdate).length > 0) {
            await updateData(attendanceModel, { programId: value.programId, isDeleted: false }, attendanceUpdate, { session });
        }

        const updatePayload = { ...value };
        delete updatePayload.programId;

        const updatedProgram = await updateData(programModel, { _id: value.programId }, updatePayload, { session, new: true });

        await session.commitTransaction();
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Program updated successfully", updatedProgram, {}));
    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating program", {}, error.message));
    } finally {
        session.endSession();
    }
};

export const getPrograms = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getProgramsSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        let query: any = { isDeleted: false };

        if (value.batchFilter) {
            query.batchId = value.batchFilter;
        }

        if (value.search) {
            query.name = { $regex: value.search, $options: "si" };
        }

        const skip = (value.page - 1) * value.limit;

        const programs = await findAllWithPopulate(programModel, query, {}, { skip, limit: value.limit }, [{ path: "batchId", select: "name isActive" }]);

        const totalCount = await countData(programModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Programs fetched successfully", {
            programs,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(totalCount / value.limit),
            },
            totalData: totalCount,
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching programs", {}, error.message));
    }
};

export const getProgramById = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const program = await findOneAndPopulate(programModel, { _id: value.id, isDeleted: false }, {}, {}, [{ path: "batchId", select: "name isActive" }]);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Program fetched successfully", program, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching program", {}, error.message));
    }
};

export const deleteProgram = async (req, res) => {
    reqInfo(req)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const program = await updateData(programModel, { _id: value.id, isDeleted: false }, { isDeleted: true }, { session });
        if (!program) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Program not found", {}, {}));

        await updateData(attendanceModel, { programId: value.id, isDeleted: false }, { isDeleted: true }, { session });

        await session.commitTransaction();
        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Program deleted successfully", program, {}));
    } catch (error) {
        await session.abortTransaction();
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error deleting program", {}, error.message));
    } finally {
        session.endSession();
    }
};
