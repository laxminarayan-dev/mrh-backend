const mongoose = require("mongoose");


const orderSchema = new mongoose.Schema(
    {
        // User who placed order
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        // Ordered items
        orderItems: {
            type: [mongoose.Schema.Types.Mixed], // array of orderItemSchema snapshots
        },

        // Pricing
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        deliveryFee: {
            type: Number,
            default: 0,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        tax: {
            type: Number,
            default: 0,
            min: 0,
        },
        // Delivery address snapshot
        deliveryAddress: [mongoose.Schema.Types.Mixed],

        deliveryTime: {
            type: Date,
        },

        riderInfo: {
            type: mongoose.Schema.Types.Mixed, // { name, contact, vehicle }
            default: null,
        },

        // Payment
        paymentMethod: {
            type: String,
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
            index: true,
        },

        // Order status
        status: {
            type: String,
            enum: [
                "placed",
                "confirmed",
                "preparing",
                "out-for-delivery",
                "delivered",
                "cancelled",
            ],
            default: "placed",
            index: true,
        },

        // Extra info
        notes: {
            type: String,
            default: "",
            maxlength: 300,
        },

    },
    {
        timestamps: true, // createdAt = order date
    }
);

const Order = mongoose.model("Order", orderSchema, "orders");
module.exports = {
    Order,
    orderSchema
};
