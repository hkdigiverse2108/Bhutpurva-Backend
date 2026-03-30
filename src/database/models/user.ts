import mongoose from "mongoose";
import { addressModelName, batchModelName, CLASS, GENDER, ROLES, studyDetailsModelName, userModelName } from "../../common";

const classDetailsSchema = new mongoose.Schema({
    class: { type: String, enum: Object.values(CLASS), default: CLASS.TEN },
    isStudded: { type: Boolean, default: false },
    branch: { type: String },
    passingYear: { type: String },
    medium: { type: String },
    hostel: { type: Boolean, default: false },
})

const userSchema = new mongoose.Schema({
    // login info
    email: { type: String },
    password: { type: String },
    googleId: { type: String },
    authProvider: { type: String, enum: ["local", "google"], default: "local" },

    // basic info
    name: { type: String },
    fatherName: { type: String },
    surname: { type: String },
    phoneNumber: { type: String },
    whatsappNumber: { type: String },
    birthDate: { type: Date },
    gender: { type: String, enum: Object.values(GENDER), default: GENDER.MALE },
    hrNo: { type: String },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
    currentCity: { type: String },
    addressIds: [{ type: mongoose.Schema.Types.ObjectId, ref: addressModelName }],

    // personal info
    occupation: { type: String },
    professions: [{ type: String }],
    educations: [{ type: String }],
    image: { type: String },
    maritalStatus: { type: String },
    bloodGroup: { type: String },

    // academic info
    class10: classDetailsSchema,
    class12: classDetailsSchema,
    studyId: { type: mongoose.Schema.Types.ObjectId, ref: studyDetailsModelName },
    skill: { type: String },
    hobbies: { type: String },
    talents: [{ type: String }],
    awards: [{ type: String }],

    // other info
    isDeleted: { type: Boolean, default: false },
    otp: { type: String, default: "" },
    token: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: batchModelName },
    activeSessions: [{ token: { type: String }, createdAt: { type: Date, default: Date.now } }],
}, {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
})

userSchema.virtual("profileCompletion").get(function () {
    const fields = [
        "name", "fatherName", "surname", "phoneNumber", "whatsappNumber",
        "birthDate", "gender", "hrNo", "currentCity", "image",
        "occupation", "maritalStatus", "bloodGroup", "class10", "class12",
        "studyId", "skill", "hobbies", "batchId", "email"
    ];
    let completed = 0;
    fields.forEach(field => {
        if (this[field]) completed++;
    });

    // Array fields
    if (this.professions && this.professions.length > 0) completed++;
    if (this.educations && this.educations.length > 0) completed++;
    if (this.addressIds && this.addressIds.length > 0) completed++;
    if (this.talents && this.talents.length > 0) completed++;
    if (this.awards && this.awards.length > 0) completed++;

    // Boolean field
    if (this.isVerified) completed++;
    if (this.googleId) completed++;

    return Math.round((completed / 27) * 100);
});

export const userModel = mongoose.model(userModelName, userSchema);