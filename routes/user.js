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
        console.log("STEP 2: Email:", req.user.email);
        console.log("STEP 3: Items:", req.body.items);
        const items = req.body.items.map(item => ({
            ...item,
            _id: new mongoose.Types.ObjectId(item._id),
        }));
        console.log("STEP 4: Before DB");

        const result = await User.findOneAndUpdate(
            { email: req.user.email },
            { $set: { cart: items } },
            { new: true }
        );

        console.log("STEP 5: After DB", result);

        return res.json({ success: true });
    } catch (err) {
        console.log("STEP 6: ERROR", err);
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