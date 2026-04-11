const express = require("express");
const router = express.Router();
const { Shop } = require("../models/ShopModel");
const { Order } = require("../models/Order");
const User = require("../models/UserModel");
const { Item } = require("../models/ItemModel");
const { getIO } = require("../connections/socket");

// GET /api/shop - Get shop details
router.get("/", async (req, res) => {
    try {
        console.log("Fetching shop details...");
        const shop = await Shop.find();
        res.status(200).json({ shop });
    } catch (error) {
        console.log("Error fetching shop details:", error);
        res.status(500).json({ message: "Failed to fetch shop details" });
    }
})

// GET /api/shop/id/:shopId - Get a shop by id (avoids conflict with /:coordinates)
router.get("/id/:shopId", async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }
        res.status(200).json({ shop });
    } catch (error) {
        console.error("Error fetching shop by id:", error);
        res.status(500).json({ message: "Failed to fetch shop" });
    }
})

router.post("/add", async (req, res) => {
    try {
        const newShop = new Shop(req.body);
        const saved = await newShop.save();
        if (!saved) {
            return res.status(500).json({ message: "Failed to add shop" });
        }
        const io = getIO();
        io.emit("shop-updated");
        io.emit("shop-added")
        res.status(201).json({ shop: saved });
    } catch (error) {
        console.error("Error adding shop:", error);
        res.status(500).json({ message: "Failed to add shop" });
    }
})

// GET /api/shop/dashboard-data - Get dashboard data (KPIs, charts, tables)
router.get("/dashboard-data", async (req, res) => {
    console.log("Fetching dashboard data...");
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

    const salesOflast7DaysAgg = await Order.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
        {
            $group: {
                _id: { $dateToString: { format: "%d/%m/%Y", date: "$createdAt" } },
                totalSales: { $sum: "$totalAmount" }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.json({
        kpiData: [
            { title: "Total Sales", counts: totalSales, subTitle: "All time", icon: "IndianRupee", color: "text-green-500" },
            { title: "Total Orders", counts: totalOrders, subTitle: "All time", icon: "ShoppingCart", color: "text-blue-500" },
            { title: "Total Customers", counts: totalCustomers, subTitle: "All time", icon: "Users", color: "text-orange-500" },
            { title: "Total Products", counts: totalProducts, subTitle: "All time", icon: "ShoppingCart", color: "text-purple-500" }
        ],
        chartData: {
            salesByItems,
            salesOverLast7Days: salesOflast7DaysAgg.map(sale => ({ date: sale._id, totalSales: sale.totalSales }))
        }

    });
});

router.get("/:coordinates", async (req, res) => {
    console.log("Fetching shop details for coordinates:", req.params.coordinates);
    try {
        const shop = await Shop.findOne({ coordinates: req.params.coordinates });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }
        res.status(200).json({ shop });
    } catch (error) {
        console.error("Error fetching shop details:", error);
        res.status(500).json({ message: "Failed to fetch shop details" });
    }

})

// POST /api/shop/update - Update shop details
router.post("/update/:id", async (req, res) => {
    try {
        const shop = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }
        const io = getIO();
        if (io) {
            io.emit("shop-updated", shop);
        } else {
            console.warn("Socket IO not initialized yet — cannot emit 'shop-updated'");
        }
        res.status(200).json({ message: "Shop details updated", shop });


    }
    catch (error) {
        console.error("Error updating shop details:", error);
        res.status(500).json({ message: "Failed to update shop details" });
    }
})

router.delete('/delete/:id', async (req, res) => {
    try {
        const shop = await Shop.findByIdAndDelete(req.params.id)
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }
        const io = getIO();
        if (io) {
            io.emit("shop-deleted", shop);
        } else {
            console.warn("Socket IO not initialized yet — cannot emit 'shop-updated'");
        }
        res.status(200).json({ message: "Shop Deleted", shop });


    }
    catch (error) {
        console.error("Error deleting shop:", error);
        res.status(500).json({ message: "Failed to delete shop" });
    }
})


module.exports = router;