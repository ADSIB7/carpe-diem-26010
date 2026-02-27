const { loadEnv, getConfig } = require("./config/env");
const { createApp } = require("./app");

loadEnv();
const config = getConfig();
const app = createApp();

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
