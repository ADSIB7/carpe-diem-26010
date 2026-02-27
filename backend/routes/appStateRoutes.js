const express = require("express");
const supabaseLib = require("../lib/supabase");

const router = express.Router();

function validateUserId(userId) {
  return /^[0-9a-fA-F-]{36}$/.test(String(userId || ""));
}

function normalizeState(payload) {
  return {
    climate_snapshot: payload.climateSnapshot || null,
    batch_tracking: payload.batchTracking || null,
    settings: payload.settings || null,
    updated_at: new Date().toISOString()
  };
}

function mapState(row) {
  return {
    userId: row.user_id,
    climateSnapshot: row.climate_snapshot,
    batchTracking: row.batch_tracking,
    settings: row.settings,
    updatedAt: row.updated_at
  };
}

router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!validateUserId(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }
    if (!req.user || req.user.id !== userId) {
      return res.status(403).json({ error: "Forbidden", message: "User can only access own app state" });
    }

    const supabase = supabaseLib.getSupabase();
    const { data, error } = await supabase
      .from("warehouse_app_state")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "App state not found" });

    return res.status(200).json({ data: mapState(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!validateUserId(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }
    if (!req.user || req.user.id !== userId) {
      return res.status(403).json({ error: "Forbidden", message: "User can only update own app state" });
    }

    const supabase = supabaseLib.getSupabase();
    const payload = {
      user_id: userId,
      ...normalizeState(req.body || {})
    };

    const { data, error } = await supabase
      .from("warehouse_app_state")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ data: mapState(data) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
