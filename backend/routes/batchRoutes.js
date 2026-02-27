const express = require("express");
const { randomUUID } = require("crypto");
const { getSupabase } = require("../lib/supabase");

const router = express.Router();

function validateBatch(payload, isPatch) {
  const errors = [];
  const required = ["warehouseId", "productName", "farmerName", "quantityTons", "zoneCode", "expiryDate"];

  if (!isPatch) {
    required.forEach((field) => {
      if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
        errors.push(`${field} is required`);
      }
    });
  }

  if (payload.quantityTons !== undefined) {
    const qty = Number(payload.quantityTons);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push("quantityTons must be a positive number");
    }
  }

  if (payload.expiryDate !== undefined) {
    const expiry = new Date(payload.expiryDate);
    if (Number.isNaN(expiry.getTime())) {
      errors.push("expiryDate must be a valid ISO date");
    }
  }

  return errors;
}

function daysUntil(dateValue) {
  const now = new Date();
  const date = new Date(dateValue);
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function mapBatch(row) {
  const daysToExpiry = daysUntil(row.expiry_date);
  let spoilageRisk = "safe";
  if (daysToExpiry <= 2) spoilageRisk = "critical";
  else if (daysToExpiry <= 7) spoilageRisk = "warning";

  return {
    id: row.id,
    warehouseId: row.warehouse_id,
    productName: row.product_name,
    farmerName: row.farmer_name,
    quantityTons: row.quantity_tons,
    zoneCode: row.zone_code,
    status: row.status,
    entryDate: row.entry_date,
    expiryDate: row.expiry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    daysToExpiry,
    spoilageRisk
  };
}

router.get("/", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { warehouseId, zoneCode, risk } = req.query;

    let query = supabase.from("batches").select("*");
    if (warehouseId) query = query.eq("warehouse_id", String(warehouseId));
    if (zoneCode) query = query.eq("zone_code", String(zoneCode).trim().toUpperCase());

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    let mapped = (data || []).map(mapBatch);
    if (risk) mapped = mapped.filter((b) => b.spoilageRisk === String(risk).toLowerCase());

    return res.status(200).json({ count: mapped.length, data: mapped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Batch not found" });

    return res.status(200).json({ data: mapBatch(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const supabase = getSupabase();
    const errors = validateBatch(req.body, false);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const payload = {
      id: randomUUID(),
      warehouse_id: String(req.body.warehouseId),
      product_name: String(req.body.productName).trim(),
      farmer_name: String(req.body.farmerName).trim(),
      quantity_tons: Number(req.body.quantityTons),
      zone_code: String(req.body.zoneCode).trim().toUpperCase(),
      status: req.body.status ? String(req.body.status).toLowerCase() : "active",
      entry_date: req.body.entryDate
        ? new Date(req.body.entryDate).toISOString()
        : new Date().toISOString(),
      expiry_date: new Date(req.body.expiryDate).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from("batches").insert(payload).select("*").single();
    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({ data: mapBatch(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const errors = validateBatch(req.body, true);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const patch = {
      ...(req.body.warehouseId !== undefined ? { warehouse_id: String(req.body.warehouseId) } : {}),
      ...(req.body.productName !== undefined
        ? { product_name: String(req.body.productName).trim() }
        : {}),
      ...(req.body.farmerName !== undefined
        ? { farmer_name: String(req.body.farmerName).trim() }
        : {}),
      ...(req.body.quantityTons !== undefined
        ? { quantity_tons: Number(req.body.quantityTons) }
        : {}),
      ...(req.body.zoneCode !== undefined
        ? { zone_code: String(req.body.zoneCode).trim().toUpperCase() }
        : {}),
      ...(req.body.status !== undefined ? { status: String(req.body.status).toLowerCase() } : {}),
      ...(req.body.entryDate !== undefined
        ? { entry_date: new Date(req.body.entryDate).toISOString() }
        : {}),
      ...(req.body.expiryDate !== undefined
        ? { expiry_date: new Date(req.body.expiryDate).toISOString() }
        : {}),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("batches")
      .update(patch)
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Batch not found" });

    return res.status(200).json({ data: mapBatch(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("batches")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Batch not found" });

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
