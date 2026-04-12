const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // 1️⃣ Check header exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authorization token missing" });
        }

        // 2️⃣ Extract token
        const token = authHeader.split(" ")[1];

        // 3️⃣ Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // 4️⃣ Attach user info to request
        req.user = decoded; // { _id, id, email, role, ... }

        // console.log("✅ Token decoded. User:", { _id: req.user._id, email: req.user.email, role: req.user.role });

        next();
    } catch (error) {
        console.error("❌ Auth error:", error.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
