require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const orderRoute = require("./routes/orders")
const transactionRoute = require("./routes/transactions")
const authRoute = require("./routes/auth")
const { connectDB } = require("./connections/db");
const CreateSocket = require("./connections/socket");
const app = express();
const server = http.createServer(app);
CreateSocket(server);
const PORT = 8000;

const kpiData = [
    {
        title: "Today's Revenue",
        counts: "₹2,847",
        subTitle: "+12.5%",
        color: "text-stone-600",
        icon: "IndianRupee",
    },
    {
        title: "Orders Completed",
        counts: "47",
        subTitle: "+8.2%",
        color: "text-stone-600",
        icon: "ShoppingCart",
    },
    {
        title: "Customer Count",
        counts: "156",
        subTitle: "23 new",
        color: "text-stone-600",
        icon: "Users",
    },
];
const chartData = {
    cashFlow: [
        { day: "Mon", revenue: 350, expenses: 100 },
        { day: "Tue", revenue: 320, expenses: 250 },
        { day: "Wed", revenue: 280, expenses: 40 },
        { day: "Thu", revenue: 410, expenses: 230 },
        { day: "Fri", revenue: 650, expenses: 120 },
        { day: "Sat", revenue: 780, expenses: 430 },
        { day: "Sun", revenue: 710, expenses: 120 },
    ],
    topSelling: [
        { category: "Snacks", value: 400 },
        { category: "Main Course", value: 340 },
        { category: "Chaat", value: 300 },
        { category: "Chaat", value: 204 },
        { category: "Drinks", value: 200 },
        { category: "Drinks", value: 156 },
        { category: "Main Course", value: 150 },
    ],
};
const tablesData = {
    recentOrdersData: [
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
            actions: "",
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
            actions: "",
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
            actions: "",
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
            actions: "",
        },
    ],


    recentTransactionsData: [
        {
            transactionId: "T001",
            userName: "Alice Johnson",
            transactionDateTime: "2025-06-10T14:45",
            amount: 1500,
            type: "Credit",
            method: "Credit Card",
            status: "Successful",
            reference: "INV-101",
            actions: "",
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
            actions: "",
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
            actions: "",
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
            actions: "",
        },
    ],
}
app.use(cors());
app.use(express.json())
app.use("/uploads", express.static("uploads"));

// Orders Routes
app.use("/api/orders", orderRoute);
app.use("/api/items", require("./routes/items"))
app.use("/api/transactions", transactionRoute);
app.use("/api/auth", authRoute);
app.use("/api/shop", require("./routes/shop"))
app.use("/api/user", require("./routes/user"))
app.use("/api/geocode", require("./routes/geocode"))

app.post("/api/dashboard-data", (req, res) => {
    res.send({
        kpiData, chartData, tablesData
    })
})

app.get("/", (req, res) => {
    res.send("Welcome to MR Halwai Backend API");
});

// Catch-all 404 handler (safe version)
app.use((req, res) => {
    res.status(404).send("404 Not Found");
});

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`
==================================
✓ Server listening on port ${PORT}
==================================`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
