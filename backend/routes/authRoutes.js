const express = require("express");
const supabaseLib = require("../lib/supabase");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Merchant Registration
router.post("/merchant/register", async (req, res) => {
    try {
        const { name, email, phone, businessName, businessLocation, password } = req.body;
        const supabase = supabaseLib.getSupabase();

        // In a real app, we'd use supabase.auth.signUp
        // For this demo/hackathon, we'll create a profile linked to a demo user ID or create a new user if possible
        // Here we'll just insert into merchant_profiles. 
        // We assume the user is already "authenticated" as the demo user for simplicity, 
        // or we create a new bucket for them.

        // Use the demo user ID to avoid foreign key constraint errors
        const userId = "00000000-0000-0000-0000-000000000001";

        const { data, error } = await supabase
            .from("merchant_profiles")
            .insert([
                {
                    user_id: userId,
                    name,
                    email,
                    phone,
                    business_name: businessName,
                    business_location: businessLocation
                }
            ]);

        if (error) throw error;

        return res.status(201).json({ message: "Merchant registered successfully", data: { userId, name, email } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Farmer Registration
router.post("/farmer/register", async (req, res) => {
    try {
        const { name, email, phone, farmName, location, primaryCrop, farmerId, password } = req.body;
        const supabase = supabaseLib.getSupabase();

        // Use the demo user ID to avoid foreign key constraint errors
        const userId = "00000000-0000-0000-0000-000000000001";

        const { data, error } = await supabase
            .from("farmer_profiles")
            .insert([
                {
                    user_id: userId,
                    name,
                    email,
                    phone,
                    farm_name: farmName,
                    location,
                    primary_crop: primaryCrop,
                    farmer_id: farmerId
                }
            ]);

        if (error) throw error;

        return res.status(201).json({ message: "Farmer registered successfully", data: { userId, name, email, farmerId } });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Merchant Login
router.post("/merchant/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const supabase = supabaseLib.getSupabase();

        const { data, error } = await supabase
            .from("merchant_profiles")
            .select("*")
            .eq("email", email)
            .single();

        if (error || !data) return res.status(401).json({ error: "Invalid email or password" });

        // In a real app, check password. For demo, we just return the data.
        return res.status(200).json({ message: "Login successful", data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Farmer Login
router.post("/farmer/login", async (req, res) => {
    try {
        const { farmerId, password } = req.body;
        const supabase = supabaseLib.getSupabase();

        const { data, error } = await supabase
            .from("farmer_profiles")
            .select("*")
            .eq("farmer_id", farmerId)
            .single();

        if (error || !data) return res.status(401).json({ error: "Invalid Farmer ID or password" });

        // In a real app, check password.
        return res.status(200).json({ message: "Login successful", data });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
