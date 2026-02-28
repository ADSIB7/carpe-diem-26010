const { randomUUID } = require("crypto");

const DEMO_USER_ID = "a9dd8fb6-20a7-46fe-9b86-11147e613a61";
const { seedMarketData } = require("./seedMarketData");

function pick(arr, index) {
    return arr[index % arr.length];
}

async function initializeDemoUser(supabase) {
    try {
        const { data: existingWarehouse, error: checkError } = await supabase
            .from("warehouses")
            .select("id")
            .eq("owner_user_id", DEMO_USER_ID)
            .limit(1)
            .maybeSingle();

        if (checkError) {
            console.error("[demoInit] Error checking demo warehouse:", checkError.message);
            return;
        }

        if (existingWarehouse) {
            console.log("[demoInit] Demo user already has a warehouse, skipping warehouse initialization.");
            // Still seed market data if missing
            await seedMarketData(supabase);
            return;
        }

        console.log("[demoInit] Initializing Demo User Workspace...");

        // 1. Create Warehouse
        const warehouseId = randomUUID();
        const warehousePayload = {
            id: warehouseId,
            owner_user_id: DEMO_USER_ID,
            name: "Demo Central Warehouse",
            location: "Agri-Tech Park, Sector 4",
            manager_name: "Demo Manager",
            capacity_tons: 5000,
            current_stock_tons: 1350,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { error: wError } = await supabase.from("warehouses").insert(warehousePayload);
        if (wError) throw new Error("Failed to create demo warehouse: " + wError.message);
        console.log("[demoInit] Created Warehouse:", warehousePayload.name);

        // 2. Create Storage Zones
        const zones = [
            { zone_code: "A1", capacity_tons: 1000, occupied_tons: 600, state: "safe" },
            { zone_code: "B1", capacity_tons: 2000, occupied_tons: 500, state: "safe" },
            { zone_code: "C1", capacity_tons: 2000, occupied_tons: 250, state: "warning" },
            { zone_code: "D1", capacity_tons: 1000, occupied_tons: 0, state: "safe" } // empty zone
        ];

        const zoneRows = zones.map(z => ({
            id: randomUUID(),
            owner_user_id: DEMO_USER_ID,
            warehouse_id: warehouseId,
            zone_code: z.zone_code,
            state: z.state,
            capacity_tons: z.capacity_tons,
            occupied_tons: z.occupied_tons,
            utilization_percent: Math.round((z.occupied_tons / z.capacity_tons) * 100),
            updated_at: new Date().toISOString()
        }));

        const { error: zError } = await supabase.from("storage_zones").insert(zoneRows);
        if (zError) throw new Error("Failed to create demo storage zones: " + zError.message);
        console.log(`[demoInit] Created ${zoneRows.length} Storage Zones.`);


        // 3. Create Batches
        const products = ["Potatoes", "Rice", "Tomatoes", "Onions", "Wheat"];
        const farmers = ["Ravi Singh", "Aman Verma", "Neha Patel", "Suresh Rao"];
        const statuses = ["active", "active", "active", "in_transit", "active"];
        const now = Date.now();
        const batchCount = 15;
        const batchRows = [];

        const availableZones = zoneRows.filter(z => z.occupied_tons > 0).map(z => z.zone_code);

        for (let i = 0; i < batchCount; i++) {
            const quantity = Number((50 + (i % 5) * 5 + Math.random() * 20).toFixed(1));
            const entryOffsetDays = 1 + (i % 12);
            // Ensure some batches have critical expiry for demo
            let expiryOffsetDays = 15 + (i % 20);
            if (i % 4 === 0) expiryOffsetDays = 1 + (i % 3); // some expiring very soon

            batchRows.push({
                id: randomUUID(),
                owner_user_id: DEMO_USER_ID,
                warehouse_id: warehouseId,
                product_name: pick(products, i),
                farmer_name: pick(farmers, i * 2),
                quantity_tons: quantity,
                zone_code: pick(availableZones, i),
                status: pick(statuses, i),
                entry_date: new Date(now - entryOffsetDays * 24 * 60 * 60 * 1000).toISOString(),
                expiry_date: new Date(now + expiryOffsetDays * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        const { error: bError } = await supabase.from("batches").insert(batchRows);
        if (bError) throw new Error("Failed to create demo batches: " + bError.message);

        console.log(`[demoInit] Seeded ${batchRows.length} active Batches.`);
        console.log("[demoInit] Demo Workspace Initialization Complete!");

        // Also seed market data
        await seedMarketData(supabase);

    } catch (err) {
        console.error("[demoInit] Initialization failed:", err);
    }
}

module.exports = { initializeDemoUser };
