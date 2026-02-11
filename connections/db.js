const mongoose = require("mongoose");

const connectDB = async () => {
    try {

        mongoose
            .connect(process.env.MONGODB_URI)
            .then((res) => {
                console.log(`
====================
✓ MongoDB Connected
=====================                            
`)
                return res;
            })
            .catch((err) => console.error("✗ MongoDB Connection Error:", err));

    } catch (error) {
        console.error(`✗ MongoDB Connection Error: ${error.message}`);
        process.exit(1);
    }
};

// Disconnect function for graceful shutdown
const disconnectDB = async () => {
    try {
        await mongoose.disconnect();
        console.log("✓ MongoDB Disconnected");
    } catch (error) {
        console.error(`✗ MongoDB Disconnection Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = { connectDB, disconnectDB };
