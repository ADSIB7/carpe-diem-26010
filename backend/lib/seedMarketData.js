async function seedMarketData(supabase) {
    try {
        console.log("[seedMarketData] Seeding market intelligence data...");

        // Check if data already exists to avoid duplicates
        const { data: existingPrices } = await supabase.from("market_prices").select("id").limit(1);
        if (existingPrices && existingPrices.length > 0) {
            console.log("[seedMarketData] Market data already seeded, skipping.");
            return;
        }

        const prices = [
            { crop: "Wheat", unit_price: 45, percent_change: 5.0, region: "North" },
            { crop: "Rice", unit_price: 65, percent_change: -2.3, region: "East" },
            { crop: "Maize", unit_price: 38, percent_change: 3.1, region: "West" },
            { crop: "Soybean", unit_price: 72, percent_change: -1.6, region: "Central" },
            { crop: "Tomato", unit_price: 28, percent_change: 4.3, region: "South" }
        ];

        const demands = [
            { crop: "Wheat", trend: "rising", region: "North", score: 86 },
            { crop: "Soybean", trend: "stable", region: "Central", score: 66 },
            { crop: "Tomato", trend: "rising", region: "South", score: 91 },
            { crop: "Rice", trend: "falling", region: "East", score: 48 },
            { crop: "Maize", trend: "stable", region: "West", score: 63 }
        ];

        const forecasts = [
            { crop: "Wheat", status: "Rising", points: [40, 44, 46, 49, 53, 55, 60], region: "North" },
            { crop: "Rice", status: "Stable", points: [64, 65, 66, 65, 66, 67, 66], region: "East" },
            { crop: "Tomato", status: "Decline", points: [34, 33, 31, 30, 28, 27, 26], region: "South" }
        ];

        const competitors = [
            { name: "Cultivar Agro", crop: "Wheat", price: 68, region: "North" },
            { name: "GreenHarvest", crop: "Rice", price: 67, region: "East" },
            { name: "FreshField", crop: "Tomato", price: 70, region: "South" }
        ];

        const supplyChain = {
            inbound_stock_percent: 74,
            arrival_volume_tons: 1320,
            surplus_percent: 18,
            alerts: [
                { icon: "!", text: "Government MSP update released for wheat", posted: "2 hrs ago" },
                { icon: "!", text: "Weather alert: heatwave may affect crop yields", posted: "1 day ago" },
                { icon: "!", text: "Transport strike risk on major inbound route", posted: "3 hrs ago" }
            ]
        };

        const results = await Promise.all([
            supabase.from("market_prices").insert(prices),
            supabase.from("market_demands").insert(demands),
            supabase.from("market_forecasts").insert(forecasts),
            supabase.from("market_competitors").insert(competitors),
            supabase.from("market_supply_chain").insert(supplyChain)
        ]);

        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            errors.forEach(e => console.error("[seedMarketData] Error:", e.error.message));
            throw new Error("Failed to seed some market data.");
        }

        console.log("[seedMarketData] Market intelligence data seeded successfully.");
    } catch (err) {
        console.error("[seedMarketData] Exception during seeding:", err.message);
    }
}

module.exports = { seedMarketData };
