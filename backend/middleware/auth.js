const supabaseLib = require("../lib/supabase");

function parseBearer(req) {
  const raw = req.headers.authorization || "";
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim();
}

async function requireAuth(req, res, next) {
  if (req.method === "OPTIONS") return next();

  const token = parseBearer(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized", message: "Missing bearer token" });
  }

  try {
    const supabase = supabaseLib.getSupabase();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid or expired token" });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email || null,
      role: data.user.role || null
    };
    return next();
  } catch (err) {
    return res.status(500).json({ error: "Auth verification failed", message: err.message });
  }
}

module.exports = { requireAuth };
