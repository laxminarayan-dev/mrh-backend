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
        const updatedEmployee = await Employee.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true });
        const io = getIO();
        if (io) {
            io.emit('admin-empupdate', updatedEmployee);
            console.log('Employee updated socket:', updatedEmployee.isActive);
        }
        else {
            console.warn('Socket.io instance not found. Real-time updates will not be sent.');
        }
        res.json(updatedEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;