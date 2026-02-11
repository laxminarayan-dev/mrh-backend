const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [150, 'Short description cannot exceed 150 characters']
    },

    // Category & Classification
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['dosa', 'uttapam', 'chinese', 'thali', 'pav-bhaji', 'sweets'],
        index: true
    },
    subCategory: {
        type: String,
        default: ''
    },
    cuisine: {
        type: String,
        enum: ['south-indian', 'chinese', 'north-indian'],
        default: 'south-indian'
    },
    includes: [String],

    // Pricing
    originalPrice: {
        type: Number,
        required: [true, 'Original price is required'],
        min: [0, 'Price cannot be negative']
    },
    discountPrice: {
        type: Number,
        min: [0, 'Discount price cannot be negative'],
        default: null
    },

    // Status Flags
    isSale: {
        type: Boolean,
        default: false
    },
    isSpecial: {
        type: Boolean,
        default: false
    },
    isAvailable: {
        type: Boolean,
        default: true,
        index: true
    },
    isNewArrival: {
        type: Boolean,
        default: false
    },
    isBestSeller: {
        type: Boolean,
        default: false
    },

    // Images
    images: {
        url: {
            type: String,
            required: true
        },
        alt: {
            type: String,
            default: ''
        },
    },
    thumbnail: {
        type: String,
        default: ''
    },

    // Ratings & Reviews
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        },
        distribution: {
            five: { type: Number, default: 0 },
            four: { type: Number, default: 0 },
            three: { type: Number, default: 0 },
            two: { type: Number, default: 0 },
            one: { type: Number, default: 0 }
        }
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review'
    }],

    // Inventory & Stock
    stock: {
        type: Number,
        default: null // null means unlimited
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    },

    // Timing & Availability
    availableTimings: {
        breakfast: { type: Boolean, default: false },
        lunch: { type: Boolean, default: true },
        dinner: { type: Boolean, default: true },
        allDay: { type: Boolean, default: false }
    },
    availableDays: {
        type: [String],
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },

    // Preparation & Delivery
    preparationTime: {
        type: Number, // in minutes
        default: 15,
        min: 0
    },

    // Statistics
    orderCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    favoriteCount: {
        type: Number,
        default: 0
    },

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});


const Item = mongoose.model('Item', itemSchema, 'items');

module.exports = {
    Item,
    itemSchema
}