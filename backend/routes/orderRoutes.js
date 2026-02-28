const express = require("express");
const { randomUUID } = require("crypto");
const supabaseLib = require("../lib/supabase");

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const supabase = supabaseLib.getSupabase();
        const merchantUserId = req.user.id;
        const { batchId, quantityTons, totalPrice, productName } = req.body;

        if (!batchId || !quantityTons || !totalPrice || !productName) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Create the order
        const orderPayload = {
            id: randomUUID(),
            merchant_user_id: merchantUserId,
            batch_id: batchId,
            product_name: productName,
            quantity_tons: Number(quantityTons),
            total_price: Number(totalPrice),
            status: "completed", // In demo, we assume success
            created_at: new Date().toISOString()
        };

        const { data: order, error: oError } = await supabase
            .from("orders")
            .insert(orderPayload)
            .select("*")
            .single();

        if (oError) return res.status(400).json({ error: oError.message });

        // 2. Update the batch status
        const { error: bError } = await supabase
            .from("batches")
            .update({ status: "ordered", updatedAt: new Date().toISOString() })
            .eq("id", batchId);

        if (bError) {
            console.error("Failed to update batch status:", bError);
            // We don't fail the whole request because the order was already recorded
        }

        return res.status(201).json({ message: "Order placed successfully", data: order });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

router.get("/", async (req, res) => {
    try {
        const supabase = supabaseLib.getSupabase();
        const merchantUserId = req.user.id;

        const { data, error } = await supabase
            .from("orders")
            .select("*")
            .eq("merchant_user_id", merchantUserId)
            .order("created_at", { ascending: false });

        if (error) return res.status(500).json({ error: error.message });

        return res.status(200).json({ count: data.length, data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
