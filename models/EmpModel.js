const mongoose = require('mongoose');
const EmpSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    aadharNo: { type: String, required: true },
    panNo: { type: String, required: true },
    dateOfJoining: { type: Date, required: true },
    salary: { type: Number, required: true },
    emergencyContact: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: "employee" },
    isActive: { type: Boolean, default: false },
    tokens: [{ type: String }]  // Expo push notification tokens

})
const Employee = mongoose.model('Emp', EmpSchema, 'employees');
module.exports = Employee;