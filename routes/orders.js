const express = require("express");
const router = express.Router();
const orderData = [
    {
        orderId: "101",
        customerName: "Alice Johnson",
        orderItem: "Chocolate Cake",
        quantity: 2,
        orderDateTime: "2025-06-10T14:30",
        amount: 1500,
        status: "Delivered",
        paymentMethod: "Credit Card",
        deliveredDateTime: "2025-06-12T10:00",

    },
    {
        orderId: "102",
        customerName: "Bob Smith",
        orderItem: "Veg Pizza",
        quantity: 1,
        orderDateTime: "2025-06-12T09:15",
        amount: 2500,
        status: "Pending",
        paymentMethod: "Cash on Delivery",
        deliveredDateTime: "",

    },
    {
        orderId: "103",
        customerName: "Charlie Lee",
        orderItem: "Pasta",
        quantity: 3,
        orderDateTime: "2025-06-15T16:45",
        amount: 1800,
        status: "Shipped",
        paymentMethod: "UPI",
        deliveredDateTime: "",

    },
    {
        orderId: "104",
        customerName: "Diana Prince",
        orderItem: "Burger",
        quantity: 4,
        orderDateTime: "2025-06-18T11:00",
        amount: 3200,
        status: "Delivered",
        paymentMethod: "Net Banking",
        deliveredDateTime: "2025-06-20T13:20",

    },
]

// GET single order
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