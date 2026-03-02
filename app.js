require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const orderRoute = require("./routes/orders")
const transactionRoute = require("./routes/transactions")
const authRoute = require("./routes/auth")
const { connectDB } = require("./connections/db");
const { CreateSocket } = require("./connections/socket");
const app = express();
const server = http.createServer(app);
CreateSocket(server);
const PORT = 8000;

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json())


app.use(
    "/uploads/images",
    express.static(path.join(__dirname, "uploads", "images"))
);

// Orders Routes
app.use("/api/orders", orderRoute);
app.use("/api/rider", require("./routes/rider"))
app.use("/api/items", require("./routes/items"))
app.use("/api/transactions", transactionRoute);
app.use("/api/auth", authRoute);
app.use("/api/shop", require("./routes/shop"))
app.use("/api/user", require("./routes/user"))
app.use("/api/employee", require("./routes/employee"))
app.use("/api/geocode", require("./routes/geocode"))

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
