const { Server } = require("socket.io");
const users = new Map();
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

        console.log("Socket connected:", socket.id);

        socket.on("join-user-room", (userId) => {
            socket.join(userId);
            socket.userId = userId; // optional tracking
            console.log(`${socket.id} joined private room: ${userId}`);
        });

        socket.on("leave-user-room", () => {
            if (socket.userId) {
                socket.leave(socket.userId);
                console.log(`${socket.id} left private room: ${socket.userId}`);
                socket.userId = null;
            }
        });

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });

    });

}

const getIO = () => io;

module.exports = { CreateSocket, getIO };