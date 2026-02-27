const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const warehouseRoutes = require("./routes/warehouseRoutes");
const storageRoutes = require("./routes/storageRoutes");
const batchRoutes = require("./routes/batchRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "agrishield-backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/warehouses", warehouseRoutes);
app.use("/api/storage", storageRoutes);
app.use("/api/batches", batchRoutes);

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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
