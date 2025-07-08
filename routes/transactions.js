const express = require("express")
const router = express.Router();
const transactionData = [
    {
        transactionId: "T001",
        userName: "Alice Johnson",
        transactionDateTime: "2025-06-10T14:45",
        amount: 1500,
        type: "Credit",
        method: "Credit Card",
        status: "Successful",
        reference: "INV-101",

    },
    {
        transactionId: "T002",
        userName: "Bob Smith",
        transactionDateTime: "2025-06-12T10:30",
        amount: 2500,
        type: "Debit",
        method: "Cash",
        status: "Pending",
        reference: "ORD-102",

    },
    {
        transactionId: "T003",
        userName: "Charlie Lee",
        transactionDateTime: "2025-06-15T17:00",
        amount: 1800,
        type: "Credit",
        method: "UPI",
        status: "Failed",
        reference: "ORD-103",

    },
    {
        transactionId: "T004",
        userName: "Diana Prince",
        transactionDateTime: "2025-06-18T12:15",
        amount: 3200,
        type: "Credit",
        method: "Net Banking",
        status: "Successful",
        reference: "INV-104",

    },
]
// GET single order
router.get("/:transactionId", (req, res) => {

    const transactionId = req.params.transactionId;
    console.log(transactionId);
    const result = transactionData.find(transaction => transaction.transactionId == transactionId)
    res.send(result)
})

// GET all orders
router.get("/", (req, res) => {
    res.send(transactionData);
})

// Add new order
router.post("/add", (req, res) => {
    try {
        transactionData.push(req.body)
        res.send(200)
    } catch (error) {
        res.send(500)
    }
})

// PUT update order
router.put("/update", (req, res) => {
    const updatedTransaction = req.body
    const index = transactionData.findIndex(transaction => transaction.transactionId === req.body.transactionId);

    if (index !== -1) {
        transactionData[index] = { ...transactionData[index], ...updatedTransaction };
        res.status(200).send(req.body)
    } else {
        res.status(500).send("Internal Server Error");
    }
})

// DELETE order
router.delete("/:transactionId", (req, res) => {
    const transactionId = req.params.transactionId
    try {
        const index = transactionData.findIndex(order => order.transactionId === transactionId);
        if (index >= 0) {
            transactionData.splice(index, 1)
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