const express = require('express');
const router = express.Router();
const Employee = require('../models/EmpModel');

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

// Create an employee
router.post('/', async (req, res) => {
    const employee = new Employee(req.body);
    try {
        const newEmployee = await employee.save();
        res.status(201).json(newEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update an employee
router.patch('/:id', getEmployee, async (req, res) => {
    Object.assign(res.employee, req.body);
    try {
        const updatedEmployee = await res.employee.save();
        res.json(updatedEmployee);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete an employee
router.delete('/:id', getEmployee, async (req, res) => {
    try {
        await res.employee.remove();
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