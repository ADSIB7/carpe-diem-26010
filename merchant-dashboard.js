(function () {
  const dashboardStats = [
    { label: "Total Orders", value: "128" },
    { label: "Active Purchases", value: "46" },
    { label: "Connected Warehouses", value: "12" },
    { label: "Total Investment", value: "\u20B91,28,400" }
  ];

  let produceData = [];
  let warehousesData = [];

  const weeklyTrendData = [
    { crop: "Wheat", values: [62, 68, 70, 74, 72, 78, 84] },
    { crop: "Tomato", values: [48, 46, 50, 52, 49, 51, 53] },
    { crop: "Onion", values: [72, 66, 62, 58, 60, 57, 55] },
    { crop: "Maize", values: [38, 39, 40, 41, 39, 40, 41] }
  ];

  const marketDemandAnalysis = [
    { crop: "Wheat", level: "High", change: 6, region: "Pune", action: "Increase purchase" },
    { crop: "Tomato", level: "Medium", change: -2, region: "Nashik", action: "Monitor market" },
    { crop: "Onion", level: "Low", change: -5, region: "Mumbai", action: "Avoid bulk buying" },
    { crop: "Maize", level: "High", change: 4, region: "Nagpur", action: "Secure contracts" }
  ];

  const priceTrendData = [
    { crop: "Wheat", currentPrice: 42, history: [38, 39, 40, 40, 41, 42, 42] },
    { crop: "Tomato", currentPrice: 26, history: [30, 29, 28, 27, 27, 26, 26] },
    { crop: "Onion", currentPrice: 38, history: [41, 40, 39, 38, 37, 38, 38] },
    { crop: "Maize", currentPrice: 39, history: [37, 38, 38, 39, 39, 39, 39] }
  ];

  const supplyDemandData = [
    { crop: "Wheat", stock: 1200, demandIndex: "High", status: "Balanced" },
    { crop: "Tomato", stock: 800, demandIndex: "High", status: "Shortage (Opportunity)" },
    { crop: "Onion", stock: 1500, demandIndex: "Low", status: "Surplus" },
    { crop: "Maize", stock: 980, demandIndex: "Medium", status: "Balanced" }
  ];

  const marketOpportunities = [
    { crop: "Tomato", reason: "Price dropping in wholesale yards", risk: "Medium", action: "Buy in phased lots", margin: 18 },
    { crop: "Wheat", reason: "Demand rising across Pune region", risk: "Low", action: "Increase procurement volume", margin: 22 },
    { crop: "Onion", reason: "Demand weak but supply high", risk: "High", action: "Limit short-term exposure", margin: 9 },
    { crop: "Maize", reason: "Stable prices with gradual demand rise", risk: "Low", action: "Lock medium-term contracts", margin: 14 }
  ];

  const conversations = [
    {
      id: "conv-1",
      farmer: "Anil Farm",
      warehouse: "GreenCold",
      messages: [
        { from: "them", text: "Wheat batch is ready for pickup." },
        { from: "me", text: "Great, I will confirm quantity today." }
      ]
    },
    {
      id: "conv-2",
      farmer: "Sunrise Growers",
      warehouse: "FreshCool Depot",
      messages: [
        { from: "them", text: "Tomato quality updated to Moderate." },
        { from: "me", text: "Thanks. Please share latest lot image." }
      ]
    }
  ];

  const savedAuthRaw = localStorage.getItem("merchantAuthUser");
  let savedAuth = null;
  try {
    savedAuth = savedAuthRaw ? JSON.parse(savedAuthRaw) : null;
  } catch (error) {
    savedAuth = null;
  }

  const profileData = {
    name: localStorage.getItem("merchantProfileName") || localStorage.getItem("merchantName") || (savedAuth && savedAuth.name) || "Rahul Traders",
    email: localStorage.getItem("merchantProfileEmail") || (savedAuth && savedAuth.email) || "rahul@traders.com",
    phone: localStorage.getItem("merchantProfilePhone") || (savedAuth && savedAuth.phone) || "+91 98989 12345",
    businessName: localStorage.getItem("merchantProfileCompany") || localStorage.getItem("merchantCompany") || (savedAuth && savedAuth.businessName) || "Rahul Agro Traders",
    businessLocation: localStorage.getItem("merchantProfileLocation") || localStorage.getItem("merchantLocation") || (savedAuth && savedAuth.businessLocation) || "Pune"
  };

  let selectedProduce = null;
  let selectedConversationId = conversations[0].id;

  const sideNav = document.getElementById("sideNav");
  const views = Array.from(document.querySelectorAll(".view"));
  const menuBtn = document.getElementById("menuBtn");
  const sidebar = document.getElementById("sidebar");
  const themeToggle = document.getElementById("themeToggle");
  const profileCard = document.getElementById("profileCard");
  const profileToggle = document.getElementById("profileToggle");
  const profileMenu = document.getElementById("profileMenu");
  const weatherSummary = document.getElementById("weatherSummary");
  const liveClock = document.getElementById("liveClock");

  const dashboardStatsEl = document.getElementById("dashboardStats");
  const dashboardProduceEl = document.getElementById("dashboardProduce");
  const dashboardDemandEl = document.getElementById("dashboardDemand");
  const dashboardOrdersEl = document.getElementById("dashboardOrders");

  const produceSearchInput = document.getElementById("produceSearchInput");
  const qualityFilter = document.getElementById("qualityFilter");
  const warehouseFilter = document.getElementById("warehouseFilter");
  const maxPriceFilter = document.getElementById("maxPriceFilter");
  const searchProduceGrid = document.getElementById("searchProduceGrid");

  const orderStatusFilter = document.getElementById("orderStatusFilter");
  const ordersTableBody = document.getElementById("ordersTableBody");

  const warehouseGrid = document.getElementById("warehouseGrid");
  const marketSummaryCards = document.getElementById("marketSummaryCards");
  const demandTableBody = document.getElementById("demandTableBody");
  const priceTrendGrid = document.getElementById("priceTrendGrid");
  const profitCrop = document.getElementById("profitCrop");
  const purchasePrice = document.getElementById("purchasePrice");
  const sellingPrice = document.getElementById("sellingPrice");
  const calcQuantity = document.getElementById("calcQuantity");
  const calculateProfitBtn = document.getElementById("calculateProfitBtn");
  const resultRevenue = document.getElementById("resultRevenue");
  const resultCost = document.getElementById("resultCost");
  const resultProfit = document.getElementById("resultProfit");
  const resultMargin = document.getElementById("resultMargin");
  const supplyDemandGrid = document.getElementById("supplyDemandGrid");
  const insightsOpportunityGrid = document.getElementById("insightsOpportunityGrid");

  const chatList = document.getElementById("chatList");
  const chatHeader = document.getElementById("chatHeader");
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");

  const sidebarMerchantName = document.getElementById("sidebarMerchantName");
  const topMerchantName = document.getElementById("topMerchantName");
  const profileView = document.getElementById("profileView");
  const profileForm = document.getElementById("profileForm");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const cancelProfileEdit = document.getElementById("cancelProfileEdit");
  const profileNameInput = document.getElementById("profileNameInput");
  const profileEmailInput = document.getElementById("profileEmailInput");
  const profilePhoneInput = document.getElementById("profilePhoneInput");
  const profileBusinessInput = document.getElementById("profileBusinessInput");
  const profileLocationInput = document.getElementById("profileLocationInput");
  const accountSummary = document.getElementById("accountSummary");

  const orderModal = document.getElementById("orderModal");
  const orderModalCrop = document.getElementById("orderModalCrop");
  const orderQtyInput = document.getElementById("orderQtyInput");
  const confirmOrderBtn = document.getElementById("confirmOrderBtn");

  const orderDetailsModal = document.getElementById("orderDetailsModal");
  const orderDetailsContent = document.getElementById("orderDetailsContent");

  const warehouseContactModal = document.getElementById("warehouseContactModal");
  const warehouseContactContent = document.getElementById("warehouseContactContent");
  const sendWarehouseMessageBtn = document.getElementById("sendWarehouseMessageBtn");

  function qualityClass(status) {
    if (status === "Good") return "good";
    if (status === "Moderate") return "moderate";
    return "risk";
  }

  function statusClass(status) {
    return status.toLowerCase();
  }

  function demandToneClass(tone) {
    const normalized = String(tone).toLowerCase();
    if (normalized === "high") return "high";
    if (normalized === "low") return "low";
    return "medium";
  }

  function demandLevelClass(level) {
    if (level === "High") return "high";
    if (level === "Low") return "low";
    return "medium";
  }

  function trendPrediction(change) {
    if (change > 2) return "Rising";
    if (change < -2) return "Falling";
    return "Stable";
  }

  function riskClass(risk) {
    return risk.toLowerCase();
  }

  function supplyStatusClass(status) {
    if (status.indexOf("Shortage") === 0) return "opportunity";
    if (status === "Surplus") return "surplus";
    return "balanced";
  }

  function formatCurrency(value) {
    const amount = Number(value || 0);
    const sign = amount < 0 ? "-₹" : "₹";
    return sign + Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  function showView(viewName) {
    views.forEach((view) => {
      view.classList.toggle("active", view.id === "view-" + viewName);
    });
    sideNav.querySelectorAll("[data-view]").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-view") === viewName);
    });
  }

  async function fetchData() {
    try {
      const [batchesRes, warehousesRes] = await Promise.all([
        window.AgriApi.listBatches(),
        window.AgriApi.listWarehouses()
      ]);

      if (batchesRes && batchesRes.data) {
        produceData = batchesRes.data.map(b => ({
          id: b.id,
          crop: b.product_name,
          farmer: b.farmer_name,
          warehouse: b.warehouse_id || "Demo Warehouse",
          quantity: b.quantity_tons,
          quality: b.status || "Good",
          daysLeft: b.daysToExpiry || 0,
          price: 40 // Defaulting price as it might not be in the batch schema directly
        }));
      }

      if (warehousesRes && warehousesRes.data) {
        warehousesData = warehousesRes.data.map(w => ({
          id: w.id,
          name: w.name,
          location: w.location,
          totalCapacity: w.capacityTons + " tons",
          availableCapacity: (w.capacityTons - w.currentStockTons) + " tons",
          coldStorage: "Yes", // Defaulting
          phone: "+91 00000 00000",
          email: "info@" + w.name.toLowerCase().replace(/\s/g, "") + ".com"
        }));
      }

      updateDashboardStats();
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }

  function updateDashboardStats() {
    const totalInvestment = produceData.reduce((sum, item) => sum + (item.quantity * item.price * 1000), 0);
    dashboardStats[0].value = "0"; // Orders not yet integrated
    dashboardStats[1].value = produceData.length.toString();
    dashboardStats[2].value = warehousesData.length.toString();
    dashboardStats[3].value = formatCurrency(totalInvestment);
  }

  function renderDashboard() {
    dashboardStatsEl.innerHTML = "";
    dashboardStats.forEach((item) => {
      const card = document.createElement("article");
      card.className = "stat-card";
      card.innerHTML = "<span>" + item.label + "</span><strong>" + item.value + "</strong>";
      dashboardStatsEl.appendChild(card);
    });

    dashboardProduceEl.innerHTML = "";
    produceData.slice(0, 4).forEach((item) => {
      const card = buildProduceCard(item);
      dashboardProduceEl.appendChild(card);
    });

    dashboardDemandEl.innerHTML = "";
    // demandData is still mock for now as we don't have a specific endpoint for demand trends yet
    [
      { crop: "Wheat", value: "High \u2191", tone: "high" },
      { crop: "Tomato", value: "Medium \u2192", tone: "medium" },
      { crop: "Onion", value: "Low \u2193", tone: "low" }
    ].forEach((item) => {
      const card = document.createElement("article");
      card.className = "insight-card";
      card.innerHTML = "<h3>" + item.crop + "</h3><p class='" + demandToneClass(item.tone) + "'>" + item.value + "</p>";
      dashboardDemandEl.appendChild(card);
    });

    dashboardOrdersEl.innerHTML = "";
    // ordersData is also mock since we don't have a listOrders endpoint in api-client.js yet
    [].forEach((order) => {
      const row = document.createElement("tr");
      row.innerHTML =
        "<td>" + order.crop + "</td>" +
        "<td>" + order.farmer + "</td>" +
        "<td>" + order.quantity + "</td>" +
        "<td>" + order.price + "</td>" +
        "<td><span class='status " + statusClass(order.status) + "'>" + order.status + "</span></td>";
      dashboardOrdersEl.appendChild(row);
    });
  }

  function buildProduceCard(item) {
    const card = document.createElement("article");
    card.className = "produce-card";
    card.innerHTML =
      "<h3>" + item.crop + "</h3>" +
      "<p>Farmer: " + item.farmer + "</p>" +
      "<p>Warehouse: " + item.warehouse + "</p>" +
      "<p>Quantity: " + item.quantity + " tons</p>" +
      "<span class='quality " + qualityClass(item.quality) + "'>" + item.quality + "</span>" +
      "<p>Days Left: " + item.daysLeft + "</p>" +
      "<p>Price: \u20B9" + item.price + "/kg</p>" +
      "<button class='place-order-btn' type='button'>Place Order</button>";

    card.querySelector(".place-order-btn").addEventListener("click", function () {
      selectedProduce = item;
      orderModalCrop.textContent = item.crop + " | " + item.farmer + " | " + item.warehouse;
      orderQtyInput.value = "";
      openModal(orderModal);
    });

    return card;
  }

  function renderSearchProduce() {
    const query = produceSearchInput.value.trim().toLowerCase();
    const quality = qualityFilter.value;
    const warehouse = warehouseFilter.value;
    const maxPrice = Number(maxPriceFilter.value || 0);

    const filtered = produceData.filter((item) => {
      const cropOk = !query || item.crop.toLowerCase().includes(query);
      const qualityOk = quality === "all" || item.quality === quality;
      const warehouseOk = warehouse === "all" || item.warehouse === warehouse;
      const priceOk = !maxPrice || item.price <= maxPrice;
      return cropOk && qualityOk && warehouseOk && priceOk;
    });

    searchProduceGrid.innerHTML = "";

    if (!filtered.length) {
      searchProduceGrid.innerHTML = "<article class='produce-card'><p>No produce found for selected filters.</p></article>";
      return;
    }

    filtered.forEach((item) => {
      searchProduceGrid.appendChild(buildProduceCard(item));
    });
  }

  function renderOrders() {
    const filter = orderStatusFilter.value;
    ordersTableBody.innerHTML = "";

    const list = ordersData.filter((item) => filter === "all" || item.status === filter);

    list.forEach((order) => {
      const row = document.createElement("tr");
      row.innerHTML =
        "<td>" + order.id + "</td>" +
        "<td>" + order.crop + "</td>" +
        "<td>" + order.farmer + "</td>" +
        "<td>" + order.warehouse + "</td>" +
        "<td>" + order.quantity + "</td>" +
        "<td>" + order.price + "</td>" +
        "<td>" + order.total + "</td>" +
        "<td><span class='status " + statusClass(order.status) + "'>" + order.status + "</span></td>" +
        "<td><button class='ghost-btn order-detail-btn' type='button'>View Details</button></td>";

      row.querySelector(".order-detail-btn").addEventListener("click", function () {
        orderDetailsContent.innerHTML =
          "<div class='detail-row'><strong>Order ID:</strong> " + order.id + "</div>" +
          "<div class='detail-row'><strong>Crop:</strong> " + order.crop + "</div>" +
          "<div class='detail-row'><strong>Farmer:</strong> " + order.farmer + "</div>" +
          "<div class='detail-row'><strong>Warehouse:</strong> " + order.warehouse + "</div>" +
          "<div class='detail-row'><strong>Quantity:</strong> " + order.quantity + "</div>" +
          "<div class='detail-row'><strong>Price:</strong> " + order.price + "</div>" +
          "<div class='detail-row'><strong>Status:</strong> " + order.status + "</div>";
        openModal(orderDetailsModal);
      });

      ordersTableBody.appendChild(row);
    });
  }

  function renderWarehouses() {
    warehouseGrid.innerHTML = "";
    warehousesData.forEach((warehouse) => {
      const card = document.createElement("article");
      card.className = "warehouse-card";
      card.innerHTML =
        "<h3>" + warehouse.name + "</h3>" +
        "<p>Location: " + warehouse.location + "</p>" +
        "<p>Total Capacity: " + warehouse.totalCapacity + "</p>" +
        "<p>Available Capacity: " + warehouse.availableCapacity + "</p>" +
        "<p>Cold Storage: " + warehouse.coldStorage + "</p>" +
        "<button class='primary-btn warehouse-contact-btn' type='button'>Contact</button>";

      card.querySelector(".warehouse-contact-btn").addEventListener("click", function () {
        warehouseContactContent.innerHTML =
          "<div class='detail-row'><strong>Warehouse:</strong> " + warehouse.name + "</div>" +
          "<div class='detail-row'><strong>Phone:</strong> " + warehouse.phone + "</div>" +
          "<div class='detail-row'><strong>Email:</strong> " + warehouse.email + "</div>";
        openModal(warehouseContactModal);
      });

      warehouseGrid.appendChild(card);
    });
  }

  function renderMarketInsights() {
    const highestDemand = marketDemandAnalysis.slice().sort((a, b) => b.change - a.change)[0];
    const priceSurge = priceTrendData
      .map((item) => {
        const first = item.history[0];
        const last = item.history[item.history.length - 1];
        return { crop: item.crop, change: ((last - first) / first) * 100 };
      })
      .sort((a, b) => b.change - a.change)[0];
    const priceDrop = priceTrendData
      .map((item) => {
        const first = item.history[0];
        const last = item.history[item.history.length - 1];
        return { crop: item.crop, change: ((last - first) / first) * 100 };
      })
      .sort((a, b) => a.change - b.change)[0];
    const bestMargin = marketOpportunities.slice().sort((a, b) => b.margin - a.margin)[0];

    marketSummaryCards.innerHTML = "";
    [
      { title: "Highest Demand Crop", crop: highestDemand.crop, metric: "↑ +" + highestDemand.change + "%", tone: "up" },
      { title: "Price Surge Alert", crop: priceSurge.crop, metric: "↑ +" + Math.round(priceSurge.change) + "%", tone: "up" },
      { title: "Price Drop Alert", crop: priceDrop.crop, metric: "↓ " + Math.round(priceDrop.change) + "%", tone: "down" },
      { title: "Best Resale Margin", crop: bestMargin.crop, metric: bestMargin.margin + "%", tone: "up" }
    ].forEach((item) => {
      const card = document.createElement("article");
      card.className = "market-summary-card";
      card.innerHTML =
        "<span>" + item.title + "</span>" +
        "<h3>" + item.crop + "</h3>" +
        "<strong class='metric-" + item.tone + "'>" + item.metric + "</strong>";
      marketSummaryCards.appendChild(card);
    });

    demandTableBody.innerHTML = "";
    marketDemandAnalysis.forEach((item) => {
      const changeClass = item.change >= 0 ? "up" : "down";
      const changeText = item.change >= 0 ? "↑ +" + item.change + "%" : "↓ " + item.change + "%";
      const row = document.createElement("tr");
      row.innerHTML =
        "<td>" + item.crop + "</td>" +
        "<td><span class='demand-badge " + demandLevelClass(item.level) + "'>" + item.level + "</span></td>" +
        "<td><span class='change-value " + changeClass + "'>" + changeText + "</span></td>" +
        "<td>" + item.region + "</td>" +
        "<td>" + item.action + "</td>";
      demandTableBody.appendChild(row);
    });

    priceTrendGrid.innerHTML = "";
    priceTrendData.forEach((item) => {
      const first = item.history[0];
      const last = item.history[item.history.length - 1];
      const weeklyChange = ((last - first) / first) * 100;
      const prediction = trendPrediction(weeklyChange);
      const maxVal = Math.max.apply(null, item.history);
      const bars = item.history
        .map((value) => {
          const level = Math.max(1, Math.min(10, Math.round((value / maxVal) * 10)));
          return "<span class='trend-bar level-" + level + "'></span>";
        })
        .join("");

      const card = document.createElement("article");
      card.className = "price-trend-card";
      card.innerHTML =
        "<div class='trend-head'><h3>" + item.crop + "</h3><span class='prediction-badge " + prediction.toLowerCase() + "'>" + prediction + "</span></div>" +
        "<div class='trend-price'><span>Current Price</span><strong>₹" + item.currentPrice + "/kg</strong></div>" +
        "<div class='trend-price'><span>Weekly Change</span><strong class='" + (weeklyChange >= 0 ? "metric-up" : "metric-down") + "'>" + (weeklyChange >= 0 ? "+" : "") + Math.round(weeklyChange) + "%</strong></div>" +
        "<div class='trend-bars'>" + bars + "</div>";
      priceTrendGrid.appendChild(card);
    });

    supplyDemandGrid.innerHTML = "";
    supplyDemandData.forEach((item) => {
      const card = document.createElement("article");
      card.className = "supply-card";
      card.innerHTML =
        "<h3>" + item.crop + "</h3>" +
        "<p>Stock: " + item.stock + " tons</p>" +
        "<p>Demand Index: " + item.demandIndex + "</p>" +
        "<span class='supply-status " + supplyStatusClass(item.status) + "'>" + item.status + "</span>";
      supplyDemandGrid.appendChild(card);
    });

    insightsOpportunityGrid.innerHTML = "";
    marketOpportunities.forEach((item) => {
      const card = document.createElement("article");
      card.className = "opportunity-card";
      card.innerHTML =
        "<h3>" + item.crop + "</h3>" +
        "<p>" + item.reason + "</p>" +
        "<span class='risk-badge " + riskClass(item.risk) + "'>Risk: " + item.risk + "</span>" +
        "<p>Action: " + item.action + "</p>" +
        "<div class='margin-value'>Potential Margin: " + item.margin + "%</div>";
      insightsOpportunityGrid.appendChild(card);
    });
  }

  function renderChatList() {
    chatList.innerHTML = "";
    conversations.forEach((conv) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "chat-user" + (conv.id === selectedConversationId ? " active" : "");
      card.innerHTML = "<strong>" + conv.farmer + "</strong><span>" + conv.warehouse + "</span>";
      card.addEventListener("click", function () {
        selectedConversationId = conv.id;
        renderChatList();
        renderChatMessages();
      });
      chatList.appendChild(card);
    });
  }

  function renderChatMessages() {
    const conversation = conversations.find((item) => item.id === selectedConversationId);
    if (!conversation) return;

    chatHeader.textContent = conversation.farmer + " | " + conversation.warehouse;
    chatMessages.innerHTML = "";

    conversation.messages.forEach((msg) => {
      const bubble = document.createElement("div");
      bubble.className = "bubble " + (msg.from === "me" ? "outgoing" : "incoming");
      bubble.textContent = msg.text;
      chatMessages.appendChild(bubble);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function renderProfile() {
    sidebarMerchantName.textContent = profileData.name;
    topMerchantName.textContent = profileData.name;
    if (weatherSummary) {
      weatherSummary.textContent = profileData.businessLocation + " | 28 C | Clear";
    }

    profileView.innerHTML =
      "<div class='profile-item'><span>Name</span><strong>" + profileData.name + "</strong></div>" +
      "<div class='profile-item'><span>Email</span><strong>" + profileData.email + "</strong></div>" +
      "<div class='profile-item'><span>Phone</span><strong>" + profileData.phone + "</strong></div>" +
      "<div class='profile-item'><span>Business Name</span><strong>" + profileData.businessName + "</strong></div>" +
      "<div class='profile-item'><span>Business Location</span><strong>" + profileData.businessLocation + "</strong></div>";

    accountSummary.innerHTML =
      "<div class='summary-item'><span>Total Orders</span><strong>" + ordersData.length + "</strong></div>" +
      "<div class='summary-item'><span>Total Investment</span><strong>\u20B91,28,400</strong></div>" +
      "<div class='summary-item'><span>Active Connections</span><strong>" + warehousesData.length + " Warehouses</strong></div>";

    profileNameInput.value = profileData.name;
    profileEmailInput.value = profileData.email;
    profilePhoneInput.value = profileData.phone;
    profileBusinessInput.value = profileData.businessName;
    profileLocationInput.value = profileData.businessLocation;
  }

  function openModal(modal) {
    modal.classList.add("open");
  }

  function closeModal(modal) {
    modal.classList.remove("open");
  }

  function setupWarehouseFilter() {
    const names = Array.from(new Set(produceData.map((item) => item.warehouse)));
    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      warehouseFilter.appendChild(option);
    });
  }

  function setupProfitCalculator() {
    if (!profitCrop || !purchasePrice || !sellingPrice || !calcQuantity || !calculateProfitBtn) return;

    function getSelectedTrend() {
      return priceTrendData.find((item) => item.crop === profitCrop.value) || priceTrendData[0];
    }

    function applyCropDefaults() {
      const selected = getSelectedTrend();
      if (!selected) return;
      purchasePrice.value = String(Math.max(1, selected.currentPrice - 3));
      sellingPrice.value = String(selected.currentPrice);
      if (!calcQuantity.value) calcQuantity.value = "100";
    }

    function calculateProfit() {
      const purchase = Number(purchasePrice.value);
      const selling = Number(sellingPrice.value);
      const qty = Number(calcQuantity.value);

      if (!(purchase > 0) || !(selling > 0) || !(qty > 0)) {
        resultRevenue.textContent = "₹0";
        resultCost.textContent = "₹0";
        resultProfit.textContent = "Enter valid values";
        resultMargin.textContent = "0%";
        resultMargin.className = "";
        return;
      }

      const totalCost = purchase * qty;
      const totalRevenue = selling * qty;
      const profit = totalRevenue - totalCost;
      const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

      resultRevenue.textContent = formatCurrency(totalRevenue);
      resultCost.textContent = formatCurrency(totalCost);
      resultProfit.textContent = formatCurrency(profit);
      resultMargin.textContent = margin.toFixed(2) + "%";
      resultMargin.className = profit >= 0 ? "metric-up" : "metric-down";
    }

    profitCrop.innerHTML = "";
    priceTrendData.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.crop;
      option.textContent = item.crop;
      profitCrop.appendChild(option);
    });

    applyCropDefaults();
    calculateProfit();

    profitCrop.addEventListener("change", function () {
      applyCropDefaults();
      calculateProfit();
    });

    calculateProfitBtn.addEventListener("click", calculateProfit);
    [purchasePrice, sellingPrice, calcQuantity].forEach((input) => {
      input.addEventListener("input", calculateProfit);
    });
  }

  sideNav.querySelectorAll("[data-view]").forEach((item) => {
    item.addEventListener("click", function () {
      const view = item.getAttribute("data-view");
      showView(view);
      if (window.matchMedia("(max-width: 980px)").matches && sidebar) {
        sidebar.classList.remove("sidebar-open");
      }
    });
  });

  document.querySelectorAll("[data-view-link]").forEach((link) => {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const view = link.getAttribute("data-view-link");
      showView(view);
      if (profileMenu && profileToggle) {
        profileMenu.classList.remove("open");
        profileToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function () {
      sidebar.classList.toggle("sidebar-open");
    });
  }

  function applyTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-mode", dark);
    themeToggle.textContent = dark ? "Light" : "Dark";
  }

  const savedTheme = localStorage.getItem("merchantDashboardTheme") || "light";
  applyTheme(savedTheme);

  themeToggle.addEventListener("click", function () {
    const next = document.body.classList.contains("dark-mode") ? "light" : "dark";
    localStorage.setItem("merchantDashboardTheme", next);
    applyTheme(next);
  });

  if (profileToggle && profileMenu) {
    profileToggle.addEventListener("click", function () {
      const isOpen = profileMenu.classList.toggle("open");
      profileToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  document.addEventListener("click", function (event) {
    if (profileCard && profileMenu && profileToggle && !profileCard.contains(event.target) && !profileMenu.contains(event.target)) {
      profileMenu.classList.remove("open");
      profileToggle.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && profileMenu && profileToggle) {
      profileMenu.classList.remove("open");
      profileToggle.setAttribute("aria-expanded", "false");
    }
  });

  produceSearchInput.addEventListener("input", renderSearchProduce);
  qualityFilter.addEventListener("change", renderSearchProduce);
  warehouseFilter.addEventListener("change", renderSearchProduce);
  maxPriceFilter.addEventListener("input", renderSearchProduce);

  orderStatusFilter.addEventListener("change", renderOrders);

  sendChatBtn.addEventListener("click", function () {
    const text = chatInput.value.trim();
    if (!text) return;
    const conversation = conversations.find((item) => item.id === selectedConversationId);
    if (!conversation) return;
    conversation.messages.push({ from: "me", text: text });
    chatInput.value = "";
    renderChatMessages();
  });

  chatInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      sendChatBtn.click();
    }
  });

  editProfileBtn.addEventListener("click", function () {
    profileView.classList.add("hidden");
    profileForm.classList.remove("hidden");
  });

  cancelProfileEdit.addEventListener("click", function () {
    profileForm.classList.add("hidden");
    profileView.classList.remove("hidden");
    renderProfile();
  });

  profileForm.addEventListener("submit", function (event) {
    event.preventDefault();
    profileData.name = profileNameInput.value.trim();
    profileData.email = profileEmailInput.value.trim();
    profileData.phone = profilePhoneInput.value.trim();
    profileData.businessName = profileBusinessInput.value.trim();
    profileData.businessLocation = profileLocationInput.value.trim();
    localStorage.setItem("merchantProfileName", profileData.name);
    localStorage.setItem("merchantProfileEmail", profileData.email);
    localStorage.setItem("merchantProfilePhone", profileData.phone);
    localStorage.setItem("merchantProfileCompany", profileData.businessName);
    localStorage.setItem("merchantProfileLocation", profileData.businessLocation);
    localStorage.setItem("merchantName", profileData.name);
    localStorage.setItem("merchantCompany", profileData.businessName);
    localStorage.setItem("merchantLocation", profileData.businessLocation);
    profileForm.classList.add("hidden");
    profileView.classList.remove("hidden");
    renderProfile();
  });

  confirmOrderBtn.addEventListener("click", async function () {
    const qty = Number(orderQtyInput.value || 0);
    if (!selectedProduce || qty <= 0) {
      alert("Please enter a valid quantity.");
      return;
    }

    try {
      await AgriApi.placeOrder({
        batchId: selectedProduce.id,
        quantityTons: qty,
        totalPrice: qty * selectedProduce.price * 1000,
        productName: selectedProduce.crop
      });
      AgriApi.toast.success("Order placed successfully!");
      closeModal(orderModal);
      fetchData(); // Refresh produce and orders
    } catch (error) {
      AgriApi.toast.error(error.error || "Failed to place order");
    }
  });

  sendWarehouseMessageBtn.addEventListener("click", function () {
    closeModal(warehouseContactModal);
    alert("Message sent to warehouse");
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", function () {
      const target = document.getElementById(button.getAttribute("data-close"));
      if (target) closeModal(target);
    });
  });

  [orderModal, orderDetailsModal, warehouseContactModal].forEach((modal) => {
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closeModal(modal);
    });
  });

  async function init() {
    await fetchData();
    setupWarehouseFilter();
    setupProfitCalculator();
    if (liveClock) {
      const tickClock = function () {
        liveClock.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      };
      tickClock();
      setInterval(tickClock, 1000);
    }
    renderDashboard();
    renderSearchProduce();
    renderOrders();
    renderWarehouses();
    renderMarketInsights();
    renderChatList();
    renderChatMessages();
    renderProfile();
    showView("dashboard");
  }

  init();
})();
