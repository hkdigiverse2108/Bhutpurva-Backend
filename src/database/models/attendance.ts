import mongoose from "mongoose";
import { attendanceModelName, batchModelName, programModelName, userModelName } from "../../common";

const studentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: userModelName,
        required: true,
    },
    isPresent: {
        type: Boolean,
        default: null,
    },
}, { _id: false })

const attendanceSchema = new mongoose.Schema({
    programId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: programModelName,
        required: true,
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: batchModelName,
        required: true,
    },
    students: [studentSchema],
    date: {
        type: Date,
        required: true,
    },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true, versionKey: false })

export const attendanceModel = mongoose.model(attendanceModelName, attendanceSchema);