const express = require('express');
const router = express.Router();
const Employee = require('../models/EmpModel');
const { getIO } = require("../connections/socket");
const { generateToken } = require("./auth")

// Get all employees    
router.get('/', async (req, res) => {
    try {
        const employees = await Employee.find().select('-password');
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get one employee
router.get('/:id', async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id).select('-password');
        if (!employee) {
            return res.status(404).json({ message: 'Cannot find employee' });
        }
        res.json(employee);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get employees by role
router.get('/role/:role', async (req, res) => {
    try {
        const employees = await Employee.find({ role: req.params.role }).select('-password');
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Create an employee
router.post('/', async (req, res) => {
    console.log('Received employee data:', req.body);
    try {
        const employee = new Employee(req.body);
        const newEmployee = await employee.save();
        const safeEmployee = await Employee.findById(newEmployee._id).select('-password');
        console.log('Employee created:', newEmployee);
        const io = getIO();
        if (io) {
            io.emit('admin-empupdate', newEmployee);
        }
        else {
            console.warn('Socket.io instance not found. Real-time updates will not be sent.');
        }
        res.status(201).json(safeEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update an employee
router.put('/:id', getEmployee, async (req, res) => {
    Object.assign(res.employee, req.body);
    try {
        const updatedEmployee = await res.employee.save();
        const safeEmployee = await Employee.findById(updatedEmployee._id).select('-password');
        const io = getIO();
        if (io) {
            console.log('Employee updated socket:', updatedEmployee);
            io.emit('admin-empupdate', updatedEmployee);
        }
        else {
            console.warn('Socket.io instance not found. Real-time updates will not be sent.');
        }
        res.json(safeEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete an employee
router.delete('/:id', getEmployee, async (req, res) => {
    try {
        await res.employee.deleteOne();
        const io = getIO();
        if (io) {
            io.emit('admin-empupdate', res.employee._id);
        } else {
            console.warn('Socket.io instance not found. Real-time updates will not be sent.');
        }
        res.json({ message: 'Deleted Employee' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post("/admin/login", async (req, res) => {
    const { email, password } = req.body
    console.log(req.body)
    try {
        const empFind = await Employee.findOne({ email: email, role: "admin" })
        if (empFind) {
            if (empFind.password == password) {
                const token = generateToken(empFind)
                res.status(200).json({ "message": "Login Successfull", "token": token })
            } else {
                res.status(401).json({ "message": "Incorrect Password" })
            }
        } else {
            res.status(404).json({ "message": "Incorrect Admin Email" })
        }
    } catch {
        res.status(500).json({ "message": "Internal Server Error" })
    }
})




// Middleware to get employee by ID
async function getEmployee(req, res, next) {
    let employee;
    try {
        employee = await Employee.findById(req.params.id);
        if (employee == null) {
            return res.status(404).json({ message: 'Cannot find employee' });
        }
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
    res.employee = employee;
    next();
}

module.exports = router;