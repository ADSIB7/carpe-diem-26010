const { getSupabase } = require("./supabase");

const SIMULATION_INTERVAL_MS = 10000; // 10 seconds

const MIN_TEMP = 2;
const MAX_TEMP = 35; // Allow for spikes above critical
const MAX_HUMIDITY = 85;

// Keep track of our SSE clients
const clients = new Set();

function addAlertClient(clientRes) {
    clients.add(clientRes);
    clientRes.on("close", () => {
        clients.delete(clientRes);
    });
}

function broadcastAlert(alert) {
    const data = `data: ${JSON.stringify(alert)}\n\n`;
    for (const client of clients) {
        client.write(data);
    }
}

async function runFluctuation() {
    const supabase = getSupabase();

    // 1. Get all storage zones
    const { data: zones, error: zonesErr } = await supabase
        .from("storage_zones")
        .select("id, zone_code, warehouse_id, owner_user_id, state");

    if (zonesErr || !zones) {
        console.error("[simulation] Error fetching storage_zones:", zonesErr?.message);
        return;
    }

    for (const zone of zones) {
        // Baseline is around 26°C and 65% Humidity, with small fluctuations
        // 10% chance to occasionally spike to test thresholds
        let tOffset = (Math.random() < 0.1) ? (Math.random() * 8) : (Math.random() * 2 - 1);
        let hOffset = (Math.random() < 0.1) ? (Math.random() * 25) : (Math.random() * 5 - 2.5);

        const currentTemp = (26 + tOffset).toFixed(1);
        const currentHum = Math.floor(65 + hOffset);

        let climateState = "safe";
        let isCritical = false;

        if (currentTemp > 32 || currentHum > MAX_HUMIDITY) {
            climateState = "critical";
            isCritical = true;
        } else if (currentTemp > 28 || currentHum > 75) {
            climateState = "warning";
        }

        // Upsert into zone_climate_links
        await supabase.from("zone_climate_links").upsert({
            storage_zone_id: zone.id,
            owner_user_id: zone.owner_user_id,
            zone_code: zone.zone_code,
            temperature_c: currentTemp,
            humidity_percent: currentHum,
            climate_state: climateState,
            updated_at: new Date().toISOString()
        });

        // If state changed, update storage_zones state
        if (zone.state !== climateState) {
            await supabase.from("storage_zones")
                .update({ state: climateState, updated_at: new Date().toISOString() })
                .eq("id", zone.id);
        }

        // If critical, update batches in this zone
        if (isCritical) {
            // Find batches in this zone that aren't already critical
            const { data: affectedBatches } = await supabase
                .from("batches")
                .select("id, product_name, status")
                .eq("zone_code", zone.zone_code)
                .neq("status", "critical");

            if (affectedBatches && affectedBatches.length > 0) {
                // Update batch status to critical
                await supabase.from("batches")
                    .update({ status: "critical", updated_at: new Date().toISOString() })
                    .eq("zone_code", zone.zone_code);

                // Broadcast real-time alerts for each affected batch
                for (const b of affectedBatches) {
                    broadcastAlert({
                        type: "SPOILAGE_RISK",
                        zone: zone.zone_code,
                        batchId: b.id,
                        product: b.product_name,
                        message: `Temperature/Humidity out of bounds in ${zone.zone_code}. Spoilage risk CRITICAL for ${b.product_name}.`,
                        temperature: currentTemp,
                        humidity: currentHum
                    });
                }
            }
        }

        // 4. Record to climate_history for AI Trends
        await supabase.from("climate_history").insert({
            zone_id: zone.id,
            temperature_c: currentTemp,
            humidity_percent: currentHum,
            recorded_at: new Date().toISOString()
        });

        // 5. Enhanced AI Risk Logic (Variance Analysis)
        const { data: history } = await supabase
            .from("climate_history")
            .select("temperature_c, humidity_percent")
            .eq("zone_id", zone.id)
            .order("recorded_at", { ascending: false })
            .limit(10);

        if (history && history.length > 5) {
            const temps = history.map(h => Number(h.temperature_c));
            const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
            const variance = temps.reduce((a, b) => a + Math.pow(b - avgTemp, 2), 0) / temps.length;

            if (variance > 5) { // High fluctuation detected
                broadcastAlert({
                    type: "AI_PREDICTION",
                    zone: zone.zone_code,
                    message: `AI detected high temperature variance (${variance.toFixed(2)}) in ${zone.zone_code}. Future spoilage risk increasing.`,
                    priority: "medium"
                });
            }
        }
    }
}

function startSimulation() {
    console.log("[simulation] Starting climate fluctuation simulation...");
    setInterval(runFluctuation, SIMULATION_INTERVAL_MS);
    // Run once immediately
    runFluctuation();
}

module.exports = {
    startSimulation,
    addAlertClient
};
