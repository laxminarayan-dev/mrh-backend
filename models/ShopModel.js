const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    shopOpen: {
        type: Boolean,
        default: true
    },
    shopDeliveryRange: {
        type: Number,
        default: 5 // Default delivery range in kilometers
    },
    shopLocation: {
        formattedAddress: { type: String, required: true },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
            index: "2dsphere" // Geospatial index for location queries
        }
    },
    shopContact: {
        phone: { type: String, required: true },
        email: { type: String, required: true }
    },
    shopHours: {
        open: { type: String, required: true }, // e.g., "09:00"
        close: { type: String, required: true } // e.g., "21:00"
    },
}, { timestamps: true });

const Shop = mongoose.model("Shop", shopSchema);

module.exports = { Shop };