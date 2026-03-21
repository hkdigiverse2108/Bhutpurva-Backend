import mongoose from "mongoose";
import { locationModelName, LOCATION_TYPE } from "../../common";

const locationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: Object.values(LOCATION_TYPE), required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: locationModelName },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true, versionKey: false });

export const locationModel = mongoose.model(locationModelName, locationSchema);
