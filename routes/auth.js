const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();
const otpStore = new Map();
const resetOtpStore = new Map();
const Users = require("../models/UserModel");
const jwt = require("jsonwebtoken");

const generateToken = (user) => {
    const JWT_KEY = process.env.JWT_SECRET_KEY;
    if (!JWT_KEY) {
        return null;
    }

    return jwt.sign(
        { ...user._doc, password: undefined },
        JWT_KEY,
        { expiresIn: "180d" }
    );
};


const buildTransporter = () => {
    const user = process.env.EMAIL_USER || process.env.EMAIL;
    const derivedHost = user && user.includes("@") ? `mail.${user.split("@")[1]}` : undefined;
    const host = process.env.EMAIL_HOST || derivedHost;
    const pass = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const port = Number(process.env.EMAIL_PORT || 587);
    const secure = String(process.env.EMAIL_SECURE).toLowerCase() === "true";

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
    });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));


////////////////////////////////// LOGIN ///////////////////////////////////

//Verify Token (JWT)
router.post("/verify-token", (req, res) => {
    const { token } = req.body || {};
    const JWT_KEY = process.env.JWT_SECRET_KEY;
    if (!JWT_KEY) {
        return res.status(500).json({ message: "JWT secret not configured" });
    }

    if (!token) {
        return res.status(401).json({ message: "No token found" });
    }

    try {
        const decoded = jwt.verify(token, JWT_KEY);
        return res.status(200).json({ message: "token valid", user: decoded });
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
});

// Login
router.post("/login", async (req, res) => {
    const { email, password } = req.body || {};
    console.log("Login attempt with email:", email);

    if (!email || !password) {
        return res.status(400).send({ message: "email and password are required" });
    }
    try {
        const user = await Users.findOne({ email }).select("+password");
        console.log(user);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.password !== password) {
            return res.status(401).json({ message: "Invalid Credentials" });
        }

        const token = generateToken(user);
        if (!token) {
            return res.status(500).json({ message: "JWT secret not configured" });
        }

        return res.status(200).send({
            message: "Logged in successfully",
            token,
            user: { ...user._doc, password: undefined },
        });
    } catch (error) {
        return res.status(500).json({ message: "Login failed" });
    }


});



////////////////////////////////// SIGNUP ///////////////////////////////////


// Send OTP to email
router.post("/send-otp", async (req, res) => {
    const { email } = req.body || {};

    if (!email) {
        return res.status(400).send({ message: "email is required" });
    }

    const existing = await Users.findOne({ email });

    if (existing) {
        return res.status(400).send({ message: "email is already registered" });
    }

    const transporter = buildTransporter();
    if (!transporter) {
        return res.status(500).send({
            message: "Email service not configured",
        });
    }

    try {
        await transporter.verify();
    } catch (error) {
        return res.status(500).send({ message: "Email service unavailable" });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    otpStore.set(email, { otp, expiresAt });

    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.EMAIL;

    try {
        await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: "Your MR Halwai verification code",
            html: `
            <div style="font-family:Arial">
                <h2>MR Halwai</h2>
                <p>Your verification code is:</p>
                <h1>${otp}</h1>
                <p>This code is valid for 5 minutes.</p>
                <p>If you didn't request this, ignore this email.</p>
            </div>`,
        });

        return res.status(200).send({ message: "OTP sent" });

    } catch (error) {
        return res.status(500).send({ message: "Failed to send OTP" });
    }
});

// Verify OTP & Register
router.post("/verify-otp", async (req, res) => {
    const { userDetail, otp } = req.body || {};

    if (!userDetail || !userDetail.fullName || !userDetail.email || !userDetail.password) {
        return res.status(400).send({ message: "Name, Email, and Password are required" });
    }

    const email = userDetail.email;
    const otpRecord = otpStore.get(email);
    if (!otpRecord) {
        return res.status(401).json({ message: "OTP expired or not found" });
    }

    if (Date.now() > otpRecord.expiresAt) {
        otpStore.delete(email);
        return res.status(401).json({ message: "OTP expired" });
    }

    if (String(otpRecord.otp) !== String(otp)) {
        return res.status(401).json({ message: "Invalid OTP" });
    }

    try {
        const response = await Users.create(userDetail);
        console.log("User registered:", response);
        otpStore.delete(email);

        const token = generateToken(response);
        if (!token) {
            return res.status(500).json({ message: "JWT secret not configured" });
        }

        return res.status(201).send({
            message: "Registered successfully",
            user: response,
            token,
        });
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({ message: "An error occurred while storing data" });
    }
});



////////////////////////////////// FORGOT PASSWORD ///////////////////////////////////


// Forgot password - send OTP
router.post("/forgot-password/send-otp", async (req, res) => {
    const { email } = req.body || {};

    if (!email) {
        return res.status(400).send({ message: "email is required" });
    }

    const existing = await Users.findOne({ email });
    if (!existing) {
        return res.status(404).send({ message: "user not found" });
    }

    const transporter = buildTransporter();
    if (!transporter) {
        return res.status(500).send({ message: "Email service not configured" });
    }

    try {
        await transporter.verify();
    } catch (error) {
        return res.status(500).send({ message: "Email service unavailable" });
    }

    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    resetOtpStore.set(email, { otp, expiresAt, verified: false, verifiedUntil: null });

    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.EMAIL;

    try {
        await transporter.sendMail({
            from: fromAddress,
            to: email,
            subject: "MR Halwai password reset code",
            html: `
            <div style="font-family:Arial">
                <h2>MR Halwai</h2>
                <p>Your password reset code is:</p>
                <h1>${otp}</h1>
                <p>This code is valid for 5 minutes.</p>
                <p>If you didn't request this, ignore this email.</p>
            </div>`,
        });

        return res.status(200).send({ message: "OTP sent" });
    } catch (error) {
        return res.status(500).send({ message: "Failed to send OTP" });
    }
});

// Forgot password - verify OTP
router.post("/forgot-password/verify-otp", async (req, res) => {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
        return res.status(400).send({ message: "email and otp are required" });
    }

    const otpRecord = resetOtpStore.get(email);
    if (!otpRecord) {
        return res.status(401).json({ message: "OTP expired or not found" });
    }

    if (Date.now() > otpRecord.expiresAt) {
        resetOtpStore.delete(email);
        return res.status(401).json({ message: "OTP expired" });
    }

    if (String(otpRecord.otp) !== String(otp)) {
        return res.status(401).json({ message: "Invalid OTP" });
    }

    otpRecord.verified = true;
    otpRecord.verifiedUntil = Date.now() + 10 * 60 * 1000;
    resetOtpStore.set(email, otpRecord);

    return res.status(200).send({ message: "OTP verified" });
});

// Forgot password - reset password after OTP verification
router.post("/forgot-password/reset", async (req, res) => {
    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
        return res.status(400).send({ message: "email and newPassword are required" });
    }

    const otpRecord = resetOtpStore.get(email);
    if (!otpRecord || !otpRecord.verified) {
        return res.status(401).json({ message: "OTP verification required" });
    }

    if (!otpRecord.verifiedUntil || Date.now() > otpRecord.verifiedUntil) {
        resetOtpStore.delete(email);
        return res.status(401).json({ message: "OTP verification expired" });
    }

    try {
        const updatedUser = await Users.findOneAndUpdate(
            { email },
            { password: newPassword },
            { new: true }
        );

        resetOtpStore.delete(email);

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).send({ message: "Password updated" });
    } catch (error) {
        return res.status(500).json({ message: "Failed to update password" });
    }
});


module.exports = router;

