(() => {
  const forecastData = [
    { id: "#A102", product: "Basmati Rice", farmer: "Kanuar Rsan", risk: 10, status: "safe", days: 12 },
    { id: "#B105", product: "Onions", farmer: "Farmer Name", risk: 78, status: "critical", days: 5 },
    { id: "#C331", product: "Wheat", farmer: "Farmer Rsan", risk: 15, status: "safe", days: 11 },
    { id: "#D410", product: "Tomatoes", farmer: "Anil Rao", risk: 86, status: "critical", days: 2 },
    { id: "#E511", product: "Potatoes", farmer: "Manish Yadav", risk: 55, status: "warning", days: 8 },
    { id: "#F102", product: "Apples", farmer: "Neha Sharma", risk: 61, status: "warning", days: 7 },
    { id: "#G720", product: "Grapes", farmer: "Aditi Kale", risk: 91, status: "critical", days: 1 }
  ];

  const riskTrend = [72, 64, 70, 74, 83, 71, 68];

  const state = {
    filter: "all",
    search: "",
    sort: "risk-desc"
  };

  const els = {
    forecastBody: document.getElementById("forecastBody"),
    riskSearch: document.getElementById("riskSearch"),
    riskSort: document.getElementById("riskSort"),
    filterGroup: document.getElementById("statusFilterGroup"),
    trendPath: document.getElementById("trendPath"),
    trendArea: document.getElementById("trendArea")
  };

  function statusLabel(status) {
    if (status === "critical") return "Critical";
    if (status === "warning") return "Warning";
    return "Safe";
  }

  function daysLabel(days, status) {
    if (status === "safe") return `>${days - 1} days`;
    if (status === "warning") return `${days} days (Warning)`;
    return `${days} day${days === 1 ? "" : "s"} (Critical)`;
  }

  function filteredRows() {
    const query = state.search.toLowerCase();

    let rows = forecastData.filter((row) => {
      const matchText = [row.id, row.product, row.farmer].some((v) => v.toLowerCase().includes(query));
      const matchFilter = state.filter === "all" ? true : row.status === state.filter;
      return matchText && matchFilter;
    });

    rows.sort((a, b) => {
      if (state.sort === "days-asc") return a.days - b.days;
      if (state.sort === "batch-asc") return a.id.localeCompare(b.id);
      return b.risk - a.risk;
    });

    return rows;
  }

  function renderTable() {
    const rows = filteredRows();
    els.forecastBody.innerHTML = "";

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Batch ID"><strong>${row.id}</strong></td>
        <td data-label="Product">${row.product}</td>
        <td data-label="Farmer">${row.farmer}</td>
        <td data-label="Risk Score">${row.risk}</td>
        <td data-label="Current Status"><span class="status-pill ${row.status}">${statusLabel(row.status)}</span></td>
        <td data-label="Days Before Spoilage">${daysLabel(row.days, row.status)}</td>
      `;
      els.forecastBody.appendChild(tr);
    });
  }

  function renderTrend() {
    const startX = 40;
    const endX = 820;
    const step = (endX - startX) / (riskTrend.length - 1);
    const maxY = 220;

    const points = riskTrend.map((value, idx) => {
      const x = startX + step * idx;
      const y = maxY - ((value - 40) / 60) * 170;
      return { x, y };
    });

    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y}`;
    }

    els.trendPath.setAttribute("d", d);
    els.trendArea.setAttribute("d", `${d} L${points[points.length - 1].x},220 L${points[0].x},220 Z`);
  }

  function bindEvents() {
    els.riskSearch.addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      renderTable();
    });

    els.riskSort.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderTable();
    });

    els.filterGroup.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      state.filter = btn.dataset.filter;
      [...els.filterGroup.querySelectorAll("button")].forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      renderTable();
    });

  }

  function init() {
    bindEvents();
    renderTable();
    renderTrend();
  }

  init();
})();
