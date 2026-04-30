const getOptimizedStopOrder = async (stops) => {
    const API_KEY = process.env.ORS_API_KEY;
    const PROFILE = "driving-car"; // Motorbike profile

    try {
        const coords = stops.map(s => [s.lng, s.lat]);

        const res = await fetch(`https://api.openrouteservice.org/v2/matrix/${PROFILE}`, {
            method: "POST",
            headers: {
                "Authorization": API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ locations: coords, metrics: ["duration"] })
        });

        if (!res.ok) throw new Error("Matrix API Request Failed");
        const { durations } = await res.json();

        // Greedy Sorting Algorithm
        const visited = new Set();
        const optimizedStops = [];
        let currentIndex = 0;

        optimizedStops.push(stops[currentIndex]);
        visited.add(currentIndex);

        while (visited.size < stops.length) {
            let nearestIndex = -1;
            let minTime = Infinity;

            for (let i = 0; i < durations[currentIndex].length; i++) {
                if (!visited.has(i) && durations[currentIndex][i] < minTime) {
                    minTime = durations[currentIndex][i];
                    nearestIndex = i;
                }
            }

            if (nearestIndex !== -1) {
                optimizedStops.push(stops[nearestIndex]);
                visited.add(nearestIndex);
                currentIndex = nearestIndex;
            }
        }

        return { success: true, optimizedStops };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

module.exports = { getOptimizedStopOrder }