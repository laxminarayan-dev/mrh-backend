const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const { Order } = require("../models/Order");
const { Item } = require("../models/ItemModel");
const authMiddleware = require("../middlewares/authMiddleware");

router.get("/user", authMiddleware, async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const orders = await Order.find({ userId })
        res.status(200).json({ orders });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
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
        const userId = req.user._id; // Assuming auth middleware sets req.user
        if (!userId) {
            return res.status(401).send("Unauthorized");
        }

        const orderItems = req.body.orderItems;

        for (const item of orderItems) {
            console.log("Validating item:", item);
            let itemPrice = item.isSale ? item.discountPrice : item.originalPrice;

            const storedItem = await Item.findById(item._id);

            if (!storedItem) {
                return res.status(400).send({ message: `Item with ID ${item._id} not found` });
            }

            if (itemPrice !== storedItem.price) {
                return res.status(400).send({ message: `Price mismatch for item ${item.name}` });
            }
        }

        // Create new order document
        const newOrder = new Order({
            ...req.body, // orderItems, pricing, deliveryAddress, payment details
        });
        const response = await newOrder.save();
        if (!response) {
            return res.status(500).send("Failed to save order");
        }
        else {
            console.log("Order saved successfully:", response);
            res.status(200).send({ "message": "Order placed successfully", order: response });
        }

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(500).send("Internal Server Error");
    }
})

module.exports = router;