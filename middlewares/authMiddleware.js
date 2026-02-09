const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log("Auth header:", authHeader); // Debug log
        // 1️⃣ Check header exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authorization token missing" });
        }

        // 2️⃣ Extract token
        const token = authHeader.split(" ")[1];

        // 3️⃣ Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        console.log("Decoded JWT payload:", decoded); // Debug log

        // 4️⃣ Attach user info to request
        req.user = decoded; // { id, email, role, ... }

        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
