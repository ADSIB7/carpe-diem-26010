(function () {
  function defaultPrefs() {
    return { email: false, sms: false, inApp: true, sound: false };
  }

  const saveMsg = document.getElementById("saveMsg");
  const prefEmail = document.getElementById("prefEmail");
  const prefSms = document.getElementById("prefSms");
  const prefInApp = document.getElementById("prefInApp");
  const prefSound = document.getElementById("prefSound");
  const alertsList = document.getElementById("alertsList");

  function getAlerts() {
    const climate = window.WarehouseDB ? window.WarehouseDB.get("climateSnapshot") : null;
    const alerts = [];

    if (climate && climate.states) {
      if (climate.states.temperature !== "safe") alerts.push({ level: climate.states.temperature, title: "Temperature Threshold", desc: "Temperature is outside safe range." });
      if (climate.states.humidity !== "safe") alerts.push({ level: climate.states.humidity, title: "Humidity Threshold", desc: "Humidity is above safe storage range." });
      if (climate.states.co2 !== "safe") alerts.push({ level: climate.states.co2, title: "CO2 Threshold", desc: "CO2 concentration is above recommended band." });
      if (climate.summary && Number(climate.summary.criticalPercent) >= 40) {
        alerts.push({ level: "critical", title: "Critical Zone Density", desc: "40% or more zones are in critical state." });
      }
    }

    if (alerts.length === 0) {
      alerts.push({ level: "warning", title: "No active critical alerts", desc: "System is stable. Keep monitoring regularly." });
    }

    return alerts;
  }

  function renderAlerts() {
    const alerts = getAlerts();
    alertsList.innerHTML = "";

    alerts.forEach(function (a, idx) {
      const item = document.createElement("article");
      item.className = "alert-item " + (a.level === "critical" ? "critical" : "warning");
      item.innerHTML = ""
        + "<div class='alert-head'><strong>" + a.title + "</strong><small>" + (a.level === "critical" ? "Critical" : "Warning") + "</small></div>"
        + "<p>" + a.desc + "</p>"
        + "<div class='alert-actions'>"
        + "<button class='ghost-btn' type='button' data-action='ack' data-idx='" + idx + "'>Acknowledge</button>"
        + "<button class='ghost-btn' type='button' data-action='resolve' data-idx='" + idx + "'>Resolve</button>"
        + "</div>";
      alertsList.appendChild(item);
    });
  }

  function loadPrefs() {
    const settings = window.WarehouseDB ? (window.WarehouseDB.get("settings") || {}) : {};
    const prefs = settings.notifications || defaultPrefs();
    prefEmail.checked = Boolean(prefs.email);
    prefSms.checked = Boolean(prefs.sms);
    prefInApp.checked = Boolean(prefs.inApp);
    prefSound.checked = Boolean(prefs.sound);
  }

  function savePrefs() {
    const prefs = {
      email: prefEmail.checked,
      sms: prefSms.checked,
      inApp: prefInApp.checked,
      sound: prefSound.checked
    };

    if (window.WarehouseDB) {
      const settings = window.WarehouseDB.get("settings") || {};
      window.WarehouseDB.set("settings", Object.assign({}, settings, { notifications: prefs }));
    }

    saveMsg.textContent = "Notification preferences saved at " + new Date().toLocaleTimeString();
  }

  document.getElementById("savePrefsBtn").addEventListener("click", savePrefs);
  document.getElementById("resolveAllBtn").addEventListener("click", function () {
    saveMsg.textContent = "All alerts marked as resolved.";
    alertsList.innerHTML = "<article class='alert-item warning'><strong>No active alerts</strong><p>All current alerts are resolved.</p></article>";
  });

  alertsList.addEventListener("click", function (event) {
    const btn = event.target.closest("button[data-action]");
    if (!btn) return;
    const card = btn.closest(".alert-item");
    if (!card) return;
    if (btn.getAttribute("data-action") === "ack") {
      card.style.opacity = "0.75";
      saveMsg.textContent = "Alert acknowledged.";
    } else {
      card.remove();
      saveMsg.textContent = "Alert resolved.";
    }
  });

  loadPrefs();
  renderAlerts();
  setInterval(renderAlerts, 5000);
})();
