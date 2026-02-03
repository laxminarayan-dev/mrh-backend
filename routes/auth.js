const express = require("express");
const nodemailer = require("nodemailer");
const router = express.Router();

const users = [];
const otpStore = new Map();

const sanitizeUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
});

const generateToken = (user) => {
    const raw = `${user.id}:${user.email}:${Date.now()}`;
    return Buffer.from(raw).toString("base64");
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

// Register
router.post("/register", (req, res) => {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
        return res.status(400).send({ message: "name, email, and password are required" });
    }

    const existing = users.find((u) => u.email === email);
    if (existing) {
        return res.status(409).send({ message: "email already registered" });
    }

    const newUser = {
        id: `U-${Date.now()}`,
        name,
        email,
        password,
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    return res.status(201).send({
        message: "registered",
        user: sanitizeUser(newUser),
    });
});

// Login
router.post("/login", (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !password) {
        return res.status(400).send({ message: "email and password are required" });
    }

    const user = users.find((u) => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).send({ message: "invalid credentials" });
    }

    const token = generateToken(user);
    return res.status(200).send({
        message: "logged in",
        token,
        user: sanitizeUser(user),
    });
});

// Get all users (for development/demo)
router.get("/users", (req, res) => {
    res.send(users.map(sanitizeUser));
});

// Send OTP to email
router.post("/send-otp", async (req, res) => {
    const { email } = req.body || {};

    if (!email) {
        return res.status(400).send({ message: "email is required" });
    }

    const transporter = buildTransporter();
    if (!transporter) {
        return res.status(500).send({
            message: "email service not configured",
        });
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
      </div>
    `,
        });

        return res.status(200).send({ message: "otp sent" });
    } catch (error) {
        return res.status(500).send({ message: "failed to send otp" });
    }
});

module.exports = router;

