const express = require("express");
const { randomUUID } = require("crypto");
const { getSupabase } = require("../lib/supabase");

const router = express.Router();

function numberOrNaN(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateStorage(payload, isPatch) {
  const errors = [];
  const required = ["warehouseId", "zoneCode"];

  if (!isPatch) {
    required.forEach((field) => {
      if (!payload[field]) errors.push(`${field} is required`);
    });
  }

  const capacity = payload.capacityTons !== undefined ? numberOrNaN(payload.capacityTons) : null;
  const occupied = payload.occupiedTons !== undefined ? numberOrNaN(payload.occupiedTons) : null;

  if (capacity !== null && (Number.isNaN(capacity) || capacity < 0)) {
    errors.push("capacityTons must be a non-negative number");
  }

  if (occupied !== null && (Number.isNaN(occupied) || occupied < 0)) {
    errors.push("occupiedTons must be a non-negative number");
  }

  if (capacity !== null && occupied !== null && occupied > capacity) {
    errors.push("occupiedTons cannot exceed capacityTons");
  }

  return errors;
}

function mapZone(row) {
  return {
    id: row.id,
    warehouseId: row.warehouse_id,
    zoneCode: row.zone_code,
    state: row.state,
    capacityTons: row.capacity_tons,
    occupiedTons: row.occupied_tons,
    utilizationPercent: row.utilization_percent,
    updatedAt: row.updated_at
  };
}

router.get("/", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { warehouseId, state } = req.query;

    let query = supabase.from("storage_zones").select("*");
    if (warehouseId) query = query.eq("warehouse_id", String(warehouseId));
    if (state) query = query.eq("state", String(state).toLowerCase());

    const { data, error } = await query.order("updated_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const mapped = (data || []).map(mapZone);
    return res.status(200).json({ count: mapped.length, data: mapped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("storage_zones")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Storage zone not found" });

    return res.status(200).json({ data: mapZone(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const supabase = getSupabase();
    const errors = validateStorage(req.body, false);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const capacityTons = numberOrNaN(req.body.capacityTons, 0);
    const occupiedTons = numberOrNaN(req.body.occupiedTons, 0);

    const payload = {
      id: randomUUID(),
      warehouse_id: String(req.body.warehouseId),
      zone_code: String(req.body.zoneCode).trim().toUpperCase(),
      state: req.body.state ? String(req.body.state).toLowerCase() : "safe",
      capacity_tons: capacityTons,
      occupied_tons: occupiedTons,
      utilization_percent: capacityTons > 0 ? Math.round((occupiedTons / capacityTons) * 100) : 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("storage_zones")
      .insert(payload)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data: mapZone(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();

    const errors = validateStorage(req.body, true);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const currentRes = await supabase
      .from("storage_zones")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (currentRes.error) return res.status(500).json({ error: currentRes.error.message });
    if (!currentRes.data) return res.status(404).json({ error: "Storage zone not found" });

    const current = currentRes.data;
    const capacityTons =
      req.body.capacityTons !== undefined
        ? numberOrNaN(req.body.capacityTons, current.capacity_tons)
        : current.capacity_tons;
    const occupiedTons =
      req.body.occupiedTons !== undefined
        ? numberOrNaN(req.body.occupiedTons, current.occupied_tons)
        : current.occupied_tons;

    const patch = {
      ...(req.body.warehouseId !== undefined ? { warehouse_id: String(req.body.warehouseId) } : {}),
      ...(req.body.zoneCode !== undefined
        ? { zone_code: String(req.body.zoneCode).trim().toUpperCase() }
        : {}),
      ...(req.body.state !== undefined ? { state: String(req.body.state).toLowerCase() } : {}),
      capacity_tons: capacityTons,
      occupied_tons: occupiedTons,
      utilization_percent: capacityTons > 0 ? Math.round((occupiedTons / capacityTons) * 100) : 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("storage_zones")
      .update(patch)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data: mapZone(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("storage_zones")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Storage zone not found" });

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
