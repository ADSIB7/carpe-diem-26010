(function () {
  const defaultSettings = {
    thresholds: {
      humidityWarn: 85,
      humidityCritical: 90,
      zonesWarn: 30,
      zonesCritical: 40
    },
    preferences: {
      defaultTheme: "light",
      autoRefresh: true,
      enableBackgroundRunner: true,
      lockSession: true
    },
    integrations: {
      sms: false,
      email: true,
      api: false,
      csv: true
    }
  };

  const form = document.getElementById("settingsForm");
  const saveMsg = document.getElementById("saveMsg");
  const resetBtn = document.getElementById("resetBtn");

  async function getSettings() {
    const existing = window.WarehouseDB ? await window.WarehouseDB.getAsync("settings") : null;
    return Object.assign({}, defaultSettings, existing || {});
  }

  function applyToForm(settings) {
    document.getElementById("humidityWarn").value = settings.thresholds.humidityWarn;
    document.getElementById("humidityCritical").value = settings.thresholds.humidityCritical;
    document.getElementById("zonesWarn").value = settings.thresholds.zonesWarn;
    document.getElementById("zonesCritical").value = settings.thresholds.zonesCritical;

    document.getElementById("defaultTheme").value = settings.preferences.defaultTheme;
    document.getElementById("autoRefresh").checked = Boolean(settings.preferences.autoRefresh);
    document.getElementById("enableBackgroundRunner").checked = Boolean(settings.preferences.enableBackgroundRunner);
    document.getElementById("lockSession").checked = Boolean(settings.preferences.lockSession);

    document.getElementById("intSms").checked = Boolean(settings.integrations.sms);
    document.getElementById("intEmail").checked = Boolean(settings.integrations.email);
    document.getElementById("intApi").checked = Boolean(settings.integrations.api);
    document.getElementById("intCsv").checked = Boolean(settings.integrations.csv);
  }

  function readFromForm() {
    return {
      thresholds: {
        humidityWarn: Number(document.getElementById("humidityWarn").value || 85),
        humidityCritical: Number(document.getElementById("humidityCritical").value || 90),
        zonesWarn: Number(document.getElementById("zonesWarn").value || 30),
        zonesCritical: Number(document.getElementById("zonesCritical").value || 40)
      },
      preferences: {
        defaultTheme: document.getElementById("defaultTheme").value,
        autoRefresh: document.getElementById("autoRefresh").checked,
        enableBackgroundRunner: document.getElementById("enableBackgroundRunner").checked,
        lockSession: document.getElementById("lockSession").checked
      },
      integrations: {
        sms: document.getElementById("intSms").checked,
        email: document.getElementById("intEmail").checked,
        api: document.getElementById("intApi").checked,
        csv: document.getElementById("intCsv").checked
      }
    };
  }

  async function save(settings) {
    if (window.WarehouseDB) {
      await window.WarehouseDB.setAsync("settings", settings);
    }
    localStorage.setItem("dashboardTheme", settings.preferences.defaultTheme === "dark" ? "dark" : "light");
    saveMsg.textContent = "Settings saved successfully at " + new Date().toLocaleTimeString();
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const settings = readFromForm();

    if (settings.thresholds.humidityWarn >= settings.thresholds.humidityCritical) {
      saveMsg.textContent = "Humidity warning must be lower than humidity critical.";
      return;
    }

    if (settings.thresholds.zonesWarn >= settings.thresholds.zonesCritical) {
      saveMsg.textContent = "Zone warning percentage must be lower than critical percentage.";
      return;
    }

    await save(settings);
  });

  resetBtn.addEventListener("click", async function () {
    applyToForm(defaultSettings);
    await save(defaultSettings);
  });

  (async function init() {
    const settings = await getSettings();
    applyToForm(settings);
  })();
})();
