import mongoose from "mongoose";
import { surveyResponseModelName, surveyModelName, userModelName } from "../../common";

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: { type: mongoose.Schema.Types.Mixed }, // text, number, array, or boolean
}, { _id: false, versionKey: false });

const surveyResponseSchema = new mongoose.Schema({
    surveyId: { type: mongoose.Schema.Types.ObjectId, ref: surveyModelName, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: userModelName, required: true },
    answers: [answerSchema],
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

// Ensure one response per user per survey
surveyResponseSchema.index({ surveyId: 1, userId: 1 }, { unique: true });

export const surveyResponseModel = mongoose.model(surveyResponseModelName, surveyResponseSchema);
