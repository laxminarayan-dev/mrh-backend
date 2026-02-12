const express = require("express");
const router = express.Router();
const { Shop } = require("../models/ShopModel");
const { Order } = require("../models/Order");
const User = require("../models/UserModel");
const { Item } = require("../models/ItemModel");
const authMiddleware = require("../middlewares/authMiddleware");

// GET /api/shop - Get shop details
router.get("/", async (req, res) => {
    try {
        const shop = await Shop.findOne();
        res.status(200).json({ shop });
    } catch (error) {
        console.error("Error fetching shop details:", error);
        res.status(500).json({ message: "Failed to fetch shop details" });
    }
})

// POST /api/shop/update - Update shop details
router.post("/update", authMiddleware, async (req, res) => {
    try {
        const shop = await Shop.findOne();
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }
        Object.assign(shop, req.body);
        await shop.save();
        res.status(200).json({ message: "Shop details updated", shop });
    }
    catch (error) {
        console.error("Error updating shop details:", error);
        res.status(500).json({ message: "Failed to update shop details" });
    }
})


// GET /api/shop/dashboard-data - Get dashboard data (KPIs, charts, tables)
router.get("/dashboard-data", async (req, res) => {
    const totalSalesAgg = await Order.aggregate([
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalSales = totalSalesAgg[0]?.total || 0;
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments();
    const totalProducts = await Item.countDocuments();

    const salesByItems = await Order.aggregate([
        { $unwind: "$orderItems" },
        {
            $project: {
                itemId: "$orderItems._id",
                name: "$orderItems.name",
                quantity: { $ifNull: ["$orderItems.quantity", 0] },
                price: { $ifNull: ["$orderItems.price", 0] }
            }
        },
        {
            $group: {
                _id: "$itemId",
                name: { $first: "$name" },
                totalQuantity: { $sum: "$quantity" },
                totalSales: { $sum: { $multiply: ["$quantity", "$price"] } }
            }
        },
        { $sort: { totalSales: -1 } }
    ]);

    res.json({
        kpiData: {
            totalSales,
            totalOrders,
            totalCustomers,
            totalProducts,
        },
        chartData: {
            salesByItems
        }
    });
});

module.exports = router;