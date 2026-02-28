const express = require("express");
const supabaseLib = require("../lib/supabase");

const router = express.Router();
const climateStateByOwner = new Map();

const defaultZoneIds = ["A1", "A2", "B1", "B2", "D1", "C1", "C2", "C3", "D2", "D4"];
const climateThresholds = {
  temperature: { warn: 6.5, critical: 8.2 },
  humidity: { warn: 80, critical: 87 },
  co2: { warn: 1250, critical: 1600 },
  moisture: { warn: 14.5, critical: 16 },
  airflow: { warn: 45, critical: 30 }
};
const cropProfiles = [
  { aliases: ["wheat", "atta", "durum"], idealTemp: 5.2, idealHumidity: 68, idealSpoilRatePerDay: 0.18 },
  { aliases: ["rice", "paddy", "basmati"], idealTemp: 6.1, idealHumidity: 70, idealSpoilRatePerDay: 0.2 },
  { aliases: ["maize", "corn"], idealTemp: 6.4, idealHumidity: 66, idealSpoilRatePerDay: 0.22 },
  { aliases: ["potato"], idealTemp: 4.3, idealHumidity: 80, idealSpoilRatePerDay: 0.35 },
  { aliases: ["onion"], idealTemp: 6.8, idealHumidity: 65, idealSpoilRatePerDay: 0.24 },
  { aliases: ["tomato"], idealTemp: 7.3, idealHumidity: 82, idealSpoilRatePerDay: 0.48 }
];
const defaultCropProfile = { idealTemp: 5.8, idealHumidity: 72, idealSpoilRatePerDay: 0.26 };

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function statusFrom(value, metricName) {
  const rule = climateThresholds[metricName];
  if (metricName === "airflow") {
    if (value <= rule.critical) return "critical";
    if (value <= rule.warn) return "warn";
    return "safe";
  }
  if (value >= rule.critical) return "critical";
  if (value >= rule.warn) return "warn";
  return "safe";
}

function hashCode(text) {
  let hash = 0;
  const str = String(text || "");
  for (let i = 0; i < str.length; i += 1) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getCropProfile(productName) {
  const normalized = String(productName || "").toLowerCase();
  for (let i = 0; i < cropProfiles.length; i += 1) {
    const profile = cropProfiles[i];
    for (let j = 0; j < profile.aliases.length; j += 1) {
      if (normalized.includes(profile.aliases[j])) return profile;
    }
  }
  return defaultCropProfile;
}

function getOwnerClimateState(ownerId) {
  if (!climateStateByOwner.has(ownerId)) {
    climateStateByOwner.set(ownerId, {
      sensorHistory: [],
      noStockZoneReadings: {}
    });
  }
  return climateStateByOwner.get(ownerId);
}

router.get("/climate-config", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const supabase = supabaseLib.getSupabase();
    const { data } = await supabase
      .from("storage_zones")
      .select("zone_code")
      .eq("owner_user_id", ownerId)
      .order("zone_code", { ascending: true });

    const zoneIds = (data || []).map((z) => z.zone_code);
    return res.status(200).json({
      data: {
        sensorState: { temperature: 4.6, humidity: 74, co2: 980, moisture: 12.4, airflow: 58 },
        zoneIds: zoneIds.length ? zoneIds : defaultZoneIds,
        thresholds: {
          temperature: { warn: 6.5, critical: 8.2 },
          humidity: { warn: 80, critical: 87 },
          co2: { warn: 1250, critical: 1600 },
          moisture: { warn: 14.5, critical: 16 },
          airflow: { warn: 45, critical: 30 }
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/climate-live", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const supabase = supabaseLib.getSupabase();
    const ownerState = getOwnerClimateState(ownerId);

    // 1. Fetch current data from the database
    const [zoneRes, batchRes, linkRes] = await Promise.all([
      supabase.from("storage_zones").select("id,zone_code").eq("owner_user_id", ownerId).order("zone_code", { ascending: true }),
      supabase.from("batches").select("zone_code,quantity_tons,product_name,expiry_date,status").eq("owner_user_id", ownerId),
      supabase.from("zone_climate_links").select("*").eq("owner_user_id", ownerId)
    ]);

    if (zoneRes.error) return res.status(500).json({ error: zoneRes.error.message });
    if (batchRes.error) return res.status(500).json({ error: batchRes.error.message });
    if (linkRes.error) return res.status(500).json({ error: linkRes.error.message });

    const zoneRows = zoneRes.data || [];
    const batches = batchRes.data || [];
    const linkRows = linkRes.data || [];
    const linkByZoneId = linkRows.reduce((acc, row) => {
      acc[row.storage_zone_id] = row;
      return acc;
    }, {});

    const now = Date.now();

    // 2. Map zones and their climate states
    const zoneStates = zoneRows.map(zone => {
      const link = linkByZoneId[zone.id];
      const zoneBatches = batches.filter(b => b.zone_code === zone.zone_code);
      const stockTons = zoneBatches.reduce((sum, b) => sum + Number(b.quantity_tons || 0), 0);

      return {
        id: zone.zone_code,
        temp: link ? Number(link.temperature_c) : 4.8,
        humidity: link ? Number(link.humidity_percent) : 72,
        state: link ? link.climate_state : "safe",
        stockTons: Number(stockTons.toFixed(2)),
        pressure: link ? Number(link.pressure_score || 0) : 0
      };
    });

    const safe = zoneStates.filter(z => z.state === "safe").length;
    const warn = zoneStates.filter(z => z.state === "warn").length;
    const critical = zoneStates.filter(z => z.state === "critical").length;

    const totalTemp = zoneStates.reduce((sum, z) => sum + z.temp, 0);
    const totalHum = zoneStates.reduce((sum, z) => sum + z.humidity, 0);
    const avgTemp = Number((totalTemp / Math.max(1, zoneStates.length)).toFixed(1));
    const avgHum = Math.round(totalHum / Math.max(1, zoneStates.length));

    // 3. Overall sensor state (Averaged/Aggregated)
    const sensorState = {
      temperature: avgTemp,
      humidity: avgHum,
      co2: 980 + (critical * 50) + (warn * 20), // Synthetic CO2 based on activity
      moisture: 12.4 + (avgHum > 80 ? (avgHum - 80) * 0.1 : 0), // Synthetic moisture
      airflow: Math.max(30, 60 - (critical * 5) - (warn * 2)) // Airflow decreases as risk increases
    };

    const states = {
      temperature: statusFrom(sensorState.temperature, "temperature"),
      humidity: statusFrom(sensorState.humidity, "humidity"),
      co2: statusFrom(sensorState.co2, "co2"),
      moisture: statusFrom(sensorState.moisture, "moisture"),
      airflow: statusFrom(sensorState.airflow, "airflow")
    };

    // 4. Update history and trends
    ownerState.sensorHistory.push({
      t: now,
      temperature: sensorState.temperature,
      humidity: sensorState.humidity,
      co2: sensorState.co2
    });
    if (ownerState.sensorHistory.length > 24) ownerState.sensorHistory.shift();

    const history = ownerState.sensorHistory;
    const tempTrend = history.length > 3 ? history[history.length - 1].temperature - history[history.length - 3].temperature : 0;
    const humTrend = history.length > 3 ? history[history.length - 1].humidity - history[history.length - 3].humidity : 0;

    const insight = critical > 0
      ? "Immediate action required: isolate critical zone(s) and increase airflow."
      : warn > 2
        ? "Humidity trend rising across multiple zones. Start preventive ventilation."
        : "Climate distribution is stable. Overall environment in safe band.";

    return res.status(200).json({
      data: {
        timestamp: now,
        sensorState,
        states,
        zoneIds: zoneRows.map(z => z.zone_code),
        thresholds: climateThresholds,
        zones: {
          safe,
          warn,
          critical,
          averageTemp: avgTemp,
          averageHumidity: avgHum,
          zoneStates,
          warnings: zoneStates.filter(z => z.state !== "safe").slice(0, 4).map(z => `${z.id}: Temp ${z.temp.toFixed(1)} C, Hum ${z.humidity}%`),
          insight
        },
        prediction: {
          temp: tempTrend > 0.2 ? "Temperature rising: AI predicts potential threshold breach in 2 hours." : "Temperature trend stable.",
          humidity: humTrend > 1 ? "Humidity increasing: Preventive ventilation recommended." : "Humidity likely to stay controlled.",
          action: tempTrend > 0.2 || humTrend > 1
            ? "Action: Increase cooling cycle and exhaust airflow."
            : "Action: Maintain current environmental setpoints."
        },
        history: {
          labels: history.map((h) => new Date(h.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
          temperature: history.map((h) => h.temperature),
          humidity: history.map((h) => h.humidity),
          co2: history.map((h) => h.co2)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/storage-capacity", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const supabase = supabaseLib.getSupabase();
    const defaultRegions = ["Region A", "Region B", "Region C", "Region D"];
    const [storageRes, batchesRes, warehousesRes] = await Promise.all([
      supabase
        .from("storage_zones")
        .select("*")
        .eq("owner_user_id", ownerId)
        .order("zone_code", { ascending: true }),
      supabase
        .from("batches")
        .select("quantity_tons, entry_date")
        .eq("owner_user_id", ownerId),
      supabase
        .from("warehouses")
        .select("current_stock_tons")
        .eq("owner_user_id", ownerId)
    ]);

    const { data, error } = storageRes;
    if (error) return res.status(500).json({ error: error.message });
    if (batchesRes.error) return res.status(500).json({ error: batchesRes.error.message });
    if (warehousesRes.error) return res.status(500).json({ error: warehousesRes.error.message });

    const zones = data || [];
    const batches = batchesRes.data || [];
    const weeklyUtilization = zones.slice(0, 7).map((z) => z.utilization_percent || 0);
    while (weeklyUtilization.length < 7) weeklyUtilization.push(60 + weeklyUtilization.length * 4);
    const weeklyLine = weeklyUtilization.map((v) => Math.max(0, Math.min(100, Math.round(v * 0.9))));

    const zoneData = zones.map((z) => ({
      zone: z.zone_code,
      utilization: z.utilization_percent,
      capacity: Number(z.capacity_tons || 0),
      used: Number(z.occupied_tons || 0),
      free: Math.max(0, Number(z.capacity_tons || 0) - Number(z.occupied_tons || 0)),
      crops: "Mixed Produce",
      temp: "4.5C",
      risk: z.state === "critical" ? "High" : z.state === "warn" ? "Moderate" : "Low"
    }));

    const topProducts = [
      { name: "Potatoes", tons: 85 },
      { name: "Rice", tons: 70 },
      { name: "Tomatoes", tons: 65 },
      { name: "Corn", tons: 60 },
      { name: "Wheat", tons: 50 }
    ];
    const totals = zones.reduce(
      (acc, z) => {
        const capacity = Number(z.capacity_tons || 0);
        const used = Number(z.occupied_tons || 0);
        acc.capacity += capacity;
        acc.used += used;
        return acc;
      },
      { capacity: 0, used: 0 }
    );
    const availableCapacityTons = Math.max(0, Math.round((totals.capacity - totals.used) * 10) / 10);
    const utilizationPercent = totals.capacity > 0 ? Math.round((totals.used / totals.capacity) * 100) : 0;
    const currentTotalStockTons = Math.round(
      (warehousesRes.data || []).reduce((sum, w) => sum + Number(w.current_stock_tons || 0), 0) * 10
    ) / 10;

    const now = Date.now();
    const windowDays = 14;
    const windowStart = now - windowDays * 24 * 60 * 60 * 1000;
    const recentInflow = batches
      .filter((b) => new Date(b.entry_date).getTime() >= windowStart)
      .reduce((sum, b) => sum + Number(b.quantity_tons || 0), 0);
    const inflowPerDay = recentInflow > 0 ? recentInflow / windowDays : 0;
    const daysUntilFull = inflowPerDay > 0 ? Math.ceil(availableCapacityTons / inflowPerDay) : null;

    const highUtilZones = zones.filter((z) => Number(z.utilization_percent || 0) >= 85).length;
    const criticalStateZones = zones.filter((z) => String(z.state || "").toLowerCase() === "critical").length;
    const warningStateZones = zones.filter((z) => String(z.state || "").toLowerCase() === "warn").length;
    const optimizationOpportunities = Math.max(
      0,
      highUtilZones + criticalStateZones + (daysUntilFull !== null && daysUntilFull <= 7 ? 1 : 0)
    );

    let regionTable = [];
    const regionSelect = await supabase
      .from("region_storage_metrics")
      .select("region_code,total_capacity_tons,used_tons,free_tons,utilization_percent")
      .eq("owner_user_id", ownerId)
      .order("region_code", { ascending: true });
    if (regionSelect.error) return res.status(500).json({ error: regionSelect.error.message });

    if (!regionSelect.data || regionSelect.data.length === 0) {
      const zeroRows = defaultRegions.map((regionCode) => ({
        owner_user_id: ownerId,
        region_code: regionCode,
        total_capacity_tons: 0,
        used_tons: 0,
        free_tons: 0,
        utilization_percent: 0
      }));
      const seedRes = await supabase
        .from("region_storage_metrics")
        .upsert(zeroRows, { onConflict: "owner_user_id,region_code" });
      if (seedRes.error) return res.status(500).json({ error: seedRes.error.message });

      const seededRows = await supabase
        .from("region_storage_metrics")
        .select("region_code,total_capacity_tons,used_tons,free_tons,utilization_percent")
        .eq("owner_user_id", ownerId)
        .order("region_code", { ascending: true });
      if (seededRows.error) return res.status(500).json({ error: seededRows.error.message });
      regionTable = seededRows.data || [];
    } else {
      regionTable = regionSelect.data;
    }

    return res.status(200).json({
      data: {
        weeklyUtilization,
        weeklyLine,
        topProducts,
        zoneData,
        regionTable: regionTable.map((row) => ({
          region: row.region_code,
          totalCapacityTons: Number(row.total_capacity_tons || 0),
          usedTons: Number(row.used_tons || 0),
          freeTons: Number(row.free_tons || 0),
          utilizationPercent: Number(row.utilization_percent || 0)
        })),
        summary: {
          utilizationPercent,
          currentTotalStockTons,
          availableCapacityTons,
          daysUntilFull,
          optimizationOpportunities,
          avgUtilization: zones.length
            ? Math.round(zones.reduce((sum, z) => sum + Number(z.utilization_percent || 0), 0) / zones.length)
            : 0,
          maxUtilization: zones.length
            ? Math.max(...zones.map((z) => Number(z.utilization_percent || 0)))
            : 0,
          estimatedPalletsStored: Math.round(totals.used * 1.4),
          warningZones: warningStateZones,
          criticalZones: criticalStateZones
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/risk-spoilage", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const supabase = supabaseLib.getSupabase();
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("owner_user_id", ownerId)
      .order("expiry_date", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    const now = Date.now();
    const forecastData = (data || []).map((b) => {
      const days = Math.max(0, Math.ceil((new Date(b.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24)));
      const risk = Math.max(5, Math.min(95, 100 - days * 8));
      const status = days <= 2 ? "critical" : days <= 7 ? "warning" : "safe";
      return {
        id: "#" + String(b.id).slice(0, 6).toUpperCase(),
        product: b.product_name,
        farmer: b.farmer_name,
        quantityTons: Number(b.quantity_tons || 0),
        risk,
        status,
        days
      };
    });

    const base = forecastData.length ? forecastData.slice(0, 7).map((f) => f.risk) : [72, 64, 70, 74, 83, 71, 68];
    const riskTrend = base;
    const overallRiskScore = forecastData.length
      ? Math.round(forecastData.reduce((sum, row) => sum + row.risk, 0) / forecastData.length)
      : 0;
    const overallRiskLevel = overallRiskScore >= 70 ? "High Risk" : overallRiskScore >= 40 ? "Medium Risk" : "Low Risk";
    const activeHighRiskBatches = forecastData.filter((row) => row.status === "critical" || row.risk >= 75).length;
    const predictedSpoilageTonsNext48h = Math.round(
      forecastData
        .filter((row) => row.days <= 2)
        .reduce((sum, row) => sum + Number(row.quantityTons || 0), 0) * 10
    ) / 10;
    const totalSavedLast30Days = Math.round(
      forecastData
        .filter((row) => row.status === "safe")
        .reduce((sum, row) => sum + Number(row.quantityTons || 0) * 220, 0)
    );
    const preventionSuggestions = Math.max(
      0,
      (forecastData.some((row) => row.status === "critical") ? 1 : 0) +
      (forecastData.some((row) => row.status === "warning") ? 1 : 0) +
      (overallRiskScore >= 60 ? 1 : 0)
    );

    return res.status(200).json({
      data: {
        forecastData,
        riskTrend,
        summary: {
          overallRiskScore,
          overallRiskLevel,
          activeHighRiskBatches,
          predictedSpoilageTonsNext48h,
          totalSavedLast30Days,
          preventionSuggestions
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/market-intelligence", async (_req, res) => {
  try {
    const supabase = supabaseLib.getSupabase();
    const [pricesRes, demandsRes, forecastsRes, competitorsRes, supplyRes] = await Promise.all([
      supabase.from("market_prices").select("crop, unit_price, percent_change, region"),
      supabase.from("market_demands").select("crop, trend, region, score"),
      supabase.from("market_forecasts").select("crop, status, points, region"),
      supabase.from("market_competitors").select("name, crop, price, region"),
      supabase.from("market_supply_chain").select("inbound_stock_percent, arrival_volume_tons, surplus_percent, alerts").limit(1).single()
    ]);

    if (pricesRes.error) throw pricesRes.error;
    if (demandsRes.error) throw demandsRes.error;
    if (forecastsRes.error) throw forecastsRes.error;
    if (competitorsRes.error) throw competitorsRes.error;
    if (supplyRes.error) throw supplyRes.error;

    return res.status(200).json({
      data: {
        prices: pricesRes.data.map(p => ({
          crop: p.crop,
          unit: p.unit_price,
          change: p.percent_change,
          region: p.region
        })),
        demands: demandsRes.data,
        forecast: forecastsRes.data,
        competitors: competitorsRes.data,
        supply: {
          inbound: supplyRes.data.inbound_stock_percent,
          arrival: supplyRes.data.arrival_volume_tons,
          surplus: supplyRes.data.surplus_percent,
          alerts: supplyRes.data.alerts
        }
      }
    });
  } catch (err) {
    console.error("[uiDataRoutes] Market intelligence fetch failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch market intelligence data." });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const ownerId = req.user.id;
    const supabase = supabaseLib.getSupabase();
    const fallbackZones = [
      { zone_code: "A1", capacity_tons: 120, occupied_tons: 94, state: "safe" },
      { zone_code: "A2", capacity_tons: 110, occupied_tons: 95, state: "warn" },
      { zone_code: "A3", capacity_tons: 95, occupied_tons: 89, state: "critical" },
      { zone_code: "B1", capacity_tons: 130, occupied_tons: 83, state: "safe" },
      { zone_code: "B2", capacity_tons: 90, occupied_tons: 80, state: "warn" },
      { zone_code: "C1", capacity_tons: 100, occupied_tons: 58, state: "safe" }
    ];

    const [storageRes, batchesRes, warehousesRes] = await Promise.all([
      supabase.from("storage_zones").select("*").eq("owner_user_id", ownerId),
      supabase.from("batches").select("*").eq("owner_user_id", ownerId),
      supabase.from("warehouses").select("current_stock_tons").eq("owner_user_id", ownerId)
    ]);
    if (storageRes.error) return res.status(500).json({ error: storageRes.error.message });
    if (batchesRes.error) return res.status(500).json({ error: batchesRes.error.message });
    if (warehousesRes.error) return res.status(500).json({ error: warehousesRes.error.message });

    const zones = (storageRes.data && storageRes.data.length) ? storageRes.data : fallbackZones;
    const batches = batchesRes.data || [];
    const now = Date.now();

    const totals = zones.reduce(
      (acc, z) => {
        acc.capacity += Number(z.capacity_tons || 0);
        acc.occupied += Number(z.occupied_tons || 0);
        const state = String(z.state || "").toLowerCase();
        if (state === "critical") acc.criticalZones += 1;
        else if (state === "warn") acc.warnZones += 1;
        else acc.safeZones += 1;
        return acc;
      },
      { capacity: 0, occupied: 0, safeZones: 0, warnZones: 0, criticalZones: 0 }
    );

    const stockFromBatches = batches.reduce((sum, b) => sum + Number(b.quantity_tons || 0), 0);
    const stockFromWarehouses = (warehousesRes.data || []).reduce((sum, w) => sum + Number(w.current_stock_tons || 0), 0);
    const totalStock = stockFromBatches > 0 ? stockFromBatches : (stockFromWarehouses > 0 ? stockFromWarehouses : totals.occupied);
    const todayISO = new Date().toISOString().slice(0, 10);
    const inboundToday = batches.filter((b) => String(b.entry_date || "").slice(0, 10) === todayISO).length;
    const outboundToday = batches.filter((b) => {
      const status = String(b.status || "").toLowerCase();
      return status === "outgoing" || status === "dispatched";
    }).length;

    const riskRows = batches
      .map((b) => {
        const daysLeft = Math.ceil((new Date(b.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24));
        return {
          id: "#" + String(b.id).slice(0, 6).toUpperCase(),
          product: b.product_name,
          zone: b.zone_code,
          daysLeft,
          risk: Math.max(5, Math.min(95, 100 - Math.max(0, daysLeft) * 8))
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const topRiskItems = riskRows.slice(0, 3);
    const windowDays = 14;
    const windowStart = now - windowDays * 24 * 60 * 60 * 1000;
    const storageOverview = zones
      .slice()
      .sort((a, b) => Number(b.utilization_percent || 0) - Number(a.utilization_percent || 0))
      .slice(0, 3)
      .map((zone) => {
        const zoneCode = String(zone.zone_code || "");
        const zoneBatches = batches.filter((b) => String(b.zone_code || "") === zoneCode);
        const productTotals = zoneBatches.reduce((acc, b) => {
          const key = String(b.product_name || "Mixed Produce");
          acc[key] = (acc[key] || 0) + Number(b.quantity_tons || 0);
          return acc;
        }, {});
        const topProduct = Object.keys(productTotals).sort((a, b) => productTotals[b] - productTotals[a])[0] || "Mixed Produce";
        const capacity = Number(zone.capacity_tons || 0);
        const occupied = Number(zone.occupied_tons || 0);
        const freeTons = Math.max(0, Math.round((capacity - occupied) * 10) / 10);
        const recentInflow = zoneBatches
          .filter((b) => new Date(b.entry_date).getTime() >= windowStart)
          .reduce((sum, b) => sum + Number(b.quantity_tons || 0), 0);
        const inflowPerDay = recentInflow > 0 ? recentInflow / windowDays : 0;
        const daysLeft = inflowPerDay > 0 ? Math.ceil(freeTons / inflowPerDay) : null;
        return {
          id: zoneCode || "#N/A",
          product: topProduct,
          daysLeft,
          freeTons,
          utilizationPercent: Number(zone.utilization_percent || 0)
        };
      });

    const recentActivity = batches
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 3)
      .map((b) => ({
        title: `${b.product_name} batch updated`,
        whenMinutes: Math.max(0, Math.round((now - new Date(b.updated_at || b.created_at).getTime()) / (1000 * 60 * 60)))
      }));

    return res.status(200).json({
      data: {
        summary: {
          totalStorage: Math.round(totals.capacity * 10) / 10,
          currentUtilization: totals.capacity > 0 ? Math.round((totals.occupied / totals.capacity) * 100) : 0,
          totalStock: Math.round(totalStock * 10) / 10,
          inboundToday,
          outboundToday,
          activeAlerts: totals.warnZones + totals.criticalZones + topRiskItems.filter((r) => r.daysLeft <= 2).length,
          availableSpace: Math.max(0, Math.round((totals.capacity - totals.occupied) * 10) / 10),
          safePercent: zones.length ? Math.round((totals.safeZones / zones.length) * 100) : 0,
          warnPercent: zones.length ? Math.round((totals.warnZones / zones.length) * 100) : 0,
          criticalPercent: zones.length ? Math.round((totals.criticalZones / zones.length) * 100) : 0
        },
        zoneStates: zones.map((z) => ({ zone: z.zone_code, state: z.state })),
        topRiskItems,
        storageOverview,
        marketRows: [
          { name: "Onion", price: 34, change: 1.8 },
          { name: "Tomato", price: 22, change: -2.1 },
          { name: "Rice", price: 48, change: 0.6 }
        ],
        marketCallout: "AI suggest: monitor tomato volatility and hold rice inventory.",
        recentActivity
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
