const { Server } = require("socket.io");
const users = new Map();
const Employee = require('../models/EmpModel');
const { Order } = require("../models/Order");
const { sendOrderAssignmentNotification } = require('../utils/pushNotification');
let io = null;
let ridersLocation = new Map()

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
        // Query database to find all active orders assigned to this rider,
        // then forward location to each user on their order
        socket.on("rider-location-update", async (data = {}) => {
            try {
                if (!socket.riderId) {
                    console.warn("⚠️ rider-location-update dropped: rider not joined");
                    return;
                }

                const payload = typeof data === "object" ? data : {};
                ridersLocation.set(socket.riderId, payload)
                console.log("Riders location update:", payload);

                // Find all active orders assigned to this rider
                const activeOrders = await Order.find({
                    riderInfo: { $exists: true },
                    "riderInfo._id": socket.riderId,
                    status: { $in: ["assigned", "out_for_delivery"] }
                }).select("_id userId").lean();

                if (!activeOrders || activeOrders.length === 0) {
                    console.warn(`⚠️ No active orders for rider ${socket.riderId}`);
                    return;
                }

                // Send location update to all users with orders from this rider
                activeOrders.forEach((order) => {
                    const liveLocationPayload = {
                        ...payload,
                        orderId: order._id.toString(),
                        userId: String(order.userId),
                        riderId: socket.riderId,
                        timestamp: payload.timestamp || Date.now(),
                    };

                    io.to(String(order.userId)).emit("rider-location-update", liveLocationPayload);
                });

                console.log(`📍 Location update sent to ${activeOrders.length} user(s) for rider ${socket.riderId}`);
            } catch (err) {
                console.error("❌ Error forwarding rider-location-update:", err);
            }
        });

        socket.on("disconnect", async () => {
            if (socket.riderId) {
                // Remove rider from tracking map
                riderSockets.delete(socket.riderId);
                console.log(`🔌 Rider ${socket.riderId} disconnected (socket removed, status unchanged)`);
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
        // Primary: Emit to rider's private room (Socket.io - real-time if online)
        io.to(riderId.toString()).emit("order-assigned", order);
        console.log(`📦 Order assigned emitted to rider room: ${riderId}`);

        // Send push notification (works even if rider is offline)
        sendOrderAssignmentNotification(riderId, order).catch(err => {
            console.error(`⚠️ Failed to send push notification:`, err.message);
        });

        // Fallback: If rider socket exists but might not be listening, also emit globally
        if (riderSockets.has(riderId.toString())) {
            console.log(`✅ Rider ${riderId} has active socket`);
        } else {
            console.warn(`⚠️ Rider ${riderId} not in active sockets - push notification sent as fallback`);
        }
    } catch (err) {
        console.error(`❌ Error emitting order assigned to rider ${riderId}:`, err);
    }
};

module.exports = { CreateSocket, getIO, emitOrderAssigned, riderSockets, ridersLocation };