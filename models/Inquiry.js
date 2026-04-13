const mongoose = require('mongoose');

const inquirySchema = new mongoose.Schema({
    // User Reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },

    // Inquiry Details
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
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },

    inquiry: {
        type: String,
        required: [true, 'Inquiry message is required'],
        trim: true,
        minlength: [10, 'Inquiry must be at least 10 characters'],
        maxlength: [1000, 'Inquiry cannot exceed 1000 characters']
    },

    // Status Tracking
    status: {
        type: String,
        enum: {
            values: ['pending', 'read', 'responded', 'resolved', 'rejected'],
            message: 'Status must be one of: pending, read, responded, resolved, rejected'
        },
        default: 'pending'
    },

    // Admin Response
    adminResponse: {
        type: String,
        trim: true,
        maxlength: [2000, 'Response cannot exceed 2000 characters'],
        default: null
    },

    respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    respondedAt: {
        type: Date,
        default: null
    },

    // Metadata
    priority: {
        type: String,
        enum: {
            values: ['low', 'medium', 'high'],
            message: 'Priority must be one of: low, medium, high'
        },
        default: 'low'
    },

    category: {
        type: String,
        enum: {
            values: ['menu', 'catering', 'bulk_order', 'feedback', 'complaint', 'other'],
            message: 'Category must be a valid inquiry type'
        },
        default: 'other'
    },
}, {
    timestamps: true  // Mongoose will auto-manage createdAt and updatedAt
});

// Index for faster queries
inquirySchema.index({ userId: 1, createdAt: -1 });
inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ email: 1 });

module.exports = mongoose.model('Inquiry', inquirySchema);
