import mongoose from "mongoose";
import { surveyModelName, groupModelName, batchModelName, userModelName, SURVEY_SCOPE, SURVEY_QUESTION_TYPE } from "../../common";

const questionSchema = new mongoose.Schema({
    questionText: { type: String, required: true },
    questionType: {
        type: String,
        enum: Object.values(SURVEY_QUESTION_TYPE),
        default: SURVEY_QUESTION_TYPE.TEXT,
    },
    options: [{ type: String }], // for multiple_choice / single_choice
    isRequired: { type: Boolean, default: true },
}, { _id: true, versionKey: false });

const surveySchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    scope: {
        type: String,
        enum: Object.values(SURVEY_SCOPE),
        default: SURVEY_SCOPE.OVERALL,
    },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: groupModelName, default: null },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: batchModelName, default: null },
    questions: [questionSchema],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: userModelName },
}, { timestamps: true, versionKey: false });

export const surveyModel = mongoose.model(surveyModelName, surveySchema);
