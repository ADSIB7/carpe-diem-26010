(() => {
  const defaultPrices = [
    { crop: "Wheat", unit: 45, change: 5.0, region: "North" },
    { crop: "Rice", unit: 65, change: -2.3, region: "East" },
    { crop: "Maize", unit: 38, change: 3.1, region: "West" },
    { crop: "Soybean", unit: 72, change: -1.6, region: "Central" },
    { crop: "Tomato", unit: 28, change: 4.3, region: "South" }
  ];

  const defaultDemands = [
    { crop: "Wheat", trend: "rising", region: "North", score: 86 },
    { crop: "Soybean", trend: "stable", region: "Central", score: 66 },
    { crop: "Tomato", trend: "rising", region: "South", score: 91 },
    { crop: "Rice", trend: "falling", region: "East", score: 48 },
    { crop: "Maize", trend: "stable", region: "West", score: 63 }
  ];

  const defaultForecast = [
    { crop: "Wheat", status: "Rising", points: [40, 44, 46, 49, 53, 55, 60], region: "North" },
    { crop: "Rice", status: "Stable", points: [64, 65, 66, 65, 66, 67, 66], region: "East" },
    { crop: "Tomato", status: "Decline", points: [34, 33, 31, 30, 28, 27, 26], region: "South" }
  ];

  const defaultCompetitors = [
    { name: "Cultivar Agro", crop: "Wheat", price: 68, region: "North" },
    { name: "GreenHarvest", crop: "Rice", price: 67, region: "East" },
    { name: "FreshField", crop: "Tomato", price: 70, region: "South" }
  ];

  const defaultSupply = {
    inbound: 74,
    arrival: 1320,
    surplus: 18
  };

  const defaultAlerts = [
    { icon: "!", text: "Government MSP update released for wheat", posted: "2 hrs ago" },
    { icon: "!", text: "Weather alert: heatwave may affect crop yields", posted: "1 day ago" },
    { icon: "!", text: "Transport strike risk on major inbound route", posted: "3 hrs ago" }
  ];

  let prices = defaultPrices.slice();
  let demands = defaultDemands.slice();
  let forecast = defaultForecast.slice();
  let competitors = defaultCompetitors.slice();
  let inbound = defaultSupply.inbound;
  let arrival = defaultSupply.arrival;
  let surplus = defaultSupply.surplus;
  let alerts = defaultAlerts.slice();

  const els = {
    liveClock: document.getElementById("liveClock"),
    themeToggle: document.getElementById("themeToggle"),
    cropFilter: document.getElementById("cropFilter"),
    regionFilter: document.getElementById("regionFilter"),
    lastUpdated: document.getElementById("lastUpdated"),
    priceBody: document.getElementById("priceBody"),
    demandList: document.getElementById("demandList"),
    demandTrendChart: document.getElementById("demandTrendChart"),
    forecastList: document.getElementById("forecastList"),
    inboundFill: document.getElementById("inboundFill"),
    arrivalVolume: document.getElementById("arrivalVolume"),
    surplusStatus: document.getElementById("surplusStatus"),
    supplyAlerts: document.getElementById("supplyAlerts"),
    competitorBody: document.getElementById("competitorBody"),
    menuBtn: document.getElementById("menuBtn"),
    sidebar: document.getElementById("sidebar"),
    profileToggle: document.getElementById("profileToggle"),
    profileMenu: document.getElementById("profileMenu")
  };

  const state = {
    crop: "All Crops",
    region: "All Regions"
  };

  async function loadMarketIntelligenceData() {
    if (!window.AgriApi || !window.AgriApi.getMarketIntelligenceData) return;
    try {
      const response = await window.AgriApi.getMarketIntelligenceData();
      const payload = response && response.data ? response.data : null;
      if (!payload) return;
      if (Array.isArray(payload.prices) && payload.prices.length) {
        prices = payload.prices.slice();
      }
      if (Array.isArray(payload.demands) && payload.demands.length) {
        demands = payload.demands.slice();
      }
      if (Array.isArray(payload.forecast) && payload.forecast.length) {
        forecast = payload.forecast.slice();
      }
      if (Array.isArray(payload.competitors) && payload.competitors.length) {
        competitors = payload.competitors.slice();
      }
      if (payload.supply) {
        inbound = Number(payload.supply.inbound || defaultSupply.inbound);
        arrival = Number(payload.supply.arrival || defaultSupply.arrival);
        surplus = Number(payload.supply.surplus || defaultSupply.surplus);
        if (Array.isArray(payload.supply.alerts) && payload.supply.alerts.length) {
          alerts = payload.supply.alerts.slice();
        }
      }
    } catch (error) {
      // Keep local defaults if backend fetch fails.
    }
  }

  const uniq = (arr) => [...new Set(arr)];

  function getFiltered(items, cropKey = "crop", regionKey = "region") {
    return items.filter((row) => {
      const cropPass = state.crop === "All Crops" ? true : row[cropKey] === state.crop;
      const regionPass = state.region === "All Regions" ? true : row[regionKey] === state.region;
      return cropPass && regionPass;
    });
  }

  function toSparkPath(points, w = 220, h = 52) {
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = Math.max(1, max - min);
    const step = w / (points.length - 1);
    return points
      .map((p, i) => {
        const x = i * step;
        const y = h - ((p - min) / range) * (h - 8) - 4;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  function renderFilters() {
    const crops = ["All Crops", ...uniq(prices.map((p) => p.crop))];
    const regions = ["All Regions", ...uniq(prices.map((p) => p.region))];

    els.cropFilter.innerHTML = crops.map((c) => `<option>${c}</option>`).join("");
    els.regionFilter.innerHTML = regions.map((r) => `<option>${r}</option>`).join("");
    els.cropFilter.value = state.crop;
    els.regionFilter.value = state.region;
  }

  function renderPrices() {
    const rows = getFiltered(prices, "crop", "region");
    els.priceBody.innerHTML = rows
      .map((row) => {
        const up = row.change >= 0;
        return `
          <tr>
            <td><strong>${row.crop}</strong></td>
            <td>Rs${row.unit}/kg</td>
            <td><span class="change ${up ? "up" : "down"}">${up ? "+" : ""}${row.change.toFixed(1)}% ${up ? "?" : "?"}</span></td>
          </tr>
        `;
      })
      .join("");
  }

  function renderDemand() {
    const rows = getFiltered(demands, "crop", "region");
    els.demandList.innerHTML = rows
      .map((row) => `
        <div class="demand-item">
          <div><strong>${row.crop}</strong></div>
          <span class="trend-pill ${row.trend}">${row.trend[0].toUpperCase() + row.trend.slice(1)}</span>
        </div>
      `)
      .join("");

    const points = rows.length ? rows.map((r) => r.score) : [60, 62, 61, 63, 64];
    els.demandTrendChart.innerHTML = `<svg viewBox="0 0 300 80" preserveAspectRatio="none"><path d="${toSparkPath(points, 300, 80)}"></path></svg>`;
  }

  function renderForecast() {
    const rows = getFiltered(forecast, "crop", "region");
    els.forecastList.innerHTML = rows
      .map((row) => `
        <div class="forecast-item">
          <div class="forecast-top"><strong>${row.crop}</strong><span>${row.status}</span></div>
          <svg class="spark" viewBox="0 0 220 52" preserveAspectRatio="none"><path d="${toSparkPath(row.points, 220, 52)}"></path></svg>
          <small>Projected range: ${Math.min(...row.points)}-${Math.max(...row.points)}</small>
        </div>
      `)
      .join("");
  }

  function renderSupply() {
    els.inboundFill.style.width = `${inbound}%`;
    els.arrivalVolume.textContent = `${arrival} tons`;
    els.surplusStatus.textContent = `${surplus >= 0 ? "Surplus" : "Shortage"} ${Math.abs(surplus)}%`;
    els.surplusStatus.className = surplus >= 0 ? "positive" : "negative";

    els.supplyAlerts.innerHTML = alerts
      .map((a) => `
        <div class="alert-item">
          <span class="alert-icon">${a.icon}</span>
          <div>${a.text}</div>
          <span class="alert-time">${a.posted}</span>
        </div>
      `)
      .join("");
  }

  function renderCompetitors() {
    const rows = getFiltered(competitors, "crop", "region");
    els.competitorBody.innerHTML = rows
      .map((row) => `
        <tr>
          <td>${row.name}</td>
          <td>${row.crop}</td>
          <td><strong>Rs ${row.price}/kg</strong></td>
        </tr>
      `)
      .join("");
  }

  function renderAll() {
    renderPrices();
    renderDemand();
    renderForecast();
    renderSupply();
    renderCompetitors();
    els.lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  }

  function simulateRefresh() {
    prices.forEach((p) => {
      p.unit = Math.max(20, Math.round((p.unit + (Math.random() - 0.5) * 2) * 10) / 10);
      p.change = Math.round((p.change + (Math.random() - 0.5) * 0.8) * 10) / 10;
    });

    inbound = Math.max(20, Math.min(96, inbound + (Math.random() - 0.45) * 6));
    arrival = Math.round(arrival + (Math.random() - 0.5) * 40);
    surplus = Math.round((surplus + (Math.random() - 0.5) * 4) * 10) / 10;
    renderAll();
  }

  function updateClock() {
    els.liveClock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark", dark);
    document.body.classList.toggle("dark-mode", dark);
    els.themeToggle.textContent = dark ? "Light" : "Dark";
  }

  function bindEvents() {
    els.cropFilter.addEventListener("change", (e) => {
      state.crop = e.target.value;
      renderAll();
    });

    els.regionFilter.addEventListener("change", (e) => {
      state.region = e.target.value;
      renderAll();
    });

    els.themeToggle.addEventListener("click", () => {
      const dark = document.body.classList.contains("dark") || document.body.classList.contains("dark-mode");
      const next = dark ? "light" : "dark";
      localStorage.setItem("market-theme", next);
      applyTheme(next);
    });

    if (els.profileToggle && els.profileMenu) {
      els.profileToggle.addEventListener("click", () => {
        const expanded = els.profileToggle.getAttribute("aria-expanded") === "true";
        els.profileToggle.setAttribute("aria-expanded", String(!expanded));
        els.profileMenu.classList.toggle("open", !expanded);
      });
    }

    if (els.menuBtn && els.sidebar) {
      els.menuBtn.addEventListener("click", () => {
        els.sidebar.classList.toggle("sidebar-open");
      });
    }
  }

  async function init() {
    await loadMarketIntelligenceData();
    const savedTheme = localStorage.getItem("market-theme") || "light";
    applyTheme(savedTheme);
    renderFilters();
    bindEvents();
    renderAll();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(simulateRefresh, 12000);
  }

  init();
})();
