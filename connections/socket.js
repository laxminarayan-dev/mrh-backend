const { Server } = require("socket.io");
const users = new Map();
const CreateSocket = (http) => {
    const io = new Server(http, {
        path: "/mrh-backend/socket.io",
        cors: {
            origin: [
                "https://mrhalwai.in",
                "https://www.mrhalwai.in"
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
            console.log("User joined private room:", userId);
        });

        socket.on("leave-user-room", () => {
            if (socket.userId) {
                socket.leave(socket.userId);
                console.log("User left private room:", socket.userId);
                socket.userId = null;
            }
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });

    });

}

module.exports = CreateSocket;