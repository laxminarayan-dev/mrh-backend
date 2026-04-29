const express = require("express");
const router = express.Router();
const { getRoute } = require('../utils/getRoute');

const BatchRoutes = new Map();

// 🔥 Cleanup expired routes every 5 minutes
// setInterval(() => {
//     const now = Date.now();
//     const expiry = 30 * 60 * 1000; // 30 min

//     for (const [riderId, routeData] of BatchRoutes.entries()) {
//         if (now - routeData.timestamp > expiry) {
//             BatchRoutes.delete(riderId);
//             console.log(`Expired route for rider: ${riderId}`);
//         }
//     }
// }, 5 * 60 * 1000);


// =========================
// Reverse Geocode
// =========================

router.get("/reverse-geocode", async (req, res) => {
    try {
        const { lat, lon } = req.query;

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`,
            {
                headers: {
                    "User-Agent": "Mr Halwai"
                }
            }
        );

        const data = await response.json();
        res.json(data);

    } catch (err) {
        console.error("Error fetching address:", err);
        res.status(500).json({ error: "Failed to fetch address" });
    }
});


// =========================
// Fetch Route
// =========================
router.post("/fetch-route", async (req, res) => {
    try {
        const { stops, riderId } = req.body;

        // 🔹 Basic validation
        if (!stops || !riderId) {
            return res.status(400).json({ error: "stops and riderId are required" });
        }

        if (!Array.isArray(stops) || stops.length < 2) {
            return res.status(400).json({
                error: "stops must be array with at least 2 points"
            });
        }

        // 🔥 Ensure first stop is rider
        if (stops[0].type !== "rider") {
            return res.status(400).json({
                error: "First stop must be rider"
            });
        }

        // 🔥 Validate orderId for all stops except rider
        const validStops = stops.every((s, i) => {
            if (i === 0) return s.type === "rider";
            return s.orderId && typeof s.orderId === "string";
        });

        if (!validStops) {
            return res.status(400).json({
                error: "Each stop (except rider) must have orderId"
            });
        }

        // 🔹 Extract coords
        const coords = stops.map(s => [s.lat, s.lng]);

        // 🔹 Validate coordinates
        const validCoords = coords.every(coord =>
            Array.isArray(coord) &&
            coord.length === 2 &&
            typeof coord[0] === 'number' &&
            typeof coord[1] === 'number' &&
            coord[0] >= -90 && coord[0] <= 90 &&
            coord[1] >= -180 && coord[1] <= 180
        );

        if (!validCoords) {
            return res.status(400).json({
                error: "Invalid coordinate format"
            });
        }

        // 🔹 Fetch route
        const route = await getRoute(coords);

        if (!route || !route.success) {
            return res.status(500).json({
                error: "Failed to fetch route",
                details: route?.error || "Unknown error"
            });
        }

        // 🔥 Attach orderId to waypoints
        const enrichedWaypoints = route.waypoints.map((wp, index) => ({
            ...wp,
            orderId: stops[index]?.orderId || null,
            type: stops[index]?.type || "order"
        }));

        // 🔥 Build orderId → index map (O(1))
        const orderMap = {};
        enrichedWaypoints.forEach(wp => {
            if (wp.orderId) {
                orderMap[wp.orderId] = wp.index;
            }
        });

        // 🔹 Store in memory
        BatchRoutes.set(riderId, {
            route: {
                ...route,
                waypoints: enrichedWaypoints
            },
            stops,
            orderMap,
            timestamp: Date.now()
        });

        res.status(200).json({
            message: "Route fetched successfully",
            payload: {
                ...route,
                waypoints: enrichedWaypoints
            }
        });

    } catch (error) {
        console.error("Error fetching route:", error);
        res.status(500).json({
            error: "Failed to fetch route",
            details: error.message
        });
    }
});


// =========================
// Get Route
// =========================
router.get("/get-route/:riderId", async (req, res) => {
    try {
        const { riderId } = req.params;

        if (!riderId) {
            return res.status(400).json({ error: "riderId is required" });
        }

        const routeData = BatchRoutes.get(riderId);

        if (!routeData) {
            return res.status(404).json({ error: "Route not found for this rider" });
        }

        // 🔹 Expiry check
        // const expiry = 30 * 60 * 1000;
        // if (Date.now() - routeData.timestamp > expiry) {
        //     BatchRoutes.delete(riderId);
        //     return res.status(404).json({ error: "Route has expired" });
        // }

        res.status(200).json({
            message: "Route found",
            payload: routeData.route,
            stops: routeData.stops,
            orderMap: routeData.orderMap
        });

    } catch (error) {
        console.error("Error retrieving route:", error);
        res.status(500).json({
            error: "Failed to retrieve route",
            details: error.message
        });
    }
});


// =========================
// Helper: Get ETA for order
// =========================
function getETA(route, index) {
    let eta = 0;

    for (let i = 1; i <= index; i++) {
        eta += route.waypoints[i].etaBetween;
    }

    return eta;
}

module.exports = router;
