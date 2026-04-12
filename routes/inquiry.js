const express = require("express");
const router = express.Router();
const Inquiry = require("../models/Inquiry");
const authMiddleware = require("../middlewares/authMiddleware");

// Middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied. Admin only." });
    }
    next();
};

// ─── USER ROUTES ──────────────────────────────────────────────────────────

// POST /api/inquiry/submit - User submits an inquiry
router.post("/submit", authMiddleware, async (req, res, next) => {
    console.log("this ---------------- ", req.user)
    try {
        const { fullName, email, inquiry, category } = req.body;


        // Debug: Check if req.user exists
        if (!req.user) {
            console.error("❌ req.user is undefined after authMiddleware");
            return res.status(401).json({ message: "User not authenticated" });
        }

        if (!req.user._id) {
            console.error("❌ req.user._id is undefined. req.user:", req.user);
            return res.status(401).json({ message: "User ID not found in token" });
        }

        // Validate required fields
        if (!fullName || !email || !inquiry) {
            return res.status(400).json({
                message: "Full name, email, and inquiry are required"
            });
        }

        // Validate inquiry length
        if (inquiry.trim().length < 10) {
            return res.status(400).json({
                message: "Inquiry must be at least 10 characters"
            });
        }

        // Create new inquiry
        const newInquiry = new Inquiry({
            userId: req.user?._id,
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            inquiry: inquiry.trim(),
            category: category || "other",
            status: "pending"
        });

        const savedInquiry = await newInquiry.save();

        console.log("✅ New inquiry submitted:", savedInquiry._id);

        res.status(201).json({
            message: "Inquiry submitted successfully",
            inquiry: savedInquiry
        });
    } catch (error) {
        console.error("❌ Error submitting inquiry:", error.message);

        // Handle validation errors specifically
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors)
                .map(err => err.message)
                .join(", ");
            return res.status(400).json({ message: `Validation failed: ${messages}` });
        }

        res.status(500).json({ message: "Failed to submit inquiry", error: error.message });
    }
});

// GET /api/inquiry/my-inquiries - Get user's own inquiries
router.get("/my-inquiries", authMiddleware, async (req, res, next) => {
    try {
        const inquiries = await Inquiry.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Inquiries fetched",
            inquiries,
            count: inquiries.length
        });
    } catch (error) {
        console.error("Error fetching user inquiries:", error);
        res.status(500).json({ message: "Failed to fetch inquiries" });
    }
});

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────────

// GET /api/inquiry - Get all inquiries (admin only)
router.get("/", authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { status, category, sortBy = "createdAt" } = req.query;
        let filter = {};

        if (status) filter.status = status;
        if (category) filter.category = category;

        const sortOrder = sortBy === "recent" ? -1 : 1;
        const inquiries = await Inquiry.find(filter)
            .populate("userId", "fullName email phone")
            .populate("respondedBy", "fullName email")
            .sort({ createdAt: sortOrder })
            .limit(100);

        res.status(200).json({
            message: "All inquiries fetched",
            inquiries,
            count: inquiries.length
        });
    } catch (error) {
        console.error("Error fetching inquiries:", error);
        res.status(500).json({ message: "Failed to fetch inquiries" });
    }
});

// GET /api/inquiry/:id - Get specific inquiry (admin only)
router.get("/:id", authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id)
            .populate("userId", "fullName email phone")
            .populate("respondedBy", "fullName email");

        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        // Mark as read if it's in pending status
        if (inquiry.status === "pending") {
            inquiry.status = "read";
            await inquiry.save();
        }

        res.status(200).json({
            message: "Inquiry fetched",
            inquiry
        });
    } catch (error) {
        console.error("Error fetching inquiry:", error);
        res.status(500).json({ message: "Failed to fetch inquiry" });
    }
});

// PUT /api/inquiry/:id/respond - Admin responds to inquiry
router.put("/:id/respond", authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { adminResponse } = req.body;

        if (!adminResponse || adminResponse.trim().length === 0) {
            return res.status(400).json({ message: "Response message is required" });
        }

        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        // Update inquiry with response
        inquiry.adminResponse = adminResponse.trim();
        inquiry.respondedBy = req.user._id;
        inquiry.respondedAt = new Date();
        inquiry.status = "read";

        const updatedInquiry = await inquiry.save();

        console.log("Inquiry responded:", updatedInquiry._id);

        res.status(200).json({
            message: "Response added successfully",
            inquiry: updatedInquiry
        });
    } catch (error) {
        console.error("Error responding to inquiry:", error);
        res.status(500).json({ message: "Failed to add response" });
    }
});

// PUT /api/inquiry/:id/status - Update inquiry status (admin only)
router.put("/:id/status", authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { status } = req.body;
        const validStatuses = ["pending", "read", "resolved", "rejected"];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
            });
        }

        const inquiry = await Inquiry.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        console.log(`Inquiry ${req.params.id} status updated to ${status}`);

        res.status(200).json({
            message: "Status updated successfully",
            inquiry
        });
    } catch (error) {
        console.error("Error updating inquiry status:", error);
        res.status(500).json({ message: "Failed to update status" });
    }
});

// PUT /api/inquiry/:id/priority - Set priority (admin only)
router.put("/:id/priority", authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const { priority } = req.body;
        const validPriorities = ["low", "medium", "high"];

        if (!priority || !validPriorities.includes(priority)) {
            return res.status(400).json({
                message: `Invalid priority. Must be one of: ${validPriorities.join(", ")}`
            });
        }

        const inquiry = await Inquiry.findByIdAndUpdate(
            req.params.id,
            { priority, updatedAt: new Date() },
            { new: true }
        );

        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        res.status(200).json({
            message: "Priority updated successfully",
            inquiry
        });
    } catch (error) {
        console.error("Error updating inquiry priority:", error);
        res.status(500).json({ message: "Failed to update priority" });
    }
});

// DELETE /api/inquiry/:id - Delete inquiry (admin only)
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res, next) => {
    try {
        const inquiry = await Inquiry.findByIdAndDelete(req.params.id);

        if (!inquiry) {
            return res.status(404).json({ message: "Inquiry not found" });
        }

        console.log("Inquiry deleted:", inquiry._id);

        res.status(200).json({
            message: "Inquiry deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting inquiry:", error);
        res.status(500).json({ message: "Failed to delete inquiry" });
    }
});

module.exports = router;
