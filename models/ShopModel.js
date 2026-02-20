const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema({
    name: {
        type: String,
        default: "Main Branch",
        trim: true
    },
    code: {
        type: String,
        default: "MAIN",
        trim: true
    },
    shopOpen: {
        type: Boolean,
        default: true
    },
    shopDeliveryRange: {
        type: Number,
        default: 5
    },

    menuItems: [mongoose.Schema.Types.ObjectId],

    shopLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        formattedAddress: {
            type: String,
            required: true
        }
    },

    shopContact: {
        phone: String,
        email: String
    },

    shopHours: {
        open: String,
        close: String
    }

}, { timestamps: true });

shopSchema.index({ shopLocation: "2dsphere" });

const Shop = mongoose.model("Shop", shopSchema);

module.exports = { Shop };