const express = require("express");
const { randomUUID } = require("crypto");
const supabaseLib = require("../lib/supabase");

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

function pick(arr, index) {
  return arr[index % arr.length];
}

router.get("/", async (req, res) => {
  try {
    const supabase = supabaseLib.getSupabase();
    const ownerId = req.user.id;
    const { warehouseId, zoneCode, risk } = req.query;

    let query = supabase.from("batches").select("*").eq("owner_user_id", ownerId);
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
    const supabase = supabaseLib.getSupabase();
    const ownerId = req.user.id;
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("owner_user_id", ownerId)
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Batch not found" });

    return res.status(200).json({ data: mapBatch(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/request", async (req, res) => {
  try {
    const supabase = supabaseLib.getSupabase();
    // In our simplified demo, we use user_id from localStorage/client, 
    // but the backend middleware ensures req.user is populated.
    const farmerUserId = req.user.id;

    const { warehouseId, productName, quantityTons, expiryDate, farmerName } = req.body;

    if (!warehouseId || !productName || !quantityTons || !expiryDate || !farmerName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Find the warehouse owner
    const { data: warehouse, error: wError } = await supabase
      .from("warehouses")
      .select("owner_user_id")
      .eq("id", warehouseId)
      .single();

    if (wError || !warehouse) return res.status(404).json({ error: "Warehouse not found" });

    // Find an available zone for this warehouse (simplified: pick first)
    const { data: zones, error: zError } = await supabase
      .from("storage_zones")
      .select("zone_code")
      .eq("warehouse_id", warehouseId)
      .limit(1);

    const zoneCode = (zones && zones.length > 0) ? zones[0].zone_code : "A1";

    const payload = {
      id: randomUUID(),
      owner_user_id: warehouse.owner_user_id, // Owned by warehouse owner
      farmer_user_id: farmerUserId,           // Requested by farmer
      warehouse_id: warehouseId,
      product_name: productName,
      farmer_name: farmerName,
      quantity_tons: Number(quantityTons),
      zone_code: zoneCode,
      status: "pending",
      entry_date: new Date().toISOString(),
      expiry_date: new Date(expiryDate).toISOString(),
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

router.post("/seed", async (req, res) => {
  try {
    const supabase = supabaseLib.getSupabase();
    const ownerId = req.user.id;
    const countInput = Number(req.body && req.body.count);
    const count = Number.isFinite(countInput) ? Math.min(50, Math.max(1, Math.floor(countInput))) : 10;

    const [warehouseRes, zonesRes] = await Promise.all([
      supabase.from("warehouses").select("id").eq("owner_user_id", ownerId).order("created_at", { ascending: true }).limit(1).maybeSingle(),
      supabase.from("storage_zones").select("zone_code").eq("owner_user_id", ownerId).order("zone_code", { ascending: true })
    ]);
    if (warehouseRes.error) return res.status(500).json({ error: warehouseRes.error.message });
    if (zonesRes.error) return res.status(500).json({ error: zonesRes.error.message });
    if (!warehouseRes.data) return res.status(400).json({ error: "Create a warehouse before seeding batches." });

    const warehouseId = warehouseRes.data.id;
    const zoneCodes = (zonesRes.data || []).map((z) => String(z.zone_code || "").toUpperCase()).filter(Boolean);
    const fallbackZones = ["A1", "A2", "B1", "B2", "D1", "C1", "C2", "C3", "D2", "D4"];
    const availableZones = zoneCodes.length ? zoneCodes : fallbackZones;

    const products = ["Potatoes", "Rice", "Tomatoes", "Onions", "Wheat", "Maize", "Cabbage", "Apples", "Grapes", "Carrots"];
    const farmers = ["Ravi Singh", "Aman Verma", "Neha Patel", "Suresh Rao", "Anita Das", "Vikram Joshi", "Pooja Shah", "Manoj Yadav"];
    const statuses = ["active", "active", "active", "in_transit", "active", "outgoing"];
    const now = Date.now();

    const rows = [];
    let addedStock = 0;
    for (let i = 0; i < count; i += 1) {
      const quantity = Number((0.8 + (i % 5) * 0.35 + Math.random() * 0.4).toFixed(1));
      const entryOffsetDays = 1 + (i % 12);
      const expiryOffsetDays = 3 + (i % 20);
      rows.push({
        id: randomUUID(),
        owner_user_id: ownerId,
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
      addedStock += quantity;
    }

    const insertRes = await supabase.from("batches").insert(rows).select("*");
    if (insertRes.error) return res.status(400).json({ error: insertRes.error.message });

    return res.status(201).json({
      message: `Seeded ${rows.length} batches`,
      count: rows.length,
      data: (insertRes.data || []).map(mapBatch)
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const supabase = supabaseLib.getSupabase();
    const ownerId = req.user.id;
    const errors = validateBatch(req.body, false);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const warehouseRef = await supabase
      .from("warehouses")
      .select("id")
      .eq("id", String(req.body.warehouseId))
      .eq("owner_user_id", ownerId)
      .maybeSingle();
    if (warehouseRef.error) return res.status(500).json({ error: warehouseRef.error.message });
    if (!warehouseRef.data) {
      return res.status(400).json({ error: "warehouseId is invalid for current user" });
    }

    const payload = {
      id: randomUUID(),
      owner_user_id: ownerId,
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
    const supabase = supabaseLib.getSupabase();
    const ownerId = req.user.id;
    const errors = validateBatch(req.body, true);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    if (req.body.warehouseId !== undefined) {
      const warehouseRef = await supabase
        .from("warehouses")
        .select("id")
        .eq("id", String(req.body.warehouseId))
        .eq("owner_user_id", ownerId)
        .maybeSingle();
      if (warehouseRef.error) return res.status(500).json({ error: warehouseRef.error.message });
      if (!warehouseRef.data) {
        return res.status(400).json({ error: "warehouseId is invalid for current user" });
      }
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
      .eq("owner_user_id", ownerId)
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
    const supabase = supabaseLib.getSupabase();
    const ownerId = req.user.id;
    const { data, error } = await supabase
      .from("batches")
      .delete()
      .eq("owner_user_id", ownerId)
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
