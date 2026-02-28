const { loadEnv, getConfig } = require("./config/env");
const { createApp } = require("./app");
const { getSupabase } = require("./lib/supabase");
const { initializeDemoUser } = require("./lib/demoInit");
const { startSimulation } = require("./lib/simulation");

loadEnv();
const config = getConfig();
const app = createApp();

(async () => {
  try {
    const supabase = getSupabase();
    await initializeDemoUser(supabase);

    app.listen(config.port, () => {
      console.log(`Backend running on http://localhost:${config.port}`);
      startSimulation();
    });
  } catch (err) {
    console.error("Failed to initialize server:", err);
  }
})();
