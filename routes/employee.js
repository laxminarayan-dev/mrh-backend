const express = require('express');
const router = express.Router();
const Employee = require('../models/EmpModel');
const { getIO } = require("../connections/socket");

// Get all employees    
router.get('/', async (req, res) => {
    try {
        const employees = await Employee.find();
        res.json(employees);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get one employee
router.get('/:id', getEmployee, (req, res) => {
    res.json(res.employee);
});

// Get employees by role
router.get('/role/:role', async (req, res) => {
    try {
        const employees = await Employee.find({ role: req.params.role });
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
        console.log('Employee created:', newEmployee);
        const io = getIO();
        if (io) {
            io.emit('admin-empupdate', newEmployee);
        }
        else {
            console.warn('Socket.io instance not found. Real-time updates will not be sent.');
        }
        res.status(201).json(newEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update an employee
router.put('/:id', getEmployee, async (req, res) => {
    Object.assign(res.employee, req.body);
    try {
        const updatedEmployee = await res.employee.save();
        const io = getIO();
        if (io) {
            console.log('Employee updated socket:', updatedEmployee);
            io.emit('admin-empupdate', updatedEmployee);
        }
        else {
            console.warn('Socket.io instance not found. Real-time updates will not be sent.');
        }
        res.json(updatedEmployee);
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