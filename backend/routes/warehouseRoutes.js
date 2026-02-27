const express = require("express");
const { randomUUID } = require("crypto");
const { getSupabase } = require("../lib/supabase");

const router = express.Router();

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateWarehouse(payload, isPatch) {
  const errors = [];
  const required = ["name", "location"];

  if (!isPatch) {
    required.forEach((field) => {
      if (!payload[field]) errors.push(`${field} is required`);
    });
  }

  if (payload.name !== undefined && String(payload.name).trim().length < 2) {
    errors.push("name must be at least 2 characters");
  }

  if (payload.capacityTons !== undefined) {
    const capacity = toNumber(payload.capacityTons);
    if (Number.isNaN(capacity) || capacity < 0) {
      errors.push("capacityTons must be a non-negative number");
    }
  }

  if (payload.currentStockTons !== undefined) {
    const stock = toNumber(payload.currentStockTons);
    if (Number.isNaN(stock) || stock < 0) {
      errors.push("currentStockTons must be a non-negative number");
    }
  }

  return errors;
}

function mapWarehouse(row) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    managerName: row.manager_name,
    capacityTons: row.capacity_tons,
    currentStockTons: row.current_stock_tons,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

router.get("/", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { location, q } = req.query;
    let query = supabase.from("warehouses").select("*");

    if (location) {
      query = query.ilike("location", `%${String(location).trim()}%`);
    }

    if (q) {
      const text = String(q).trim();
      query = query.or(`name.ilike.%${text}%,location.ilike.%${text}%,manager_name.ilike.%${text}%`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const mapped = (data || []).map(mapWarehouse);
    return res.status(200).json({ count: mapped.length, data: mapped });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("warehouses")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Warehouse not found" });

    return res.status(200).json({ data: mapWarehouse(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const supabase = getSupabase();
    const errors = validateWarehouse(req.body, false);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const payload = {
      id: randomUUID(),
      name: String(req.body.name).trim(),
      location: String(req.body.location).trim(),
      manager_name: req.body.managerName ? String(req.body.managerName).trim() : null,
      capacity_tons: toNumber(req.body.capacityTons) ?? 0,
      current_stock_tons: toNumber(req.body.currentStockTons) ?? 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("warehouses")
      .insert(payload)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ data: mapWarehouse(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const errors = validateWarehouse(req.body, false);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const payload = {
      name: String(req.body.name).trim(),
      location: String(req.body.location).trim(),
      manager_name: req.body.managerName ? String(req.body.managerName).trim() : null,
      capacity_tons: toNumber(req.body.capacityTons) ?? 0,
      current_stock_tons: toNumber(req.body.currentStockTons) ?? 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("warehouses")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Warehouse not found" });

    return res.status(200).json({ data: mapWarehouse(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const errors = validateWarehouse(req.body, true);
    if (errors.length) {
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    const patch = {
      ...(req.body.name !== undefined ? { name: String(req.body.name).trim() } : {}),
      ...(req.body.location !== undefined ? { location: String(req.body.location).trim() } : {}),
      ...(req.body.managerName !== undefined
        ? { manager_name: req.body.managerName ? String(req.body.managerName).trim() : null }
        : {}),
      ...(req.body.capacityTons !== undefined
        ? { capacity_tons: toNumber(req.body.capacityTons) }
        : {}),
      ...(req.body.currentStockTons !== undefined
        ? { current_stock_tons: toNumber(req.body.currentStockTons) }
        : {}),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from("warehouses")
      .update(patch)
      .eq("id", req.params.id)
      .select("*")
      .maybeSingle();

    if (error) return res.status(400).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Warehouse not found" });

    return res.status(200).json({ data: mapWarehouse(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("warehouses")
      .delete()
      .eq("id", req.params.id)
      .select("id");

    if (error) return res.status(400).json({ error: error.message });
    if (!data || data.length === 0) return res.status(404).json({ error: "Warehouse not found" });

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
