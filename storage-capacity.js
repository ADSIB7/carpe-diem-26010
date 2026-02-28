(() => {
  let weeklyUtilization = [62, 70, 78, 85, 82, 88, 80];
  let weeklyLine = [56, 60, 68, 72, 70, 75, 80];

  let topProducts = [
    { name: "Potatoes", tons: 85 },
    { name: "Rice", tons: 70 },
    { name: "Tomatoes", tons: 65 },
    { name: "Corn", tons: 60 },
    { name: "Wheat", tons: 50 }
  ];

  let zoneData = [];

  const els = {
    weeklyChart: document.getElementById("weeklyChart"),
    productBars: document.getElementById("productBars"),
    zoneCapacityGrid: document.getElementById("zoneCapacityGrid"),
    utilizationGauge: document.querySelector(".utilization-gauge-val"),
    availableCapacity: document.querySelector(".available-capacity-val"),
    daysUntilFull: document.querySelector(".days-until-full-val"),
    optimizationOpportunities: document.querySelector(".optimization-val")
  };

  async function fetchStorageData() {
    try {
      if (!window.AgriApi) return;

      const res = await window.AgriApi.getStorageCapacity();
      if (!res || !res.data) return;

      const d = res.data;
      weeklyUtilization = d.weeklyUtilization || weeklyUtilization;
      weeklyLine = d.weeklyLine || weeklyLine;
      topProducts = d.topProducts || topProducts;
      zoneData = d.zoneData || [];

      // Update Top Metrics
      if (d.summary) {
        if (els.utilizationGauge) els.utilizationGauge.textContent = `${d.summary.utilizationPercent}% Full`;
        updateGauge(d.summary.utilizationPercent);

        if (els.availableCapacity) els.availableCapacity.textContent = `${d.summary.availableCapacityTons} tons`;

        if (els.daysUntilFull) {
          els.daysUntilFull.textContent = d.summary.daysUntilFull !== null ? `${d.summary.daysUntilFull} days` : "Safe";
        }

        if (els.optimizationOpportunities) els.optimizationOpportunities.textContent = `${d.summary.optimizationOpportunities} new suggestions`;

        const avgUtilEl = document.querySelectorAll(".stats-row strong")[0];
        if (avgUtilEl) avgUtilEl.textContent = `${d.summary.avgUtilization}%`;

        const maxUtilEl = document.querySelectorAll(".stats-row strong")[1];
        if (maxUtilEl) maxUtilEl.textContent = `${d.summary.maxUtilization}%`;

        const totalPalletsEl = document.querySelectorAll(".stats-row strong")[2];
        if (totalPalletsEl) totalPalletsEl.textContent = d.summary.estimatedPalletsStored.toLocaleString();
      }

      renderWeeklyChart();
      renderProducts();
      renderZoneWise();
      renderRoadmap();
    } catch (err) {
      console.error("Failed to fetch storage capacity data:", err);
    }
  }

  function updateGauge(percent) {
    const gaugeValue = document.querySelector(".gauge-value");
    const needle = document.querySelector(".needle");
    if (!gaugeValue || !needle) return;

    // SVG arc for 180 degrees
    const radius = 90;
    const circumference = Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    gaugeValue.style.strokeDasharray = `${circumference} ${circumference}`;
    gaugeValue.style.strokeDashoffset = offset;

    const angle = (percent / 100) * 180 - 90;
    needle.style.transform = `rotate(${angle}deg)`;
  }

  function renderWeeklyChart() {
    if (!els.weeklyChart) return;
    const max = 100;
    els.weeklyChart.innerHTML = "";

    weeklyUtilization.forEach((v) => {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = `${(v / max) * 100}%`;
      els.weeklyChart.appendChild(bar);
    });

    const w = els.weeklyChart.clientWidth || 300;
    const h = els.weeklyChart.clientHeight || 150;
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
    if (!els.productBars) return;
    const max = Math.max(...topProducts.map((p) => p.tons), 1);
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

  function renderRoadmap() {
    const roadmapGrid = document.querySelector(".roadmap-card .zone-grid");
    if (!roadmapGrid) return;

    roadmapGrid.innerHTML = "";
    zoneData.slice(0, 3).forEach(zone => {
      const div = document.createElement("div");
      div.className = `zone ${zoneClass(zone.utilization)}`;
      div.innerHTML = `
        <h4>${zone.zone}</h4>
        <p>${zone.utilization}% Full</p>
        <p>${zone.capacity} tons capacity</p>
        <p>${zone.free} tons free</p>
      `;
      roadmapGrid.appendChild(div);
    });
  }

  function bindEvents() {
    window.addEventListener("resize", () => {
      renderWeeklyChart();
    });
  }

  async function init() {
    bindEvents();
    // Show mock data first
    renderWeeklyChart();
    renderProducts();
    renderZoneWise();

    // Then load real data
    await fetchStorageData();
  }

  init();
})();
