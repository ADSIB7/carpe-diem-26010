const { createClient } = require("@supabase/supabase-js");
const { getConfig } = require("../config/env");

let cachedClient = null;

function getSupabase() {
  if (cachedClient) return cachedClient;

  const config = getConfig();
  const url = config.supabaseUrl;
  const serviceRoleKey = config.supabaseServiceRoleKey;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase backend env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend env files."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return cachedClient;
}

module.exports = { getSupabase };
