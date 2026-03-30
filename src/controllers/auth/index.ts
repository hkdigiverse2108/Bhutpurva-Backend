import { changePasswordSchema, googleLoginSchema } from './../../validation/auth';
import { findOneAndPopulate } from './../../helper/database-service';
import { forgotPasswordSchema, loginSchema, registerAdminSchema, registerSchema, resetPasswordSchema, verifyOtpSchema, sendOtpSchema } from "../../validation";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from 'google-auth-library';
import { apiResponse, ROLES, STATUS_CODE } from "../../common";
import { userModel, addressModel, studyDetailsModel } from "../../database";
import { email_verification_mail, generateToken, getFirstMatch, insertMany, createData, updateData, responseMessage, reqInfo, sendSms } from "../../helper";

export const registerUser = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = registerSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const isUserExist = await getFirstMatch(userModel, { phoneNumber: value.phoneNumber }, {}, {});
        if (isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, responseMessage.alreadyEmail, {}, {}));

        // value.password = await bcrypt.hash(value.password, 10); // No password for user

        let addressIds = [];
        if (value.addresses && value.addresses.length > 0) {
            const addressDocs = await insertMany(addressModel, value.addresses);
            addressIds = addressDocs.map((a) => a._id);
        }

        value.addressIds = addressIds;
        delete value.addresses;

        let studyId = null;
        if (value.study) {
            const studyData = await createData(studyDetailsModel, { classes: value.study });
            studyId = studyData._id;
        }

        value.studyId = studyId;
        delete value.study;

        const userData = await createData(userModel, value);

        const { password, otp, activeSessions, ...user } = userData.toObject();

        return res.status(STATUS_CODE.CREATED).json(new apiResponse(STATUS_CODE.CREATED, responseMessage.signupSuccess, user, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error registering user", {}, error.message));
    }
};

export const registerAdmin = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = registerAdminSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        const isUserExist = await getFirstMatch(userModel, { email: value.email }, {}, {});
        if (isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, responseMessage.alreadyEmail, {}, {}));

        value.password = await bcrypt.hash(value.password, 10);

        value.role = ROLES.ADMIN;

        const userData = await createData(userModel, value);

        const { password, otp, activeSessions, ...user } = userData.toObject();


        return res.status(STATUS_CODE.CREATED).json(new apiResponse(STATUS_CODE.CREATED, "Admin registered successfully", user, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error registering admin", {}, error.message));
    }
};

export const loginUser = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error));

        const isUserExist = await getFirstMatch(userModel, { email: value.email }, {}, {});
        if (!isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        const isPasswordValid = await bcrypt.compare(value.password, isUserExist.password);
        if (!isPasswordValid) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Invalid password", {}, {}));

        const token = generateToken(isUserExist._id.toString());

        // Add new session
        if (!isUserExist.activeSessions) {
            isUserExist.activeSessions = [] as any;
        }

        isUserExist.activeSessions.push({
            token: token,
            createdAt: new Date(),
        });

        while (isUserExist.activeSessions.length > 3) {
            isUserExist.activeSessions.shift();
        }

        await updateData(userModel, { _id: isUserExist._id }, { activeSessions: isUserExist.activeSessions }, {});

        const { password, otp, activeSessions, ...user } = isUserExist;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "User logged in successfully", { user: user, token }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error logging in user", {}, error.message));
    }
};

export const forgotPassword = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = forgotPasswordSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error));

        const isUserExist = await getFirstMatch(userModel, { email: value.email }, {}, {});
        if (!isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        const otp = Math.floor(100000 + Math.random() * 900000);

        email_verification_mail(isUserExist, otp);

        await updateData(userModel, { _id: isUserExist._id }, { otp: otp.toString() }, {});

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "OTP sent successfully", {
            user: isUserExist.email,
            otp: otp
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error forgot password", {}, error.message));
    }
};

export const sendOtp = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = sendOtpSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error));

        const isUserExist = await getFirstMatch(userModel, { phoneNumber: value.phoneNumber }, {}, {});
        if (!isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        const otp = Math.floor(100000 + Math.random() * 900000);
        await updateData(userModel, { _id: isUserExist._id }, { otp: otp.toString() }, {});

        await sendSms("+91" + value.phoneNumber, `Your OTP is ${otp}. This OTP is valid for 5 minutes.`);

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "OTP sent successfully", {}, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error sending OTP", {}, error.message));
    }
};

export const verifyOtp = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = verifyOtpSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error));

        const isUserExist = await getFirstMatch(userModel, { phoneNumber: value.phoneNumber }, {}, {});
        if (!isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        if (isUserExist.otp !== value.otp) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Invalid OTP", {}, {}));

        const token = generateToken(isUserExist._id.toString());
        await updateData(userModel, { _id: isUserExist._id }, { otp: "" }, {});

        if (!isUserExist.activeSessions) {
            isUserExist.activeSessions = [] as any;
        }

        isUserExist.activeSessions.push({
            token: token,
            createdAt: new Date(),
        });

        while (isUserExist.activeSessions.length > 3) {
            isUserExist.activeSessions.shift();
        }

        await updateData(userModel, { _id: isUserExist._id }, { activeSessions: isUserExist.activeSessions }, {});

        // get the user with populate
        const userData = await findOneAndPopulate(userModel, { _id: isUserExist._id }, {}, {}, [
            { path: "addressIds" },
            { path: "studyId" },
            { path: "batchId" },
        ]);

        const { password, otp, activeSessions, ...user } = userData;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "OTP verified successfully. Logged In.", { user, token }, {}));

    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error verifying OTP", {}, error.message));
    }
};

export const resetPassword = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = resetPasswordSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error));

        const isUserExist = await getFirstMatch(userModel, { email: value.email }, {}, {});
        if (!isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        await updateData(userModel, { _id: isUserExist._id }, { password: await bcrypt.hash(value.password, 10) }, {});

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Password reset successfully", {}, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error resetting password", {}, error.message));
    }
};

export const logoutUser = async (req, res) => {
    reqInfo(req)
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, responseMessage.tokenNotFound, {}, {}));

        const decodedToken = jwt.verify(token, process.env.JWT_TOKEN_SECRET as string);
        const userId = decodedToken.id;

        const isUserExist = await getFirstMatch(userModel, { _id: userId }, {}, {});
        if (!isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        // remove token from activeSessions
        isUserExist.activeSessions = isUserExist.activeSessions.filter((session) => session.token !== token) as any;
        await updateData(userModel, { _id: isUserExist._id }, { activeSessions: isUserExist.activeSessions }, {});

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, responseMessage.logout, {}, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error logging out user", {}, error.message));
    }
};

export const changePassword = async (req, res) => {
    reqInfo(req)
    try {
        const user = req.headers.user;

        const { error, value } = changePasswordSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error));

        const isUserExist = await getFirstMatch(userModel, { _id: user.id }, {}, {});
        if (!isUserExist) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "User not found", {}, {}));

        const isPasswordValid = await bcrypt.compare(value.oldPassword, isUserExist.password);
        if (!isPasswordValid) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Invalid password", {}, {}));

        await updateData(userModel, { _id: isUserExist._id }, { password: await bcrypt.hash(value.newPassword, 10) }, {});

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Password changed successfully", {}, {}));
    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error changing password", {}, error.message));
    }
};

export const googleLogin = async (req, res) => {
    reqInfo(req)
    try {
        const { error, value } = googleLoginSchema.validate(req.body);
        if (error) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Validation error", {}, error.details[0].message));

        let googleData: any;

        // Development Mock for Testing
        if (value.idToken === "test_token") {
            googleData = {
                sub: "test_google_id_12345",
                email: "testuser@gmail.com",
                name: "Test User",
                picture: "https://lh3.googleusercontent.com/test-profile-pic"
            };
        } else {
            // Real Verification
            if (!process.env.GOOGLE_CLIENT_ID) {
                return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json(new apiResponse(STATUS_CODE.INTERNAL_SERVER_ERROR, "Google Client ID not configured", {}, {}));
            }
            const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
            const ticket = await client.verifyIdToken({
                idToken: value.idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            googleData = ticket.getPayload();
        }

        if (!googleData) return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Invalid token", {}, {}));

        let isUserExist = await getFirstMatch(userModel, {
            $or: [
                { googleId: googleData.sub },
                { email: googleData.email }
            ]
        }, {}, {});

        if (!isUserExist) {
            // Create new user (Simplified registration for social)
            const newUser = {
                name: googleData.name,
                email: googleData.email,
                googleId: googleData.sub,
                authProvider: "google",
                image: googleData.picture,
                role: ROLES.USER,
                isVerified: true
            };
            isUserExist = await createData(userModel, newUser);
        } else if (!isUserExist.googleId) {
            // Link Google account to existing email account
            isUserExist = await updateData(userModel, { _id: isUserExist._id }, {
                googleId: googleData.sub,
                authProvider: "google"
            }, {});
        }

        const token = generateToken(isUserExist._id.toString());

        // Manage active sessions (limit to 3)
        if (!isUserExist.activeSessions) {
            isUserExist.activeSessions = [] as any;
        }

        isUserExist.activeSessions.push({
            token: token,
            createdAt: new Date(),
        });

        while (isUserExist.activeSessions.length > 3) {
            isUserExist.activeSessions.shift();
        }

        await updateData(userModel, { _id: isUserExist._id }, { activeSessions: isUserExist.activeSessions }, {});

        // Populate and return user data
        const userData = await findOneAndPopulate(userModel, { _id: isUserExist._id }, {}, {}, [
            { path: "addressIds" },
            { path: "studyId" },
            { path: "batchId" },
        ]);

        const { password, otp, activeSessions, ...user } = userData;

        return res.status(STATUS_CODE.SUCCESS).json(new apiResponse(STATUS_CODE.SUCCESS, "Google login successful", { user: user, token }, {}));

    } catch (error) {
        console.error(error);
        return res.status(STATUS_CODE.BAD_REQUEST).json(new apiResponse(STATUS_CODE.BAD_REQUEST, "Error with Google login", {}, error.message));
    }
};
