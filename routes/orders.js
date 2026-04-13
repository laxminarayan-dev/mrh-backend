const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const { Order } = require("../models/Order");
const { Item } = require("../models/ItemModel");
const Shop = require("../models/ShopModel");
const { getIO, emitOrderAssigned } = require("../connections/socket");
const authMiddleware = require("../middlewares/authMiddleware");


// Return all orders (admin access)
router.get("/", async (req, res) => {
    try {
        const orders = await Order.find();
        res.status(200).json({ orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
})

// Return submitted reviews from orders
router.get("/reviews", async (req, res) => {
    try {
        const reviewedOrders = await Order.find({ "review.submitted": true })
            .select("userId shopId review createdAt updatedAt")
            .sort({ updatedAt: -1 });

        const userIds = [...new Set(
            reviewedOrders
                .map((order) => order.userId?.toString())
                .filter(Boolean)
        )];

        const users = await User.find({ _id: { $in: userIds } })
            .select("_id fullName")
            .lean();

        const userNameById = new Map(
            users.map((user) => [user._id.toString(), user.fullName])
        );

        const reviews = reviewedOrders.map((order) => ({
            orderId: order._id,
            userId: order.userId,
            userName: userNameById.get(order.userId?.toString()) || "Anonymous User",
            shopId: order.shopId,
            rating: order.review?.rating,
            comment: order.review?.comment,
            submitted: order.review?.submitted,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
        }));

        res.status(200).json({
            message: "Submitted reviews fetched",
            count: reviews.length,
            reviews,
        });
    } catch (error) {
        console.error("Error fetching submitted reviews:", error);
        res.status(500).json({ message: "Failed to fetch submitted reviews" });
    }
})

// Retrieve orders for the authenticated user
router.get("/user", authMiddleware, async (req, res, next) => {
    const userId = req.user._id;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const orders = await Order.find({ userId });
        res.status(200).json({ orders });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
})

// Place a new order
router.post("/place", authMiddleware, async (req, res, next) => {
    const session = await Item.startSession();
    let savedOrder = null;

    try {
        const userId = req.user._id; // Assuming auth middleware sets req.user
        if (!userId) {
            return res.status(401).send("Unauthorized");
        }

        const orderItems = req.body.orderItems;

        await session.withTransaction(async () => {
            for (const item of orderItems) {
                console.log("Validating item:", item);
                let itemPrice = item.isSale ? item.discountPrice : item.originalPrice;

                const storedItem = await Item.findById(item._id).session(session);

                if (!storedItem) {
                    const notFoundError = new Error(`Item with ID ${item._id} not found`);
                    notFoundError.status = 400;
                    throw notFoundError;
                }

                if (itemPrice !== storedItem.price) {
                    const priceError = new Error(`Price mismatch for item ${item.name}`);
                    priceError.status = 400;
                    throw priceError;
                }
            }

            // Create new order document
            const newOrder = new Order({
                ...req.body, // orderItems, pricing, deliveryAddress, payment details
            });
            savedOrder = await newOrder.save({ session });
            if (!savedOrder) {
                const saveError = new Error("Failed to save order");
                saveError.status = 500;
                throw saveError;
            }

            const incrementOps = orderItems.map((item) =>
                Item.updateOne(
                    { _id: item._id },
                    { $inc: { orderCount: 1 } },
                    { session }
                )
            );
            await Promise.all(incrementOps);
        });

        const io = getIO();
        if (io) {
            io.emit("new-order", savedOrder);
        } else {
            console.warn("Socket IO not initialized yet — cannot emit 'new-order'");
        }
        res.status(200).send({ message: "Order placed successfully", order: savedOrder });
    } catch (error) {
        console.error("Error placing order:", error);
        const statusCode = error.status || 500;
        res.status(statusCode).send({ message: error.message || "Internal Server Error" });
    } finally {
        session.endSession();
    }
})

// PUT /api/orders/update/:id - Update an existing order
router.put("/update/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        console.log("📝 Updating order with ID:", orderId, "and body:", req.body);
        const updatedOrder = await Order.findByIdAndUpdate(orderId, req.body, { new: true });
        if (!updatedOrder) {
            return res.status(404).send({ message: "Order not found" });
        }
        const io = getIO();

        if (io) {
            // If order is being assigned to a rider
            if (updatedOrder.status === "assigned" && updatedOrder.riderInfo?._id) {
                // Populate shop data before emitting to rider
                try {
                    const populatedOrder = await Order.findById(orderId).populate({
                        path: 'shopId',
                        select: 'name shopLocation shopContact code'
                    });

                    if (populatedOrder) {
                        console.log(`🏪 Sending order with shop data to rider: ${populatedOrder.shopId?.name}`);
                        emitOrderAssigned(updatedOrder.riderInfo._id, populatedOrder);
                    } else {
                        console.warn("⚠️ Could not populate shop data, sending raw order");
                        emitOrderAssigned(updatedOrder.riderInfo._id, updatedOrder);
                    }
                } catch (populateErr) {
                    console.error("⚠️ Error populating shop data:", populateErr);
                    emitOrderAssigned(updatedOrder.riderInfo._id, updatedOrder);
                }
            } else if (updatedOrder.status === "assigned" && !updatedOrder.riderInfo?._id) {
                console.warn("⚠️ Order marked as assigned but riderInfo._id is missing!");
            }

            // Notify user about order update
            io.to(updatedOrder.userId.toString()).emit("order-updated", updatedOrder);

            // Notify admin about order update
            io.emit("admin-order-updated", updatedOrder);
        } else {
            console.warn("Socket IO not initialized yet — cannot emit 'order-updated'");
        }
        res.send({ message: "Order updated", order: updatedOrder });
    } catch (error) {
        console.error("❌ Error updating order:", error);
        res.status(500).send({ message: "Failed to update order" });
    }
})

// DELETE /api/orders/delete/:id - Delete an order
router.delete("/delete/:id", async (req, res) => {
    try {
        const orderId = req.params.id;
        const deletedOrder = await Order.findByIdAndDelete(orderId);
        if (!deletedOrder) {
            return res.status(404).send({ message: "Order not found" });
        }
        res.send({ message: "Order deleted", order: deletedOrder });
    } catch (error) {
        console.error("Error deleting order:", error);
        res.status(500).send({ message: "Failed to delete order" });
    }
})

// Rider-friendly route: PUT /api/orders/:id/status - Update only order status
router.put("/:id/status", async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;

        if (!status) {
            return res.status(400).send({ message: "Status is required" });
        }

        console.log(`🚗 Rider updating order ${orderId} status to: ${status}`);

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).send({ message: "Order not found" });
        }

        const io = getIO();
        if (io) {
            // Notify user about status change
            io.to(updatedOrder.userId.toString()).emit("order-updated", updatedOrder);

            // Notify admin about status change
            io.emit("admin-order-updated", updatedOrder);

            // Notify rider about confirmation
            if (updatedOrder.riderInfo?._id) {
                io.to(updatedOrder.riderInfo._id.toString()).emit("order-status-updated", updatedOrder);
            }

            console.log(`✅ Order status updated & broadcast: ${updatedOrder._id} → ${status}`);
        } else {
            console.warn("Socket IO not initialized");
        }

        res.send({ message: "Order status updated", order: updatedOrder });
    } catch (error) {
        console.error("❌ Error updating order status:", error);
        res.status(500).send({ message: "Failed to update order status" });
    }
})

router.put("/review/:id", authMiddleware, async (req, res, next) => {
    try {
        const orderId = req.params.id;
        const review = req.body;
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { review: { ...review, submitted: true } },
            { new: true }
        );
        if (!updatedOrder) {
            return res.status(404).send({ message: "Order not found" });
        }
        res.send({ message: "Review submitted", order: updatedOrder });

    } catch (error) {
        console.error("Error submitting review:", error);
        res.status(500).send({ message: "Failed to submit review" });
    }
})



module.exports = router;