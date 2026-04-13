const { Server } = require("socket.io");
const users = new Map();
const Employee = require('../models/EmpModel');
const { Order } = require("../models/Order");
let io = null;

// Track riders by ID -> socket ID for reliable messaging
const riderSockets = new Map();

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
            socket.join(`user:${userId}`);
            socket.userId = userId; // optional tracking
            console.log(`${socket.id} joined private room: ${userId}`);
        });

        socket.on("join:rider", (riderId) => {
            socket.join(riderId);
            socket.riderId = riderId;
            riderSockets.set(riderId, socket.id);
            console.log(`🔗 Rider ${riderId} joined socket room (${socket.id})`);
        });

        socket.on("leave-user-room", () => {
            if (socket.userId) {
                socket.leave(socket.userId);
                socket.leave(`user:${socket.userId}`);
                console.log(`${socket.id} left private room: ${socket.userId}`);
                socket.userId = null;
            }
        });

        // Rider app emits periodic GPS updates while moving.
        // Forward the update to the specific user room for live ETA/tracking UI.
        socket.on("rider-location-update", async (data = {}) => {
            try {
                const payload = typeof data === "object" ? data : {};
                console.log("Riders locatoin update:", payload)
                const orderId = payload.orderId || payload?.order?._id;
                let userId = payload.userId || payload?.order?.userId;

                if (!userId && orderId) {
                    const order = await Order.findById(orderId).select("userId").lean();
                    userId = order?.userId;
                }

                if (!userId) {
                    console.warn("⚠️ rider-location-update dropped: missing userId/orderId", payload);
                    return;
                }

                const liveLocationPayload = {
                    ...payload,
                    orderId: orderId || payload.orderId,
                    userId: String(userId),
                    riderId: payload.riderId || socket.riderId || payload?.rider?._id,
                    timestamp: payload.timestamp || Date.now(),
                };

                io.to(String(userId)).emit("rider-location-update", liveLocationPayload);
                io.to(`user:${String(userId)}`).emit("rider-location-update", liveLocationPayload);
            } catch (err) {
                console.error("❌ Error forwarding rider-location-update:", err);
            }
        });

        socket.on("disconnect", async () => {
            if (socket.riderId) {
                try {
                    // Remove rider from tracking map
                    riderSockets.delete(socket.riderId);

                    // Mark rider as offline in database
                    await Employee.findByIdAndUpdate(socket.riderId, {
                        isActive: false,
                        lastSeenAt: new Date()
                    });
                    io.emit('admin-empupdate');
                    console.log(`🔌 Rider ${socket.riderId} marked OFFLINE (disconnected socket)`);
                } catch (err) {
                    console.error("Error updating rider status on disconnect:", err);
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

/**
 * Emit order assigned event to rider with fallback
 * @param {string} riderId - Rider's ID
 * @param {object} order - Order object
 */
const emitOrderAssigned = (riderId, order) => {
    if (!io || !riderId) return;

    try {
        // Primary: Emit to rider's private room
        io.to(riderId.toString()).emit("order-assigned", order);
        console.log(`📦 Order assigned emitted to rider room: ${riderId}`);

        // Fallback: If rider socket exists but might not be listening, also emit globally
        if (riderSockets.has(riderId.toString())) {
            console.log(`✅ Rider ${riderId} has active socket`);
        } else {
            console.warn(`⚠️ Rider ${riderId} not in active sockets - message queued on their room`);
        }
    } catch (err) {
        console.error(`❌ Error emitting order assigned to rider ${riderId}:`, err);
    }
};

module.exports = { CreateSocket, getIO, emitOrderAssigned, riderSockets };