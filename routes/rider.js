const express = require('express');
const router = express.Router();
const { Order } = require('../models/Order');
const Employee = require('../models/EmpModel');
const { getIO } = require("../connections/socket");
const { generateToken } = require('./auth');


// login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        const isMatch = employee.password === password; // In production, use bcrypt to compare hashed passwords
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = generateToken(employee);
        res.json({ message: 'Login successful', employee, token });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 
router.get('/profile/:id', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-password'); // Exclude password from the response
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all orders for the rider
router.get('/orders/:riderId', async (req, res) => {
    try {
        const orders = await Order.aggregate([
            {
                $match: { "riderInfo._id": req.params.riderId }
            },
            {
                $lookup: {
                    from: "shops",
                    localField: "shopId",
                    foreignField: "_id",
                    as: "shop",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                shopLocation: 1,
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$shop"
            },
            // 👇 Add this lookup to get user details
            {
                $lookup: {
                    from: "users",           // your users collection name
                    localField: "userId",    // field in orders that references the user
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                phone: 1,   // optional, remove if not needed
                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true  // keeps order even if user not found
                }
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    totalAmount: 1,
                    paymentMethod: 1,
                    "deliveryAddress.formattedAddress": 1,
                    "deliveryAddress.coordinates": 1,
                    createdAt: 1,
                    orderItems: 1,
                    shop: 1,
                    // 👇 include user info in output
                    "user._id": 1,
                    "user.fullName": 1,
                    "user.phone": 1,
                    assignedAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    deliveredAt: 1
                }
            }


        ]);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/status/:id', async (req, res) => {
    try {
        const riderId = req.params.id;
        const { isActive } = req.body;

        console.log(`🚴 Updating rider ${riderId} status: isActive=${isActive}`);

        const updatedEmployee = await Employee.findByIdAndUpdate(
            riderId,
            {
                isActive: isActive,
                lastStatusUpdateAt: new Date()
            },
            { new: true }
        );

        if (!updatedEmployee) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        const io = getIO();
        if (io) {
            io.emit('admin-empupdate', updatedEmployee);
            console.log(`✅ Rider status updated & broadcasted: ${updatedEmployee.name} (${isActive ? 'ONLINE' : 'OFFLINE'})`);
        } else {
            console.warn('Socket.io instance not found. Real-time updates will not be sent.');
        }
        res.json(updatedEmployee);
    } catch (err) {
        console.error('❌ Error updating rider status:', err);
        res.status(400).json({ message: err.message });
    }
});

// GET /api/rider/pending-orders/:riderId - Fetch unread/pending assigned orders
// Fallback mechanism if rider missed socket event while connecting
router.get('/pending-orders/:riderId', async (req, res) => {
    try {
        const riderId = req.params.riderId;
        console.log(`📥 Fetching pending orders for rider: ${riderId}`);

        // Find orders assigned to this rider with shop and user data using aggregation
        const pendingOrders = await Order.aggregate([
            {
                $match: {
                    "riderInfo._id": riderId,
                    status: { $in: ['assigned', 'out-for-delivery'] }
                }
            },
            {
                $lookup: {
                    from: "shops",
                    localField: "shopId",
                    foreignField: "_id",
                    as: "shop",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                name: 1,
                                shopLocation: 1,
                            }
                        }
                    ]
                }
            },
            {
                $unwind: "$shop"
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                fullName: 1,
                                phone: 1,
                            }
                        }
                    ]
                }
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    status: 1,
                    totalAmount: 1,
                    paymentMethod: 1,
                    "deliveryAddress.formattedAddress": 1,
                    "deliveryAddress.coordinates": 1,
                    createdAt: 1,
                    orderItems: 1,
                    shop: 1,
                    riderInfo: 1,
                    "user._id": 1,
                    "user.fullName": 1,
                    "user.phone": 1,
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        console.log(`✅ Found ${pendingOrders.length} pending orders with shop data for rider ${riderId}`);
        res.json({
            message: 'Pending orders fetched',
            count: pendingOrders.length,
            orders: pendingOrders
        });
    } catch (err) {
        console.error('❌ Error fetching pending orders:', err);
        res.status(400).json({ message: err.message });
    }
});


router.post('/save-token', async (req, res) => {
    try {
        const { riderId, expoToken } = req.body;

        if (!riderId || !expoToken) {
            return res.status(400).json({ message: 'riderId and expoToken are required' });
        }

        // Find rider and add token if not already present
        const rider = await Employee.findById(riderId);

        if (!rider) {
            return res.status(404).json({ message: 'Rider not found' });
        }

        // Check if token already exists
        if (!rider.tokens.includes(expoToken)) {
            rider.tokens.push(expoToken);
            await rider.save();
            console.log(`✅ Expo token saved for rider ${rider.name} (${riderId})`);
        } else {
            console.log(`ℹ️ Token already exists for rider ${rider.name} (${riderId})`);
        }

        res.json({
            message: 'Token saved successfully',
            riderId: rider._id,
            tokenCount: rider.tokens.length
        });
    } catch (error) {
        console.error('❌ Error saving token:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;