// Climate Monitoring Module for AgriShield Smart Warehouse
// Simulates live sensor feeds, chart refresh, alerts, prediction, and CSV export.
(function () {
  const query = new URLSearchParams(window.location.search);
  const isBackgroundMode = query.get("background") === "1";

  function hasValidWarehouseSession() {
    if (isBackgroundMode) return true;

    if (localStorage.getItem("warehouseLoggedIn") !== "true") {
      return false;
    }

    const role = localStorage.getItem("profileRole");
    if (role && role !== "Warehouse Owner") {
      return false;
    }

    const rawUser = localStorage.getItem("warehouseAuthUser");
    const sessionOperatorId = localStorage.getItem("warehouseSessionOperatorId");
    if (!rawUser || !sessionOperatorId) {
      return false;
    }

    try {
      const parsed = JSON.parse(rawUser);
      return Boolean(parsed && parsed.operatorId && parsed.operatorId === sessionOperatorId);
    } catch (error) {
      return false;
    }
  }

  if (!hasValidWarehouseSession()) {
    window.location.href = "warehouse.html";
    return;
  }

  const shell = document.getElementById("shell");
  const menuBtn = document.getElementById("menuBtn");
  const themeBtn = document.getElementById("themeBtn");
  const refreshBtn = document.getElementById("refreshBtn");
  const exportBtn = document.getElementById("exportBtn");
  const soundToggle = document.getElementById("soundToggle");
  const resolveBtn = document.getElementById("resolveBtn");
  const alertBanner = document.getElementById("alertBanner");
  const alertHistory = document.getElementById("alertHistory");
  const lastSync = document.getElementById("lastSync");
  const profileCard = document.getElementById("profileCard");
  const profileToggle = document.getElementById("profileToggle");
  const profileMenu = document.getElementById("profileMenu");
  const sidebarName = document.getElementById("sidebarName");
  const sidebarRole = document.getElementById("sidebarRole");
  const sidebarAvatar = document.getElementById("sidebarAvatar");

  const temperatureValue = document.getElementById("temperatureValue");
  const humidityValue = document.getElementById("humidityValue");
  const co2Value = document.getElementById("co2Value");
  const moistureValue = document.getElementById("moistureValue");
  const airflowValue = document.getElementById("airflowValue");

  const temperatureStatus = document.getElementById("temperatureStatus");
  const humidityStatus = document.getElementById("humidityStatus");
  const co2Status = document.getElementById("co2Status");
  const moistureStatus = document.getElementById("moistureStatus");
  const airflowStatus = document.getElementById("airflowStatus");

  const riskLabel = document.getElementById("riskLabel");
  const riskMeterFill = document.getElementById("riskMeterFill");
  const riskPercent = document.getElementById("riskPercent");
  const riskReason = document.getElementById("riskReason");
  const zonesGrid = document.getElementById("zonesGrid");
  const safeCount = document.getElementById("safeCount");
  const warnCount = document.getElementById("warnCount");
  const criticalCount = document.getElementById("criticalCount");
  const zoneAverage = document.getElementById("zoneAverage");
  const zoneInsight = document.getElementById("zoneInsight");
  const zoneWarnings = document.getElementById("zoneWarnings");
  const predTemp = document.getElementById("predTemp");
  const predHum = document.getElementById("predHum");
  const predAction = document.getElementById("predAction");
  const applySuggestionBtn = document.getElementById("applySuggestionBtn");

  const tempData = [];
  const humidityData = [];
  const co2Data = [];
  const labels = [];
  const predictionLabels = [];
  const predictionRiskData = [];
  let tick = 0;

  let activeAlert = null;
  let sensorState = {
    temperature: 4.6,
    humidity: 74,
    co2: 980,
    moisture: 12.4,
    airflow: 58
  };
  const zoneIds = ["A1", "A2", "B1", "B2", "D1", "C1", "C2", "C3", "D2", "D4"];

  let thresholds = {
    temperature: { warn: 28, critical: 32 },
    humidity: { warn: 80, critical: 87 },
    co2: { warn: 1250, critical: 1600 },
    moisture: { warn: 14.5, critical: 16 },
    airflow: { warn: 45, critical: 30 }
  };

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      shell.classList.toggle("sidebar-open");
    });
  }

  const profile = {
    name: localStorage.getItem("profileName") || "Warehouse Owner",
    role: localStorage.getItem("profileRole") || "Warehouse Owner",
    avatar: localStorage.getItem("profileImage") || "warehouse-owner-profile.png"
  };

  if (sidebarName) sidebarName.textContent = profile.name;
  if (sidebarRole) sidebarRole.textContent = profile.role;
  if (sidebarAvatar) sidebarAvatar.src = profile.avatar;

  function closeProfileMenu() {
    if (profileMenu) profileMenu.classList.remove("open");
    if (profileToggle) profileToggle.setAttribute("aria-expanded", "false");
  }

  if (profileToggle && profileMenu && profileCard) {
    profileToggle.addEventListener("click", function () {
      const isOpen = profileMenu.classList.toggle("open");
      profileToggle.setAttribute("aria-expanded", String(isOpen));
    });

    document.addEventListener("click", function (event) {
      if (!profileCard.contains(event.target) && !profileMenu.contains(event.target)) {
        closeProfileMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeProfileMenu();
      }
    });
  }

  const savedTheme = localStorage.getItem("dashboardTheme") || "light";
  function applyTheme(theme) {
    document.body.classList.toggle("light-mode", theme === "light");
  }
  applyTheme(savedTheme);

  function syncThemeButton() {
    if (!themeBtn) return;
    const isLight = document.body.classList.contains("light-mode");
    themeBtn.textContent = isLight ? "Dark" : "Light";
  }

  syncThemeButton();
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      const isLight = !document.body.classList.contains("light-mode");
      applyTheme(isLight ? "light" : "dark");
      localStorage.setItem("dashboardTheme", isLight ? "light" : "dark");
      syncThemeButton();
    });
  }

  window.addEventListener("storage", function (event) {
    if (event.key !== "dashboardTheme") return;
    applyTheme(event.newValue === "light" ? "light" : "dark");
    syncThemeButton();
  });

  function createChart(canvasId, color) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    const ctx = el.getContext("2d");
    return new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            data: [],
            borderColor: color,
            borderWidth: 2.6,
            pointRadius: 0,
            tension: 0.34,
            fill: true,
            backgroundColor: "rgba(68, 199, 125, 0.08)"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 480,
          easing: "easeOutCubic"
        },
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 6,
              color: "#91b2a1"
            },
            grid: {
              color: "rgba(126, 177, 145, 0.16)"
            }
          },
          y: {
            ticks: { color: "#91b2a1" },
            grid: {
              color: "rgba(126, 177, 145, 0.16)"
            }
          }
        }
      }
    });
  }

  const tempChart = createChart("tempChart", "#45c87d");
  const humidityChart = createChart("humidityChart", "#f0bb53");
  const co2Chart = createChart("co2Chart", "#66a8ff");
  const predictionChart = createChart("predictionChart", "#86d868");
  if (predictionChart) predictionChart.data.datasets[0].backgroundColor = "rgba(134, 216, 104, 0.12)";

  function applyStatus(el, state) {
    if (!el) return;
    el.className = "status " + state;
    el.textContent = state === "critical" ? "Critical" : state === "warn" ? "Warning" : "Safe";
  }

  function addHistory(title, details, state) {
    if (!alertHistory) return;
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = "<b>" + title + " (" + (state === "critical" ? "Critical" : "Warning") + ")</b><span>" + details + "</span>";
    alertHistory.prepend(item);
  }

  function beep() {
    if (!soundToggle || !soundToggle.checked) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 820;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (error) {
      // Ignore audio errors in restricted environments.
    }
  }

  function updateRisk(temp, humidity) {
    if (!riskMeterFill || !riskPercent || !riskLabel || !riskReason) return;
    // Simulated AI risk baseline
    const tempScore = Math.max(0, (temp - 4.5) * 12);
    const humidityScore = Math.max(0, (humidity - 72) * 2.2);
    const score = Math.min(100, Math.round(tempScore + humidityScore));

    riskMeterFill.style.width = score + "%";
    riskPercent.textContent = score + "%";

    if (score >= 70) {
      riskLabel.textContent = "High";
      riskLabel.className = "critical";
      riskReason.textContent = "High spoilage risk. Temperature and humidity are close to critical limits.";
    } else if (score >= 40) {
      riskLabel.textContent = "Medium";
      riskLabel.className = "warn";
      riskReason.textContent = "Moderate risk. Monitor ventilation and humidity correction cycles.";
    } else {
      riskLabel.textContent = "Low";
      riskLabel.className = "safe";
      riskReason.textContent = "Risk is low. Conditions are within safe control bands.";
    }
  }

  function updateCharts(history) {
    if (!history) return;

    const hLabels = history.labels || [];
    const hTemp = history.temperature || [];
    const hHum = history.humidity || [];
    const hCo2 = history.co2 || [];

    if (tempChart) {
      tempChart.data.labels = hLabels;
      tempChart.data.datasets[0].data = hTemp;
      tempChart.update();
    }
    if (humidityChart) {
      humidityChart.data.labels = hLabels;
      humidityChart.data.datasets[0].data = hHum;
      humidityChart.update();
    }
    if (co2Chart) {
      co2Chart.data.labels = hLabels;
      co2Chart.data.datasets[0].data = hCo2;
      co2Chart.update();
    }

    if (predictionChart) {
      predictionChart.data.labels = hLabels;
      // Synthetic prediction data based on temp/hum
      predictionChart.data.datasets[0].data = hTemp.map((t, i) => {
        const h = hHum[i] || 70;
        return Math.min(100, Math.max(5, Math.round((t - 4.3) * 15 + (h - 70) * 1.8)));
      });
      predictionChart.update();
    }
  }

  function setSyncStamp() {
    if (!lastSync) return;
    const now = new Date();
    lastSync.textContent = "Last sync: " + now.toLocaleString();
  }

  function renderZones(zonesData) {
    if (!zonesGrid || !safeCount || !warnCount || !criticalCount || !zoneAverage || !zoneInsight || !zoneWarnings) return;

    const safe = zonesData.safe || 0;
    const warn = zonesData.warn || 0;
    const critical = zonesData.critical || 0;
    const avgTemp = zonesData.averageTemp || 0;
    const avgHum = zonesData.averageHumidity || 0;
    const states = zonesData.zoneStates || [];
    const warnings = zonesData.warnings || [];

    zonesGrid.innerHTML = states.map(z => `
      <div class="zone-item ${z.state}">
        <div class="zone-top">
          <span class="zone-id">${z.id}</span>
          <span class="zone-tag ${z.state}">${z.state.toUpperCase()}</span>
        </div>
        <div class="zone-meta">Temp: ${z.temp.toFixed(1)} C</div>
        <div class="zone-meta">Hum: ${z.humidity}%</div>
      </div>
    `).join("");

    safeCount.textContent = safe + " Zones Safe";
    warnCount.textContent = warn + " Zones Warning";
    criticalCount.textContent = critical + " Zone" + (critical === 1 ? "" : "s") + " Critical";
    zoneAverage.textContent = `Avg ${avgTemp.toFixed(1)} C / ${avgHum}%`;
    zoneInsight.textContent = zonesData.insight || "Climate distribution is stable.";

    zoneWarnings.innerHTML = warnings.length
      ? warnings.map(w => `<div class="warning-item">${w}</div>`).join("")
      : '<div class="warning-item muted">No warning in last cycle.</div>';
  }

  async function fetchInitialConfig() {
    if (!window.AgriApi) return;
    try {
      const res = await window.AgriApi.getClimateConfig();
      if (res && res.data) {
        thresholds = res.data.thresholds || thresholds;
        zoneIds = res.data.zoneIds || zoneIds;
      }
    } catch (err) {
      console.error("Failed to fetch climate config", err);
    }
  }

  async function refreshLiveData() {
    if (!window.AgriApi) return;
    try {
      const res = await window.AgriApi.getClimateLiveData();
      if (!res || !res.data) return;

      const data = res.data;
      const ss = data.sensorState || {};

      if (temperatureValue) temperatureValue.textContent = (ss.temperature || 0).toFixed(1) + " C";
      if (humidityValue) humidityValue.textContent = (ss.humidity || 0) + " %";
      if (co2Value) co2Value.textContent = (ss.co2 || 0) + " ppm";
      if (moistureValue) moistureValue.textContent = (ss.moisture || 0).toFixed(1) + " %";
      if (airflowValue) airflowValue.textContent = (ss.airflow || 0) + " %";

      if (data.states) {
        applyStatus(temperatureStatus, data.states.temperature);
        applyStatus(humidityStatus, data.states.humidity);
        applyStatus(co2Status, data.states.co2);
        applyStatus(moistureStatus, data.states.moisture);
        applyStatus(airflowStatus, data.states.airflow);
      }

      if (data.prediction) {
        if (predTemp) predTemp.textContent = data.prediction.temp;
        if (predHum) predHum.textContent = data.prediction.humidity;
        if (predAction) predAction.textContent = data.prediction.action;
      }

      renderZones(data.zones);
      updateCharts(data.history);
      updateRisk(ss.temperature, ss.humidity);
      setSyncStamp();

      // Mirror state to WarehouseDB if available
      if (window.WarehouseDB) {
        window.WarehouseDB.set("climateSnapshot", {
          timestamp: data.timestamp,
          sensors: ss,
          states: data.states,
          series: {
            labels: data.history?.labels?.slice(-12),
            temperature: data.history?.temperature?.slice(-12),
            humidity: data.history?.humidity?.slice(-12)
          },
          zones: data.zones,
          summary: {
            safePercent: Math.round((data.zones.safe / zoneIds.length) * 100),
            warnPercent: Math.round((data.zones.warn / zoneIds.length) * 100),
            criticalPercent: Math.round((data.zones.critical / zoneIds.length) * 100),
            availableSpace: 0
          }
        });
      }
    } catch (err) {
      console.error("Failed to fetch live climate data", err);
    }
  }

  function initAlerts() {
    if (!window.AgriApi || !window.AgriApi.subscribeToAlerts) return;

    window.AgriApi.subscribeToAlerts((alert) => {
      if (alert.type === "CONNECTED") return;

      activeAlert = {
        title: alert.type === "AI_PREDICTION" ? "AI Prediction" : "Threshold Breach",
        detail: alert.message
      };

      if (alertBanner) alertBanner.textContent = "ALERT: " + activeAlert.detail;
      beep();

      const state = alert.priority === "medium" ? "warn" : "critical";
      addHistory(activeAlert.title, activeAlert.detail, state);

      // Auto refresh data on alert to see latest state
      setTimeout(refreshLiveData, 1000);
    });
  }

  if (resolveBtn) {
    resolveBtn.addEventListener("click", function () {
      activeAlert = null;
      alertBanner.textContent = "No active critical alerts.";
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      refreshLiveData();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", function () {
      // Basic CSV export from charts if they have data
      if (!labels.length) return;
      const rows = ["time,temperature_c,humidity_percent,co2_ppm"];
      for (let i = 0; i < labels.length; i += 1) {
        rows.push([labels[i], tempData[i], humidityData[i], co2Data[i]].join(","));
      }
      const csv = rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "climate_report.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  if (applySuggestionBtn) {
    applySuggestionBtn.addEventListener("click", function () {
      alertBanner.textContent = "Suggestion applied: ventilation cycle increased by 10%.";
    });
  }

  (async function main() {
    await fetchInitialConfig();
    await refreshLiveData();
    initAlerts();

    if (!isBackgroundMode) {
      setInterval(refreshLiveData, 15000);
    }
  })();
})();
