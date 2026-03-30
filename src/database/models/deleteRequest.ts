import mongoose from "mongoose";
import { DELETE_REQUEST_STATUS, deleteRequestModelName, userModelName } from "../../common";

const deleteRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: userModelName },
    status: { type: String, enum: Object.values(DELETE_REQUEST_STATUS), default: DELETE_REQUEST_STATUS.PENDING },
}, { timestamps: true, versionKey: false });

export const deleteRequestModel = mongoose.model(deleteRequestModelName, deleteRequestSchema);
