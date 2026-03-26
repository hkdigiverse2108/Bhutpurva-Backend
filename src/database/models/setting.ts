import mongoose from "mongoose";
import { settingModelName } from "../../common";

const settingSchema = new mongoose.Schema({
    logo: { type: String, default: "" },
    appName: { type: String, default: "" },
    webSiteUrl: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    supportPhone: { type: String, default: "" },
    supportWhatsApp: { type: String, default: "" },
    address: { type: String, default: "" },
    playStoreId: { type: String, default: "" },
    appStoreId: { type: String, default: "" },
    playStoreUrl: { type: String, default: "" },
    appStoreUrl: { type: String, default: "" },
    sgsiPdf: { type: String, default: "" },
    anubhutiImage: { type: String, default: "" },
    lifeLightImage: { type: String, default: "" },
    // socials
    socialLinks: {
        type: {
            facebook: { type: String, default: "" },
            instagram: { type: String, default: "" },
            twitter: { type: String, default: "" },
            linkedin: { type: String, default: "" },
            youtube: { type: String, default: "" },
            whatsapp: { type: String, default: "" },
        },
        default: {}
    }
}, { timestamps: true, versionKey: false });

export const Setting = mongoose.model(settingModelName, settingSchema);