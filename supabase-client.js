(function () {
  var DEFAULT_URL = "https://YOUR_PROJECT_ID.supabase.co";
  var DEFAULT_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

  var runtimeUrl = window.SUPABASE_URL || DEFAULT_URL;
  var runtimeAnonKey = window.SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;

  function isConfigured() {
    return (
      runtimeUrl &&
      runtimeAnonKey &&
      runtimeUrl.indexOf("YOUR_PROJECT_ID") === -1 &&
      runtimeAnonKey.indexOf("YOUR_SUPABASE_ANON_KEY") === -1
    );
  }

  function getClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase SDK is not loaded.");
    }
    if (!isConfigured()) {
      throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
    }
    return window.supabase.createClient(runtimeUrl, runtimeAnonKey);
  }

  async function upsertWarehouseProfile(client, profile) {
    return client.from("warehouse_profiles").upsert(profile, { onConflict: "user_id" });
  }

  async function getWarehouseProfileByUserId(client, userId) {
    return client
      .from("warehouse_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
  }

  window.AgriSupabase = {
    getClient: getClient,
    isConfigured: isConfigured,
    upsertWarehouseProfile: upsertWarehouseProfile,
    getWarehouseProfileByUserId: getWarehouseProfileByUserId
  };
})();

