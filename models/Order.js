const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    item: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required: true,
    },
    name: {
        type: String, // snapshot (item name at order time)
        required: true,
    },
    price: {
        type: Number, // price at order time
        required: true,
        min: 0,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
});

const orderSchema = new mongoose.Schema(
    {
        // User who placed order
        userDetail: [mongoose.Schema.Types.Mixed], // snapshot of user details at order time

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

        // Delivery address snapshot
        deliveryAddress: [mongoose.Schema.Types.Mixed],

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
