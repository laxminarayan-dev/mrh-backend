const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const authMiddleware = require("../middlewares/authMiddleware");

const orderData = []
router.get("/:orderId", (req, res) => {
    const orderId = req.params.orderId;
    const result = orderData.find(orders => orders.orderId == orderId)
    res.send(result)
})

// GET all orders
router.get("/", (req, res) => {
    console.log("log check");
    res.send(orderData);
})

// Add new order
router.post("/add", (req, res) => {
    console.log(req.body);
    try {
        orderData.push(req.body)
        res.send({ "message": "added" })
    } catch (error) {
        res.sendStatus(500)
    }
})

// PUT update order
router.put("/update", (req, res) => {
    const updatedOrder = req.body
    const index = orderData.findIndex(order => order.orderId === req.body.orderId);

    if (index !== -1) {
        orderData[index] = { ...orderData[index], ...updatedOrder };
        res.status(200).send(req.body)
    } else {
        res.status(500).send("Internal Server Error");
    }
})

// DELETE order
router.delete("/:orderId", authMiddleware, (req, res) => {
    const orderId = req.params.orderId
    try {
        const index = orderData.findIndex(order => order.orderId === orderId);
        if (index >= 0) {
            orderData.splice(index, 1)
            res.sendStatus(200)
        }
        else {
            res.sendStatus(500)
        }
    }
    catch (e) {
        res.sendStatus(500)
    }
})


router.post("/place", authMiddleware, async (req, res) => {
    try {
        const userEmail = req.user.email; // Assuming auth middleware sets req.user
        if (!userEmail) {
            return res.status(401).send("Unauthorized");
        }
        const savedOrder = await User.findOneAndUpdate(
            { email: userEmail },
            { $push: { orders: req.body } }, // Push new order to user's orders array
            { new: true } // Return the updated user document
        );

        if (!savedOrder) {
            return res.status(500).send("Failed to save order");
        }

        res.status(200).send({ "message": "added", savedOrder });

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).send("Internal Server Error");
    }
})

module.exports = router;