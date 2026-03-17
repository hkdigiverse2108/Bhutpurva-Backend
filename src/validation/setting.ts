import joi from "joi";

export const settingSchema = joi.object({
    logo: joi.string().optional(),
    appName: joi.string().optional(),
    webSiteUrl: joi.string().optional(),
    supportEmail: joi.string().optional(),
    supportPhone: joi.string().optional(),
    supportWhatsApp: joi.string().optional(),
    address: joi.string().optional(),
    playStoreId: joi.string().optional(),
    appStoreId: joi.string().optional(),
    playStoreUrl: joi.string().optional(),
    appStoreUrl: joi.string().optional(),
    sgsiPdf: joi.string().optional(),
    anubhutiImage: joi.string().optional(),
    lifeLightImage: joi.string().optional(),
    socialLinks: joi.object({
        facebook: joi.string().optional(),
        instagram: joi.string().optional(),
        twitter: joi.string().optional(),
        linkedin: joi.string().optional(),
        youtube: joi.string().optional(),
        whatsapp: joi.string().optional(),
    }).optional(),
});