(function () {
  function getDbData() {
    const db = window.WarehouseDB ? window.WarehouseDB.load() : {};
    const climate = db.climateSnapshot || null;
    const batchTracking = db.batchTracking || { batches: [], movementTabs: {} };
    return { climate: climate, batchTracking: batchTracking };
  }

  function daysLeft(expiryDate) {
    const d = new Date(expiryDate);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  }

  function statusFrom(days) {
    if (days < 5) return "critical";
    if (days <= 10) return "warning";
    return "fresh";
  }

  function render() {
    const { climate, batchTracking } = getDbData();
    const batches = Array.isArray(batchTracking.batches) ? batchTracking.batches : [];

    const safePct = climate && climate.summary ? Number(climate.summary.safePercent || 0) : 0;
    const compliance = Math.max(0, Math.min(100, safePct));
    document.getElementById("climateCompliance").textContent = compliance + "%";

    const risky = batches.filter(function (b) {
      const left = daysLeft(b.expiryDate);
      return statusFrom(left) !== "fresh";
    }).length;
    document.getElementById("riskBatches").textContent = String(risky);

    const util = climate && climate.summary ? 100 - Number(climate.summary.safePercent || 0) : 0;
    document.getElementById("spaceUtil").textContent = Math.max(0, Math.min(100, util)) + "%";

    const tbody = document.getElementById("batchSummaryRows");
    tbody.innerHTML = "";
    batches.slice(0, 12).forEach(function (b) {
      const left = daysLeft(b.expiryDate);
      const st = statusFrom(left);
      const tr = document.createElement("tr");
      tr.innerHTML = ""
        + "<td>" + b.id + "</td>"
        + "<td>" + b.product + "</td>"
        + "<td>" + b.zone + "</td>"
        + "<td>" + left + " days</td>"
        + "<td><span class='status-badge " + st + "'>" + st.charAt(0).toUpperCase() + st.slice(1) + "</span></td>";
      tbody.appendChild(tr);
    });

    const metrics = document.getElementById("climateMetrics");
    if (climate) {
      metrics.innerHTML = ""
        + "<li>Temperature: " + climate.sensors.temperature + " C</li>"
        + "<li>Humidity: " + climate.sensors.humidity + "%</li>"
        + "<li>CO2: " + climate.sensors.co2 + " ppm</li>"
        + "<li>Risk: " + (climate.alerts.active ? "Active Alert" : "Stable") + "</li>"
        + "<li>Zones Safe/Warning/Critical: " + climate.zones.safe + "/" + climate.zones.warn + "/" + climate.zones.critical + "</li>";
    }

    const movementRows = document.getElementById("movementRows");
    movementRows.innerHTML = "";
    const recent = batchTracking.movementTabs && Array.isArray(batchTracking.movementTabs.recent) ? batchTracking.movementTabs.recent : [];
    recent.forEach(function (m) {
      const tr = document.createElement("tr");
      tr.innerHTML = "<td>" + m.id + "</td><td>" + m.from + "</td><td>" + m.to + "</td><td>" + m.time + "</td><td>" + m.by + "</td>";
      movementRows.appendChild(tr);
    });
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.getElementById("downloadBatchCsv").addEventListener("click", function () {
    const { batchTracking } = getDbData();
    const rows = ["batch_id,product,zone,expiry_date,days_left"];
    (batchTracking.batches || []).forEach(function (b) {
      rows.push([b.id, b.product, b.zone, new Date(b.expiryDate).toISOString().slice(0, 10), daysLeft(b.expiryDate)].join(","));
    });
    downloadFile("batch-report.csv", rows.join("\n"), "text/csv;charset=utf-8;");
  });

  document.getElementById("downloadClimateJson").addEventListener("click", function () {
    const { climate } = getDbData();
    downloadFile("climate-snapshot.json", JSON.stringify(climate || {}, null, 2), "application/json");
  });

  render();
  setInterval(render, 3000);
})();
