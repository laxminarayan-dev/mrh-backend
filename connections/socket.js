const { Server } = require("socket.io");
const users = new Map();
const Employee = require('../models/EmpModel');
let io = null;
const CreateSocket = (http) => {
    io = new Server(http, {
        cors: {
            origin: [
                "https://mrhalwai.in",
                "https://www.mrhalwai.in",
                "https://admin.mrhalwai.in",
                "https://www.admin.mrhalwai.in",
                "http://localhost:3000",
                "http://localhost:8000",
                "http://localhost:5173"

            ],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {

        socket.on("join-user-room", (userId) => {
            socket.join(userId);
            socket.userId = userId; // optional tracking
            console.log(`${socket.id} joined private room: ${userId}`);
        });

        socket.on("join:rider", (riderId) => {
            socket.join(riderId);
            socket.riderId = riderId;
            console.log(`${socket.id} joined private room: ${riderId}`);
        });

        socket.on("leave-user-room", () => {
            if (socket.userId) {
                socket.leave(socket.userId);
                console.log(`${socket.id} left private room: ${socket.userId}`);
                socket.userId = null;
            }
        });

        socket.on("disconnect", async () => {
            console.log(`Socket disconnected: ${socket.id}  - Rider: ${socket.riderId}`);
            if (socket.riderId) {
                try {
                    await Employee.findByIdAndUpdate(socket.riderId, {
                        isActive: false
                    });
                    io.emit('admin-empupdate');
                    console.log(`Rider ${socket.riderId} marked offline`);
                } catch (err) {
                    console.error("Error updating rider status:", err);
                }
            }
        });

    });

}

const getIO = () => {
    if (!io) {
        console.log("❌ Socket.io not initialized");
    }
    return io;
};

module.exports = { CreateSocket, getIO };