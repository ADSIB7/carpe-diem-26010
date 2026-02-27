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

    const [zoneRes, batchRes] = await Promise.all([
      supabase.from("storage_zones").select("id,zone_code").eq("owner_user_id", ownerId).order("zone_code", { ascending: true }),
      supabase.from("batches").select("zone_code,quantity_tons,product_name,expiry_date,status").eq("owner_user_id", ownerId)
    ]);
    if (zoneRes.error) return res.status(500).json({ error: zoneRes.error.message });
    if (batchRes.error) return res.status(500).json({ error: batchRes.error.message });

    const zoneRows = zoneRes.data || [];
    const zoneByCode = zoneRows.reduce((acc, row) => {
      acc[row.zone_code] = row;
      return acc;
    }, {});
    const zoneIds = zoneRows.map((z) => z.zone_code);
    const zones = zoneIds.length ? zoneIds : defaultZoneIds;
    const batches = batchRes.data || [];
    const now = Date.now();
    const tick = Math.floor(now / 10000);

    const grouped = {};
    for (let i = 0; i < batches.length; i += 1) {
      const batch = batches[i];
      const zoneId = String(batch.zone_code || "UNASSIGNED");
      const quantity = Math.max(0, Number(batch.quantity_tons || 0));
      const profile = getCropProfile(batch.product_name);
      const daysToExpiry = Math.max(0, Math.ceil((new Date(batch.expiry_date).getTime() - now) / (1000 * 60 * 60 * 24)));
      const qualityPressure = clamp((14 - daysToExpiry) / 14, 0, 1);
      const statusPressure = String(batch.status || "").toLowerCase() === "critical" ? 1 : qualityPressure;
      const weight = quantity > 0 ? quantity : 1;
      if (!grouped[zoneId]) {
        grouped[zoneId] = {
          stockTons: 0,
          weightedQuality: 0,
          weightedSpoilRate: 0,
          weightedIdealTemp: 0,
          weightedIdealHumidity: 0,
          weightTotal: 0
        };
      }
      grouped[zoneId].stockTons += quantity;
      grouped[zoneId].weightedQuality += statusPressure * weight;
      grouped[zoneId].weightedSpoilRate += clamp(profile.idealSpoilRatePerDay / 0.5, 0, 1) * weight;
      grouped[zoneId].weightedIdealTemp += profile.idealTemp * weight;
      grouped[zoneId].weightedIdealHumidity += profile.idealHumidity * weight;
      grouped[zoneId].weightTotal += weight;
    }

    const maxStock = Object.keys(grouped).reduce((acc, key) => Math.max(acc, grouped[key].stockTons), 0);
    const zoneMeta = {};
    let globalPressureSum = 0;
    let globalPressureCount = 0;

    for (let i = 0; i < zones.length; i += 1) {
      const zoneId = zones[i];
      const record = grouped[zoneId];
      if (!record || !record.weightTotal) {
        zoneMeta[zoneId] = { score: 0, stockTons: 0, idealTemp: 4.8, idealHumidity: 75, hasStock: false };
        continue;
      }
      const stockPressure = maxStock > 0 ? clamp(record.stockTons / maxStock, 0, 1) : 0;
      const qualityPressure = clamp(record.weightedQuality / record.weightTotal, 0, 1);
      const spoilPressure = clamp(record.weightedSpoilRate / record.weightTotal, 0, 1);
      const score = clamp((stockPressure * 0.5) + (qualityPressure * 0.3) + (spoilPressure * 0.2), 0, 1);
      zoneMeta[zoneId] = {
        score,
        stockTons: Number(record.stockTons.toFixed(2)),
        idealTemp: Number((record.weightedIdealTemp / record.weightTotal).toFixed(1)),
        idealHumidity: Math.round(record.weightedIdealHumidity / record.weightTotal),
        hasStock: record.stockTons > 0
      };
      globalPressureSum += score;
      globalPressureCount += 1;
    }

    const globalPressure = globalPressureCount > 0 ? clamp(globalPressureSum / globalPressureCount, 0, 1) : 0;
    const baseTemp = clamp(4.8 + (Math.sin(tick / 5) * 0.12) + (globalPressure * 0.4), 3.8, 7.2);
    const baseHumidity = clamp(67 + (Math.sin(tick / 7 + 1.1) * 0.6) + (globalPressure * 2.4), 64, 73);
    const baseCo2 = clamp(980 + (Math.sin(tick / 8 + 0.4) * 14) + (globalPressure * 110), 820, 1500);
    const baseMoisture = clamp(12.4 + (Math.sin(tick / 9 + 0.8) * 0.1) + (globalPressure * 0.9), 10.8, 15.7);
    const baseAirflow = clamp(58 - (globalPressure * 9) + (Math.sin(tick / 6 + 2.3) * 1.1), 34, 74);

    const sensorState = {
      temperature: Number(baseTemp.toFixed(1)),
      humidity: Math.round(baseHumidity),
      co2: Math.round(baseCo2),
      moisture: Number(baseMoisture.toFixed(1)),
      airflow: Math.round(baseAirflow)
    };

    const zoneStates = [];
    let safe = 0;
    let warn = 0;
    let critical = 0;
    const warnings = [];
    let totalTemp = 0;
    let totalHumidity = 0;

    for (let i = 0; i < zones.length; i += 1) {
      const zoneId = zones[i];
      const meta = zoneMeta[zoneId] || { score: 0, stockTons: 0, idealTemp: sensorState.temperature, idealHumidity: sensorState.humidity, hasStock: false };
      let zoneTemp;
      let zoneHumidity;

      if (!meta.hasStock) {
        const existing = ownerState.noStockZoneReadings[zoneId];
        if (existing && Number.isFinite(existing.temp) && Number.isFinite(existing.humidity)) {
          zoneTemp = existing.temp;
          zoneHumidity = existing.humidity;
        } else {
          const seed = hashCode(`${ownerId}:${zoneId}`);
          const tempOffset = ((seed % 11) - 5) * 0.12; // ~[-0.6, +0.6]
          const humidityOffset = ((Math.floor(seed / 13) % 9) - 4); // ~[-4, +4]
          zoneTemp = Number(clamp(sensorState.temperature + tempOffset, 3.8, 7.0).toFixed(1));
          zoneHumidity = Math.round(clamp(sensorState.humidity + humidityOffset, 62, 76));
          ownerState.noStockZoneReadings[zoneId] = { temp: zoneTemp, humidity: zoneHumidity };
        }
      } else {
        const zonePhase = (hashCode(zoneId) % 9) / 10;
        const tempVariance = 0.8 + (meta.score * 2);
        const humidityVariance = 5 + (meta.score * 14);
        const instabilityTemp = (sensorState.temperature - meta.idealTemp) * meta.score * 0.55;
        const instabilityHumidity = (sensorState.humidity - meta.idealHumidity) * meta.score * 0.55;

        zoneTemp = clamp(
          sensorState.temperature + (Math.sin(tick / 4 + zonePhase) * tempVariance) + instabilityTemp,
          2.8,
          9.4
        );
        zoneHumidity = clamp(
          sensorState.humidity + (Math.cos(tick / 5 + zonePhase) * humidityVariance) + instabilityHumidity,
          58,
          93
        );

        zoneTemp = Number(zoneTemp.toFixed(1));
        zoneHumidity = Math.round(zoneHumidity);
      }

      const tState = statusFrom(zoneTemp, "temperature");
      const hState = statusFrom(zoneHumidity, "humidity");
      const state = tState === "critical" || hState === "critical" ? "critical" : (tState === "warn" || hState === "warn" ? "warn" : "safe");
      if (state === "critical") critical += 1;
      else if (state === "warn") warn += 1;
      else safe += 1;

      if (state !== "safe") {
        warnings.push(`${zoneId}: Temp ${zoneTemp.toFixed(1)} C, Hum ${zoneHumidity}%`);
      }

      totalTemp += zoneTemp;
      totalHumidity += zoneHumidity;
      zoneStates.push({
        id: zoneId,
        state,
        temp: zoneTemp,
        humidity: zoneHumidity,
        stockTons: meta.stockTons,
        pressure: Number(meta.score.toFixed(2))
      });
    }

    const linkRows = zoneStates
      .map((zone) => {
        const source = zoneByCode[zone.id];
        if (!source || !source.id) return null;
        return {
          storage_zone_id: source.id,
          owner_user_id: ownerId,
          zone_code: zone.id,
          temperature_c: Number(zone.temp || 0),
          humidity_percent: Number(zone.humidity || 0),
          stock_tons: Number(zone.stockTons || 0),
          pressure_score: Number(zone.pressure || 0),
          climate_state: zone.state || "safe",
          updated_at: new Date().toISOString()
        };
      })
      .filter(Boolean);

    if (linkRows.length > 0) {
      const linkUpsert = await supabase
        .from("zone_climate_links")
        .upsert(linkRows, { onConflict: "storage_zone_id" });
      if (linkUpsert.error) return res.status(500).json({ error: linkUpsert.error.message });
    }

    ownerState.sensorHistory.push({
      t: now,
      temperature: sensorState.temperature,
      humidity: sensorState.humidity,
      co2: sensorState.co2
    });
    if (ownerState.sensorHistory.length > 24) ownerState.sensorHistory.shift();

    const history = ownerState.sensorHistory;
    const tempTrend = history.length > 6 ? history[history.length - 1].temperature - history[history.length - 6].temperature : 0;
    const humTrend = history.length > 6 ? history[history.length - 1].humidity - history[history.length - 6].humidity : 0;

    const states = {
      temperature: statusFrom(sensorState.temperature, "temperature"),
      humidity: statusFrom(sensorState.humidity, "humidity"),
      co2: statusFrom(sensorState.co2, "co2"),
      moisture: statusFrom(sensorState.moisture, "moisture"),
      airflow: statusFrom(sensorState.airflow, "airflow")
    };

    const insight = critical > 0
      ? "Immediate action required: isolate critical zone(s) and increase airflow."
      : warn > 2
        ? "Humidity trend rising across multiple zones. Start preventive ventilation."
        : "Climate distribution is stable. Keep current cooling profile.";

    return res.status(200).json({
      data: {
        timestamp: now,
        sensorState,
        states,
        zoneIds: zones,
        thresholds: climateThresholds,
        zones: {
          safe,
          warn,
          critical,
          averageTemp: Number((totalTemp / Math.max(1, zones.length)).toFixed(1)),
          averageHumidity: Math.round(totalHumidity / Math.max(1, zones.length)),
          zoneStates,
          warnings: warnings.slice(0, 4),
          insight
        },
        prediction: {
          temp: tempTrend > 0.35 ? "Temperature likely to rise in coming cycles." : "Temperature trend stable in safe band.",
          humidity: humTrend > 1.5 ? "Humidity expected to remain elevated." : "Humidity likely to stay controlled.",
          action: tempTrend > 0.35 || humTrend > 1.5
            ? "Action: Increase ventilation and reduce chamber loading."
            : "Action: Maintain current cooling profile."
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

router.get("/market-intelligence", (_req, res) => {
  return res.status(200).json({
    data: {
      prices: [
        { crop: "Wheat", unit: 45, change: 5.0, region: "North" },
        { crop: "Rice", unit: 65, change: -2.3, region: "East" },
        { crop: "Maize", unit: 38, change: 3.1, region: "West" },
        { crop: "Soybean", unit: 72, change: -1.6, region: "Central" },
        { crop: "Tomato", unit: 28, change: 4.3, region: "South" }
      ],
      demands: [
        { crop: "Wheat", trend: "rising", region: "North", score: 86 },
        { crop: "Soybean", trend: "stable", region: "Central", score: 66 },
        { crop: "Tomato", trend: "rising", region: "South", score: 91 },
        { crop: "Rice", trend: "falling", region: "East", score: 48 },
        { crop: "Maize", trend: "stable", region: "West", score: 63 }
      ],
      forecast: [
        { crop: "Wheat", status: "Rising", points: [40, 44, 46, 49, 53, 55, 60], region: "North" },
        { crop: "Rice", status: "Stable", points: [64, 65, 66, 65, 66, 67, 66], region: "East" },
        { crop: "Tomato", status: "Decline", points: [34, 33, 31, 30, 28, 27, 26], region: "South" }
      ],
      competitors: [
        { name: "Cultivar Agro", crop: "Wheat", price: 68, region: "North" },
        { name: "GreenHarvest", crop: "Rice", price: 67, region: "East" },
        { name: "FreshField", crop: "Tomato", price: 70, region: "South" }
      ],
      supply: {
        inbound: 74,
        arrival: 1320,
        surplus: 18,
        alerts: [
          { icon: "!", text: "Government MSP update released for wheat", posted: "2 hrs ago" },
          { icon: "!", text: "Weather alert: heatwave may affect crop yields", posted: "1 day ago" },
          { icon: "!", text: "Transport strike risk on major inbound route", posted: "3 hrs ago" }
        ]
      }
    }
  });
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
