const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const User = require("../models/UserModel");
const mongoose = require("mongoose");

// Protect all routes below with auth middleware
router.use(authMiddleware);

router.post("/update/cart", async (req, res) => {
    console.log("STEP 1: Route hit");

    try {
        const items = req.body.items.map(item => ({
            ...item,
            _id: new mongoose.Types.ObjectId(item._id),
        }));

        const result = await User.findOneAndUpdate(
            { email: req.user.email },
            { $set: { cart: items } },
            { new: true }
        );

        return res.json({ success: true });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/cart", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.user.email });
        return res.json({ success: true, cart: user.cart });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.post("/save-address", async (req, res) => {
    try {
        const { coordinates, formattedAddress, isDefault } = req.body;
        if (!coordinates || !formattedAddress) {
            return res.status(400).json({ error: "Coordinates and formatted address are required" });
        }
        const newAddress = {
            _id: new mongoose.Types.ObjectId(),
            coordinates,
            formattedAddress,
            isDefault
        };
        const user = await User.findOne({ email: req.user.email });
        if (isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }
        user.addresses.push(newAddress);
        await user.save();
        return res.json({ success: true, address: newAddress });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;