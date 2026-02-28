const express = require("express");
const router = express.Router();
const { getSupabase } = require("../lib/supabase");

// Send a new message
router.post("/", async (req, res) => {
    const supabase = getSupabase();
    const { warehouseId, subject, message, priority, alsoEmail, attachmentName, farmerId } = req.body;

    // Use the demo user ID from the auth middleware (assigned to req.user.id)
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from("contact_messages")
            .insert([
                {
                    user_id: userId, // The person sending it
                    farmer_id: farmerId || "demo-farmer",
                    warehouse_id: warehouseId,
                    subject,
                    message,
                    priority,
                    also_email: alsoEmail,
                    attachment_name: attachmentName,
                    status: "Pending"
                }
            ])
            .select();

        if (error) throw error;
        res.status(201).json({ ok: true, data: data[0] });
    } catch (err) {
        // If table doesn't exist, we'll return a 201 anyway for the hackathon but log it
        console.error("[messageRoutes] Error sending message:", err.message);
        if (err.message.includes("relation \"public.contact_messages\" does not exist")) {
            return res.status(201).json({ ok: true, mock: true, message: "Table missing, but simulation says OK" });
        }
        res.status(500).json({ error: "Failed to send message", details: err.message });
    }
});

// List messages
router.get("/", async (req, res) => {
    const supabase = getSupabase();
    const userId = req.user.id;

    try {
        const { data, error } = await supabase
            .from("contact_messages")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.status(200).json({ ok: true, data });
    } catch (err) {
        console.error("[messageRoutes] Error listing messages:", err.message);
        if (err.message.includes("relation \"public.contact_messages\" does not exist")) {
            return res.status(200).json({ ok: true, data: [] });
        }
        res.status(500).json({ error: "Failed to list messages", details: err.message });
    }
});

module.exports = router;
