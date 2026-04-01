import { apiResponse, commonIdSchema, STATUS_CODE } from '../../common';
import { attendanceModel } from '../../database';
import { countData, findAllWithPopulate, findOneAndPopulate, getFirstMatch, reqInfo, updateData } from '../../helper';
import { getAttendanceSchema, updateAttendanceSchema } from './../../validation';

export const getAttendance = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = getAttendanceSchema.validate(req.query);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const query: any = {};
        if (value.programFilter) query.programId = value.programFilter;
        if (value.startDateFilter && value.endDateFilter) {
            query.date = { $gte: value.startDateFilter, $lte: value.endDateFilter };
        } else if (value.startDateFilter) {
            query.date = { $gte: value.startDateFilter };
        } else if (value.endDateFilter) {
            query.date = { $lte: value.endDateFilter };
        }

        const skip = (value.page - 1) * value.limit;

        const attendances = await findAllWithPopulate(attendanceModel, query, {}, { skip, limit: value.limit }, [{ path: 'batchId', select: "name" }, { path: 'programId', select: "name" }]);

        const total = await countData(attendanceModel, query);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Attendances fetched successfully", {
            attendances,
            state: {
                page: value.page,
                limit: value.limit,
                totalPages: Math.ceil(total / value.limit),
            },
            totalData: total,
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching attendances", {}, error.message));
    }
};

export const getAttendanceById = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const attendance = await findOneAndPopulate(attendanceModel, { _id: value.id }, {}, {}, [{ path: 'batchId', select: "name" }, { path: 'programId', select: "name" }]);
        if (!attendance) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Attendance not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Attendance fetched successfully", attendance, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching attendance", {}, error.message));
    }
};

export const getUserAttendance = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const attendance = await findAllWithPopulate(attendanceModel, { "students.studentId": value.id }, {}, { sort: { date: -1 } }, [{ path: 'batchId', select: "name" }, { path: 'programId', select: "name" }]);

        if (!attendance) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Attendance not found", {}, {}));

        const userAttendance = attendance.map((attendance) => {
            const student = attendance.students.find((student) => student.studentId.toString() === value.id);
            if (!student) return null;
            return {
                programName: attendance.programId.name,
                attendanceId: attendance._id,
                date: attendance.date,
                isPresent: student.isPresent,
            }
        })

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Attendance fetched successfully", userAttendance, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching attendance", {}, error.message));
    }
};

export const updateAttendance = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = updateAttendanceSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const attendance = await attendanceModel.findOne({ _id: value.attendanceId });
        if (!attendance) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Attendance not found", {}, {}));

        const currentDate = new Date().toISOString().split("T")[0];
        const programDate = new Date(attendance.date).toISOString().split("T")[0];

        const currentDateObj = new Date(currentDate);
        const programDateObj = new Date(programDate);
        const diffTime = Math.abs(currentDateObj.getTime() - programDateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const isEnded = currentDate > programDate;
        if (isEnded && diffDays > 7)
            return res
                .status(STATUS_CODE.BAD_REQUEST)
                .json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Program ended more than 7 days ago. You can't update attendance!", {}, {}));

        const isStarted = currentDate < programDate;
        if (isStarted)
            return res
                .status(STATUS_CODE.BAD_REQUEST)
                .json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Program is not started Yet!", {}, {}));

        for (const studentUpdate of value.students) {
            const studentIndex = attendance.students.findIndex(
                (s) => s.studentId.toString() === studentUpdate.studentId
            );

            if (studentIndex !== -1) {
                attendance.students[studentIndex].isPresent = studentUpdate.isPresent;
            }
        }
        await attendance.save();
        await attendance.populate([{ path: 'batchId', select: "name" }, { path: 'programId', select: "name" }]);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Attendance updated successfully", attendance, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error updating attendance", {}, error.message));
    }
};

export const getAttendanceByProgramId = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = commonIdSchema.validate(req.params);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const attendance = await getFirstMatch(attendanceModel, { programId: value.id }, {}, { populate: [{ path: 'batchId', select: "name" }, { path: 'programId', select: "name" }, { path: 'students.studentId', select: "name fatherName surname phoneNumber whatsappNumber" }] });

        if (!attendance) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Attendance not found", {}, {}));

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Attendance fetched successfully", attendance, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error fetching attendance", {}, error.message));
    }
};