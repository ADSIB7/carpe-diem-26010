(() => {
  const weeklyUtilization = [62, 70, 78, 85, 82, 88, 80];
  const weeklyLine = [56, 60, 68, 72, 70, 75, 80];

  const topProducts = [
    { name: "Potatoes", tons: 85 },
    { name: "Rice", tons: 70 },
    { name: "Tomatoes", tons: 65 },
    { name: "Corn", tons: 60 },
    { name: "Wheat", tons: 50 }
  ];

  const zoneData = [
    { zone: "A1", utilization: 78, capacity: 120, used: 94, free: 26, crops: "Potatoes, Rice", temp: "4.1C", risk: "Low" },
    { zone: "A2", utilization: 86, capacity: 110, used: 95, free: 15, crops: "Onions, Wheat", temp: "5.3C", risk: "Moderate" },
    { zone: "A3", utilization: 94, capacity: 95, used: 89, free: 6, crops: "Tomatoes, Corn", temp: "8.4C", risk: "High" },
    { zone: "B1", utilization: 64, capacity: 130, used: 83, free: 47, crops: "Rice, Pulses", temp: "3.9C", risk: "Low" },
    { zone: "B2", utilization: 89, capacity: 90, used: 80, free: 10, crops: "Leafy Greens", temp: "6.2C", risk: "Moderate" },
    { zone: "C1", utilization: 58, capacity: 100, used: 58, free: 42, crops: "Apples, Grapes", temp: "4.8C", risk: "Low" }
  ];

  const els = {
    weeklyChart: document.getElementById("weeklyChart"),
    productBars: document.getElementById("productBars"),
    zoneCapacityGrid: document.getElementById("zoneCapacityGrid")
  };

  function renderWeeklyChart() {
    const max = 100;
    els.weeklyChart.innerHTML = "";

    weeklyUtilization.forEach((v) => {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = `${(v / max) * 100}%`;
      els.weeklyChart.appendChild(bar);
    });

    const w = els.weeklyChart.clientWidth;
    const h = els.weeklyChart.clientHeight;
    const step = w / (weeklyLine.length - 1);

    const points = weeklyLine.map((value, i) => ({
      x: i * step,
      y: h - (value / max) * h
    }));

    points.forEach((p) => {
      const dot = document.createElement("span");
      dot.className = "line-dot";
      dot.style.left = `${p.x - 4}px`;
      dot.style.top = `${p.y - 4}px`;
      els.weeklyChart.appendChild(dot);
    });

    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx) * (180 / Math.PI);

      const seg = document.createElement("span");
      seg.className = "line-seg";
      seg.style.width = `${len}px`;
      seg.style.left = `${a.x}px`;
      seg.style.top = `${a.y}px`;
      seg.style.transform = `rotate(${ang}deg)`;
      els.weeklyChart.appendChild(seg);
    }
  }

  function renderProducts() {
    const max = Math.max(...topProducts.map((p) => p.tons));
    els.productBars.innerHTML = "";

    topProducts.forEach((p) => {
      const row = document.createElement("div");
      row.className = "product-row";
      row.innerHTML = `
        <div class="head"><strong>${p.name}</strong><span>${p.tons} tons</span></div>
        <div class="track"><div class="fill" style="width:${(p.tons / max) * 100}%"></div></div>
      `;
      els.productBars.appendChild(row);
    });
  }

  function zoneClass(utilization) {
    if (utilization > 90) return "high";
    if (utilization >= 75) return "medium";
    return "low";
  }

  function zoneTags(utilization) {
    const tags = [];
    if (utilization > 95) tags.push({ label: "Critical", cls: "critical" });
    if (utilization > 85 && utilization <= 95) tags.push({ label: "Near Full", cls: "nearfull" });
    if (utilization < 60) tags.push({ label: "Available", cls: "available" });
    return tags;
  }

  function renderZoneWise() {
    if (!els.zoneCapacityGrid) return;

    els.zoneCapacityGrid.innerHTML = "";
    zoneData.forEach((zone) => {
      const cls = zoneClass(zone.utilization);
      const tags = zoneTags(zone.utilization)
        .map((t) => `<span class="zone-tag ${t.cls}">${t.label}</span>`)
        .join("");

      const card = document.createElement("article");
      card.className = `zone-card ${cls}`;
      card.innerHTML = `
        <h4>${zone.zone}</h4>
        <div class="zone-util">${zone.utilization}% Full</div>
        <div class="zone-meta">
          <span>${zone.capacity} tons capacity</span>
          <span>${zone.used} tons used</span>
          <span>${zone.free} tons free</span>
        </div>
        <div class="zone-progress"><div class="zone-fill" style="width:${zone.utilization}%"></div></div>
        <div class="zone-tags">${tags}</div>
        <div class="zone-hover">
          <div><strong>Crops:</strong> ${zone.crops}</div>
          <div><strong>Avg Temp:</strong> ${zone.temp}</div>
          <div><strong>Risk:</strong> ${zone.risk}</div>
        </div>
      `;
      els.zoneCapacityGrid.appendChild(card);
    });
  }

  function bindEvents() {
    window.addEventListener("resize", renderWeeklyChart);
  }

  function init() {
    bindEvents();
    renderWeeklyChart();
    renderProducts();
    renderZoneWise();
  }

  init();
})();
