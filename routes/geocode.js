const express = require("express");

const router = express.Router();

router.get("/reverse-geocode", async (req, res) => {
    try {
        const { lat, lon } = req.query;

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`,
            {
                headers: {
                    "User-Agent": "Mr Halwai" // REQUIRED by Nominatim
                }
            }
        );

        const data = await response.json();
        console.log(data)
        res.json(data);
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Failed to fetch address" });
    }
});

module.exports = router
