const express = require("express");
const router = express.Router();
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
        res.send(500)
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
router.delete("/:orderId", (req, res) => {
    const orderId = req.params.orderId
    try {
        const index = orderData.findIndex(order => order.orderId === orderId);
        if (index >= 0) {
            orderData.splice(index, 1)
            res.send(200)
        }
        else {
            res.send(500)
        }
    }
    catch (e) {
        res.send(500)
    }
})

module.exports = router;