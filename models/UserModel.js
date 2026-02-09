const mongoose = require('mongoose');
const { orderSchema } = require('./Order');
const addressSchema = new mongoose.Schema({
    street: {
        type: String,
    },
    apartment: {
        type: String,
    },
    city: {
        type: String,
    },
    state: {
        type: String,
    },
    zipCode: {
        type: String,
    },
    landmark: {
        type: String,
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const newAddressSchema = new mongoose.Schema({
    coordinates: [Number, Number], // [latitude, longitude]
    formattedAddress: {
        type: String,
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { _id: true });

const userSchema = new mongoose.Schema({
    // Basic Information
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        minlength: [5, 'Full name must be at least 5 characters'],
        maxlength: [50, 'Full name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't return password by default
    },

    // Delivery Addresses
    addresses: {
        type: [newAddressSchema],
        default: []
    },

    // Cart & Favorites
    cart: {
        type: [mongoose.Schema.Types.Mixed], // Assuming itemSchema is defined elsewhere
        default: []
    },

    favorites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MenuItem'
    }],

    // Order History & Stats
    orders: [orderSchema], // Embedding order schema for quick access

    // Payment Information
    savedPaymentMethods: [{
        type: {
            type: String,
            enum: ['card', 'upi', 'wallet'],
        },
        lastFourDigits: {
            type: String,
            default: ''
        },
        cardBrand: {
            type: String,
            default: ''
        },
        upiId: {
            type: String,
            default: ''
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }],


    // Referral System
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referralCount: {
        type: Number,
        default: 0
    },

}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Instance method to generate referral code
userSchema.methods.generateReferralCode = function () {
    const code = `${this.fullName.replace(/\s/g, '').substring(0, 3)
        .toUpperCase()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    this.referralCode = code;
    return code;
};


const User = mongoose.model('User', userSchema, 'users');

module.exports = User;