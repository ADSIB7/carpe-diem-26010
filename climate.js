// Climate Monitoring Module for AgriShield Smart Warehouse
// Simulates live sensor feeds, chart refresh, alerts, prediction, and CSV export.
(function () {
  const query = new URLSearchParams(window.location.search);
  const isBackgroundMode = query.get("background") === "1";

  function hasValidWarehouseSession() {
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

  const thresholds = {
    temperature: { warn: 6.5, critical: 8.2 },
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
    profileMenu.classList.remove("open");
    profileToggle.setAttribute("aria-expanded", "false");
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
    const ctx = document.getElementById(canvasId).getContext("2d");
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
  predictionChart.data.datasets[0].backgroundColor = "rgba(134, 216, 104, 0.12)";

  function statusFrom(value, metricName) {
    const rule = thresholds[metricName];
    if (metricName === "airflow") {
      if (value <= rule.critical) return "critical";
      if (value <= rule.warn) return "warn";
      return "safe";
    }
    if (value >= rule.critical) return "critical";
    if (value >= rule.warn) return "warn";
    return "safe";
  }

  function applyStatus(el, state) {
    el.className = "status " + state;
    el.textContent = state === "critical" ? "Critical" : state === "warn" ? "Warning" : "Safe";
  }

  function addHistory(title, details, state) {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = "<b>" + title + " (" + (state === "critical" ? "Critical" : "Warning") + ")</b><span>" + details + "</span>";
    alertHistory.prepend(item);
  }

  function beep() {
    if (!soundToggle.checked) return;
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
    // Simulated AI risk: weighted on humidity and temperature excursions.
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

  function updateCharts() {
    tempChart.data.labels = labels;
    humidityChart.data.labels = labels;
    co2Chart.data.labels = labels;

    tempChart.data.datasets[0].data = tempData;
    humidityChart.data.datasets[0].data = humidityData;
    co2Chart.data.datasets[0].data = co2Data;

    tempChart.update();
    humidityChart.update();
    co2Chart.update();

    predictionChart.data.labels = predictionLabels;
    predictionChart.data.datasets[0].data = predictionRiskData;
    predictionChart.update();
  }

  function setSyncStamp() {
    const now = new Date();
    lastSync.textContent = "Last sync: " + now.toLocaleString();
  }

  function renderZones(baseTemp, baseHumidity) {
    let safe = 0;
    let warn = 0;
    let critical = 0;
    let totalTemp = 0;
    let totalHumidity = 0;
    const warnings = [];
    const zoneCards = [];
    const zoneStates = [];
    let insightText = "Climate distribution is stable. Keep current cooling profile.";

    for (let i = 0; i < zoneIds.length; i += 1) {
      const temp = Number((baseTemp + (Math.random() * 2.2 - 1.1)).toFixed(1));
      const humidity = Math.round(baseHumidity + (Math.random() * 14 - 7));
      const tState = statusFrom(temp, "temperature");
      const hState = statusFrom(humidity, "humidity");
      const state = tState === "critical" || hState === "critical" ? "critical" : (tState === "warn" || hState === "warn" ? "warn" : "safe");

      if (state === "critical") critical += 1;
      else if (state === "warn") warn += 1;
      else safe += 1;

      if (state !== "safe") {
        warnings.push(zoneIds[i] + ": Temp " + temp.toFixed(1) + " C, Hum " + humidity + "%");
      }

      totalTemp += temp;
      totalHumidity += humidity;
      zoneStates.push({ id: zoneIds[i], state: state, temp: Number(temp.toFixed(1)), humidity: humidity });

      zoneCards.push(
        '<div class="zone-item ' + state + '">' +
          '<div class="zone-top">' +
            '<span class="zone-id">' + zoneIds[i] + '</span>' +
            '<span class="zone-tag ' + state + '">' + (state === "safe" ? "SAFE" : state === "warn" ? "WARN" : "CRITICAL") + "</span>" +
          "</div>" +
          '<div class="zone-meta">Temp: ' + temp.toFixed(1) + " C</div>" +
          '<div class="zone-meta">Hum: ' + humidity + "%</div>" +
        "</div>"
      );
    }

    zonesGrid.innerHTML = zoneCards.join("");
    safeCount.textContent = safe + " Zones Safe";
    warnCount.textContent = warn + " Zones Warning";
    criticalCount.textContent = critical + " Zone" + (critical === 1 ? "" : "s") + " Critical";
    zoneAverage.textContent =
      "Avg " + (totalTemp / zoneIds.length).toFixed(1) + " C / " + Math.round(totalHumidity / zoneIds.length) + "%";

    if (critical > 0) {
      insightText = "Immediate action required: isolate critical zone(s) and increase airflow.";
    } else if (warn > 2) {
      insightText = "Humidity trend rising across multiple zones. Start preventive ventilation.";
    }
    zoneInsight.textContent = insightText;

    zoneWarnings.innerHTML = warnings.length
      ? warnings.slice(0, 4).map(function (w) { return '<div class="warning-item">' + w + "</div>"; }).join("")
      : '<div class="warning-item muted">No warning in last cycle.</div>';

    return {
      safe: safe,
      warn: warn,
      critical: critical,
      averageTemp: Number((totalTemp / zoneIds.length).toFixed(1)),
      averageHumidity: Math.round(totalHumidity / zoneIds.length),
      zoneStates: zoneStates,
      warnings: warnings.slice(0, 4),
      insight: insightText
    };
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function evolveValue(prev, cfg, wave) {
    const noise = (Math.random() * 2 - 1) * cfg.noise;
    const drift = (cfg.center - prev) * cfg.revert;
    return clamp(prev + wave + drift + noise, cfg.min, cfg.max);
  }

  function generateDataPoint() {
    tick += 1;

    const tempWave = Math.sin(tick / 6) * 0.12;
    const humidityWave = Math.sin(tick / 7 + 1.2) * 0.7;
    const co2Wave = Math.sin(tick / 8 + 0.4) * 12;
    const moistureWave = Math.sin(tick / 9 + 0.8) * 0.08;
    const airflowWave = Math.sin(tick / 5 + 2.3) * 0.8;

    sensorState.temperature = evolveValue(sensorState.temperature, { min: 3.8, max: 7.2, center: 4.8, noise: 0.18, revert: 0.22 }, tempWave);
    sensorState.humidity = evolveValue(sensorState.humidity, { min: 66, max: 86, center: 75, noise: 1.2, revert: 0.2 }, humidityWave);
    sensorState.co2 = evolveValue(sensorState.co2, { min: 820, max: 1500, center: 1020, noise: 20, revert: 0.18 }, co2Wave);
    sensorState.moisture = evolveValue(sensorState.moisture, { min: 10.8, max: 15.7, center: 12.7, noise: 0.2, revert: 0.16 }, moistureWave);
    sensorState.airflow = evolveValue(sensorState.airflow, { min: 34, max: 74, center: 58, noise: 1.6, revert: 0.22 }, airflowWave);

    const temp = Number(sensorState.temperature.toFixed(1));
    const humidity = Math.round(sensorState.humidity);
    const co2 = Math.round(sensorState.co2);
    const moisture = Number(sensorState.moisture.toFixed(1));
    const airflow = Math.round(sensorState.airflow);

    const tState = statusFrom(temp, "temperature");
    const hState = statusFrom(humidity, "humidity");
    const cState = statusFrom(co2, "co2");
    const mState = statusFrom(moisture, "moisture");
    const aState = statusFrom(airflow, "airflow");

    temperatureValue.textContent = temp.toFixed(1) + " C";
    humidityValue.textContent = humidity + " %";
    co2Value.textContent = co2 + " ppm";
    moistureValue.textContent = moisture.toFixed(1) + " %";
    airflowValue.textContent = airflow + " %";

    applyStatus(temperatureStatus, tState);
    applyStatus(humidityStatus, hState);
    applyStatus(co2Status, cState);
    applyStatus(moistureStatus, mState);
    applyStatus(airflowStatus, aState);

    const timeTag = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    labels.push(timeTag);
    tempData.push(temp);
    humidityData.push(humidity);
    co2Data.push(co2);
    predictionLabels.push(timeTag);
    predictionRiskData.push(Math.min(100, Math.max(5, Math.round((temp - 4.3) * 15 + (humidity - 70) * 1.8))));

    if (labels.length > 24) {
      labels.shift();
      tempData.shift();
      humidityData.shift();
      co2Data.shift();
    }
    if (predictionLabels.length > 24) {
      predictionLabels.shift();
      predictionRiskData.shift();
    }

    const tempTrend = tempData.length > 6 ? tempData[tempData.length - 1] - tempData[tempData.length - 6] : 0;
    const humTrend = humidityData.length > 6 ? humidityData[humidityData.length - 1] - humidityData[humidityData.length - 6] : 0;
    predTemp.textContent = tempTrend > 0.35 ? "Temperature likely to rise in coming cycles." : "Temperature trend stable in safe band.";
    predHum.textContent = humTrend > 1.5 ? "Humidity expected to remain elevated." : "Humidity likely to stay controlled.";
    predAction.textContent =
      tempTrend > 0.35 || humTrend > 1.5
        ? "Action: Increase ventilation and reduce chamber loading."
        : "Action: Maintain current cooling profile.";
    const zones = renderZones(temp, humidity);
    updateCharts();
    updateRisk(temp, humidity);
    setSyncStamp();

    const tripped = [];
    if (tState !== "safe") tripped.push("Temperature");
    if (hState !== "safe") tripped.push("Humidity");
    if (cState !== "safe") tripped.push("CO2");
    if (mState !== "safe") tripped.push("Grain Moisture");
    if (aState !== "safe") tripped.push("Airflow");

    if (tripped.length > 0) {
      activeAlert = {
        title: "Threshold Breach",
        detail: tripped.join(", ") + " out of safe band at " + timeTag
      };
      alertBanner.textContent = "ALERT: " + activeAlert.detail;
      beep();
      const worstState =
        tState === "critical" || hState === "critical" || cState === "critical" || mState === "critical" || aState === "critical"
          ? "critical"
          : "warn";
      addHistory(activeAlert.title, activeAlert.detail, worstState);
    } else if (!activeAlert) {
      alertBanner.textContent = "No active critical alerts.";
    }

    const totalZones = Math.max(1, zones.safe + zones.warn + zones.critical);
    const utilizationRatio = (zones.warn * 0.7 + zones.critical * 0.95 + zones.safe * 0.45) / totalZones;
    const availableSpace = Math.max(0, Math.round(10000 * (1 - utilizationRatio)));
    const snapshot = {
      timestamp: Date.now(),
      sensors: {
        temperature: temp,
        humidity: humidity,
        co2: co2,
        moisture: moisture,
        airflow: airflow
      },
      states: {
        temperature: tState,
        humidity: hState,
        co2: cState,
        moisture: mState,
        airflow: aState
      },
      series: {
        labels: labels.slice(-12),
        temperature: tempData.slice(-12),
        humidity: humidityData.slice(-12)
      },
      zones: zones,
      summary: {
        safePercent: Math.round((zones.safe / totalZones) * 100),
        warnPercent: Math.round((zones.warn / totalZones) * 100),
        criticalPercent: Math.round((zones.critical / totalZones) * 100),
        availableSpace: availableSpace
      },
      prediction: {
        temp: predTemp.textContent,
        humidity: predHum.textContent,
        action: predAction.textContent
      },
      alerts: {
        active: Boolean(activeAlert),
        text: alertBanner.textContent
      }
    };
    localStorage.setItem("climateLiveSnapshot", JSON.stringify(snapshot));
    if (window.WarehouseDB) {
      window.WarehouseDB.set("climateSnapshot", snapshot);
    }
  }

  resolveBtn.addEventListener("click", function () {
    activeAlert = null;
    alertBanner.textContent = "No active critical alerts.";
  });

  refreshBtn.addEventListener("click", function () {
    generateDataPoint();
  });

  exportBtn.addEventListener("click", function () {
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

  if (applySuggestionBtn) {
    applySuggestionBtn.addEventListener("click", function () {
      alertBanner.textContent = "Suggestion applied: ventilation cycle increased by 10%.";
    });
  }

  if (isBackgroundMode && soundToggle) {
    soundToggle.checked = false;
  }

  for (let i = 0; i < 12; i += 1) {
    generateDataPoint();
  }

  setInterval(generateDataPoint, 10000);
})();
