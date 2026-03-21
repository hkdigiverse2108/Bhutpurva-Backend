import mongoose from "mongoose";
import { branchModelName } from "../../common";

const branchSchema = new mongoose.Schema({
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

export const branchModel = mongoose.model(branchModelName, branchSchema);
