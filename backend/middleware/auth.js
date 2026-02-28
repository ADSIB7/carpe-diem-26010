const supabaseLib = require("../lib/supabase");

function parseBearer(req) {
  const raw = req.headers.authorization || "";
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim();
}

async function requireAuth(req, res, next) {
  if (req.method === "OPTIONS") return next();

  const token = parseBearer(req);
  // Bypass token check entirely for hackathon
  // if (!token) {
  //   return res.status(401).json({ error: "Unauthorized", message: "Missing bearer token" });
  // }

  try {
    req.user = {
      id: "73880fd3-c3f5-48c6-b811-02935820f5b7",
      email: "demo@agrishield.com",
      role: "authenticated"
    };
    return next();

  } catch (err) {
    return res.status(500).json({ error: "Auth verification failed", message: err.message });
  }
}

module.exports = { requireAuth };
