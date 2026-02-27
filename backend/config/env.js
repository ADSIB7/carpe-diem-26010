const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

function loadIfExists(filePath) {
  if (!fs.existsSync(filePath)) return;
  dotenv.config({ path: filePath, override: true });
}

function loadEnv() {
  const env = process.env.NODE_ENV || "development";
  const baseDir = path.resolve(__dirname, "..");

  // Lowest -> highest priority.
  loadIfExists(path.join(baseDir, ".env"));
  loadIfExists(path.join(baseDir, `.env.${env}`));
  loadIfExists(path.join(baseDir, ".env.local"));
  loadIfExists(path.join(baseDir, `.env.${env}.local`));
}

function getConfig() {
  const nodeEnv = process.env.NODE_ENV || "development";
  const config = {
    nodeEnv,
    port: Number(process.env.PORT || 5000),
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  };

  if (nodeEnv !== "test") {
    const missing = [];
    if (!config.supabaseUrl) missing.push("SUPABASE_URL");
    if (!config.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (missing.length) {
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
  }

  return config;
}

module.exports = { loadEnv, getConfig };

