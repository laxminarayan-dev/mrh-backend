const getRoute = async (routeCoords) => {
    try {
        // Validate API key exists
        if (!process.env.ORS_API_KEY) {
            console.error("ORS_API_KEY not configured in environment variables");
            return {
                error: "Route service not configured",
                success: false,
                statusCode: 500
            };
        }

        // Validate waypoints exist and have minimum 2
        if (!Array.isArray(routeCoords) || routeCoords.length < 2) {
            return {
                error: "Invalid waypoints: minimum 2 waypoints required",
                success: false,
                statusCode: 400
            };
        }

        // Convert coordinates from [lat, lng] to [lng, lat] for OpenRouteService API
        const convertedCoords = routeCoords.map(coord => {
            if (!Array.isArray(coord) || coord.length !== 2) {
                throw new Error("Invalid coordinate format");
            }
            return [coord[1], coord[0]]; // Swap lat, lng to lng, lat
        });

        // Setup fetch with timeout (30 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(
            "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.ORS_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    coordinates: convertedCoords,
                    radiuses: convertedCoords.map((_, idx) => idx === 0 ? 50 : -1), // Snap first point
                    instructions: true,
                    maneuvers: true,
                }),
                signal: controller.signal,
            }
        );

        clearTimeout(timeoutId);

        // Check HTTP response status
        if (!res.ok) {
            const errorData = await res.text();
            console.error(`ORS API Error (${res.status}):`, errorData);
            return {
                error: `Route service returned ${res.status}`,
                success: false,
                statusCode: res.status,
                details: errorData
            };
        }

        const data = await res.json();

        // Check for API errors in response body
        if (data.error || data.errors) {
            console.error("ORS API Error in response:", data.error || data.errors);
            return {
                error: data.error?.message || "Route calculation failed",
                success: false,
                statusCode: 400,
                details: data.errors
            };
        }

        // Validate response has features
        if (!data.features || data.features.length === 0) {
            console.error("ORS returned no route features");
            return {
                error: "No route found between waypoints",
                success: false,
                statusCode: 404
            };
        }

        // Extract route info
        const feature = data.features[0];
        const summary = feature.properties?.summary || {};
        const segments = feature.properties?.segments || [];
        const wayPointIndices = feature.properties?.way_points || [];

        // Calculate ETA between waypoints (segment-based: A-B, B-C, C-D)
        const waypointData = [];
        let cumulativeDistance = 0;
        let cumulativeDuration = 0;

        for (let i = 0; i < routeCoords.length; i++) {
            if (i === 0) {
                waypointData.push({
                    index: 0,
                    lat: routeCoords[0][0],
                    lng: routeCoords[0][1],
                    etaFromStart: 0,
                    distFromStart: 0
                });
            } else {
                const segment = segments[i - 1];

                // Add current segment to the running total
                cumulativeDistance += segment?.distance || 0;
                cumulativeDuration += segment?.duration || 0;

                waypointData.push({
                    index: i,
                    lat: routeCoords[i][0],
                    lng: routeCoords[i][1],
                    etaFromStart: Math.round(cumulativeDuration), // Total time from Point A
                    distFromStart: Math.round(cumulativeDistance) // Total distance from Point A
                });
            }
        }

        return {
            success: true,
            statusCode: 200,
            distance: Math.round(summary.distance || 0), // total distance in meters
            duration: Math.round(summary.duration || 0), // total duration in seconds
            coordinates: feature.geometry?.coordinates || [], // route polyline [lng, lat]
            waypoints: waypointData, // waypoint info with segment-based ETA & distance (A-B, B-C, C-D)
            waypointCount: convertedCoords.length,
            wayPointIndices

        };

    } catch (error) {
        if (error.name === "AbortError") {
            console.error("Route fetch timeout (30s exceeded)");
            return {
                error: "Route service timeout - request took too long",
                success: false,
                statusCode: 504
            };
        }

        console.error("Route fetch error:", error.message);
        return {
            error: "Failed to fetch route",
            success: false,
            statusCode: 500,
            details: error.message
        };
    }
};

module.exports = { getRoute };