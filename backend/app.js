const express = require("express");
const cors = require("cors");

function createApp(options) {
  const opts = options || {};
  const requireAuth = opts.requireAuth || require("./middleware/auth").requireAuth;
  const warehouseRoutes = opts.warehouseRoutes || require("./routes/warehouseRoutes");
  const storageRoutes = opts.storageRoutes || require("./routes/storageRoutes");
  const batchRoutes = opts.batchRoutes || require("./routes/batchRoutes");
  const appStateRoutes = opts.appStateRoutes || require("./routes/appStateRoutes");
  const uiDataRoutes = opts.uiDataRoutes || require("./routes/uiDataRoutes");

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "agrishield-backend",
      timestamp: new Date().toISOString()
    });
  });

  if (opts.enableTestLoginRoute) {
    app.post("/test/login", (req, res) => {
      const userId = (req.body && req.body.userId) || "00000000-0000-0000-0000-000000000001";
      return res.status(200).json({
        access_token: `test-token:${userId}`,
        user: { id: userId, email: "test@example.com" }
      });
    });
  }

  app.use("/api", requireAuth);
  app.use("/api/warehouses", warehouseRoutes);
  app.use("/api/storage", storageRoutes);
  app.use("/api/batches", batchRoutes);
  app.use("/api/app-state", appStateRoutes);
  app.use("/api/ui-data", uiDataRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `No route for ${req.method} ${req.originalUrl}`
    });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Unexpected server error"
    });
  });

  return app;
}

module.exports = { createApp };

