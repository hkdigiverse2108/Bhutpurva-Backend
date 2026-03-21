import mongoose from "mongoose";
import { groupModelName, userModelName } from "../../common";

const groupSchema = new mongoose.Schema({
    name: { type: String },
    leaderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: userModelName }],
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false })

export const groupModel = mongoose.model(groupModelName, groupSchema);