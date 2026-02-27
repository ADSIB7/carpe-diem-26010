(() => {
  const dayMs = 24 * 60 * 60 * 1000;

  const toDate = (offset) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const formatDate = (date) =>
    date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const batches = [
    { id: "#A102", emoji: "&#127813;", product: "Tomatoes", farmer: "Rajesh Verma", quantity: "2.1 tons", zone: "A1", entryDate: toDate(-16), expiryDate: toDate(11), inTransit: false, movements: ["A1 -> A2 | 10:10 AM", "A2 -> A1 | 1:22 PM"] },
    { id: "#B203", emoji: "&#129388;", product: "Spinach", farmer: "Sunita Patil", quantity: "1.0 tons", zone: "B2", entryDate: toDate(-12), expiryDate: toDate(7), inTransit: false, movements: ["B1 -> B2 | 09:45 AM"] },
    { id: "#C306", emoji: "&#129389;", product: "Mangoes", farmer: "Deepak Joshi", quantity: "900 kg", zone: "C3", entryDate: toDate(-10), expiryDate: toDate(2), inTransit: false, movements: ["C1 -> C3 | 11:30 AM", "C3 -> C2 | 02:15 PM"] },
    { id: "#D410", emoji: "&#127818;", product: "Oranges", farmer: "Anil Rao", quantity: "2.5 tons", zone: "A4", entryDate: toDate(-14), expiryDate: toDate(13), inTransit: false, movements: ["A3 -> A4 | 07:20 AM"] },
    { id: "#E511", emoji: "&#129365;", product: "Carrots", farmer: "Manish Yadav", quantity: "2.0 tons", zone: "B1", entryDate: toDate(-15), expiryDate: toDate(9), inTransit: false, movements: ["B2 -> B1 | 04:08 PM"] },
    { id: "#F102", emoji: "&#127822;", product: "Apples", farmer: "Neha Sharma", quantity: "1.5 tons", zone: "D2", entryDate: toDate(-7), expiryDate: toDate(4), inTransit: true, movements: ["D1 -> D2 | 06:05 PM", "D2 -> Dispatch | 08:40 PM"] },
    { id: "#G720", emoji: "&#127815;", product: "Grapes", farmer: "Aditi Kale", quantity: "1.2 tons", zone: "C2", entryDate: toDate(-6), expiryDate: toDate(-1), inTransit: true, movements: ["C2 -> QA Bay | 03:12 PM"] }
  ];

  const movementTabs = {
    recent: [
      { id: "#B203", from: "A2", to: "B2", time: "6:45 PM", by: "Shailesh Girnare" },
      { id: "#D410", from: "C2", to: "D1", time: "11:30 AM", by: "Neha Sharma" },
      { id: "#F102", from: "C2", to: "D1", time: "11:30 AM", by: "Neha Sharma" }
    ],
    incoming: [
      { id: "#J998", from: "Gate 2", to: "A3", time: "9:10 AM", by: "Ops Team" },
      { id: "#K142", from: "Dock 1", to: "B1", time: "10:55 AM", by: "R. Patil" }
    ],
    outgoing: [
      { id: "#G720", from: "C2", to: "Dispatch", time: "2:20 PM", by: "Transport Team" },
      { id: "#F102", from: "D2", to: "Dispatch", time: "3:40 PM", by: "M. Rao" }
    ]
  };

  const state = {
    activeTab: "recent",
    search: "",
    filter: "all",
    sort: "expiry-asc"
  };

  const els = {
    liveClock: document.getElementById("liveClock"),
    themeToggle: document.getElementById("themeToggle"),
    search: document.getElementById("tableSearch"),
    statusFilter: document.getElementById("statusFilter"),
    sortFilter: document.getElementById("sortFilter"),
    tableBody: document.getElementById("batchTableBody"),
    timelineRows: document.getElementById("timelineRows"),
    movementBody: document.getElementById("movementBody"),
    tabs: Array.from(document.querySelectorAll(".tab")),
    modal: document.getElementById("batchModal"),
    modalContent: document.getElementById("modalContent"),
    closeModal: document.getElementById("closeModal"),
    totalActive: document.getElementById("totalActive"),
    totalFresh: document.getElementById("totalFresh"),
    totalWarning: document.getElementById("totalWarning"),
    totalCritical: document.getElementById("totalCritical"),
    totalTransit: document.getElementById("totalTransit"),
    profileToggle: document.getElementById("profileToggle"),
    profileMenu: document.getElementById("profileMenu"),
    menuBtn: document.getElementById("menuBtn"),
    sidebar: document.getElementById("sidebar")
  };

  const daysLeft = (expiryDate) => {
    const d = new Date(expiryDate);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - now.getTime()) / dayMs);
  };

  const statusFromDays = (days) => {
    if (days < 5) return "critical";
    if (days <= 10) return "warning";
    return "fresh";
  };

  const fmtDays = (days) => `${days} day${Math.abs(days) === 1 ? "" : "s"}`;

  function getFilteredRows() {
    const q = state.search.toLowerCase();

    let rows = batches.filter((b) => {
      const dLeft = daysLeft(b.expiryDate);
      const s = statusFromDays(dLeft);
      const matchesSearch = [b.id, b.product, b.farmer].some((v) => v.toLowerCase().includes(q));
      const matchesFilter = state.filter === "all" ? true : s === state.filter;
      return matchesSearch && matchesFilter;
    });

    rows = rows.sort((a, b) => {
      const da = new Date(a.expiryDate).getTime();
      const db = new Date(b.expiryDate).getTime();
      return state.sort === "expiry-desc" ? db - da : da - db;
    });

    return rows;
  }

  function renderSummary() {
    const counts = { fresh: 0, warning: 0, critical: 0 };
    batches.forEach((b) => {
      const s = statusFromDays(daysLeft(b.expiryDate));
      counts[s] += 1;
    });

    els.totalActive.textContent = String(batches.length);
    els.totalFresh.textContent = String(counts.fresh);
    els.totalWarning.textContent = String(counts.warning);
    els.totalCritical.textContent = String(counts.critical);
    els.totalTransit.textContent = String(batches.filter((b) => b.inTransit).length);
  }

  function renderTable() {
    const rows = getFilteredRows();
    els.tableBody.innerHTML = "";

    rows.forEach((b) => {
      const dLeft = daysLeft(b.expiryDate);
      const status = statusFromDays(dLeft);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${b.emoji} ${b.product}</td>
        <td>${b.farmer}</td>
        <td>${b.quantity}</td>
        <td><strong>${b.zone}</strong></td>
        <td>${formatDate(new Date(b.entryDate))}</td>
        <td><strong>${formatDate(new Date(b.expiryDate))}</strong></td>
        <td>${fmtDays(dLeft)}</td>
        <td><span class="status ${status}">${status === "fresh" ? "Fresh" : status === "warning" ? "Warning" : "Critical"}</span></td>
        <td>
          <div class="action-group">
            <button class="btn btn-view" data-view="${b.id}">View</button>
            <button class="btn btn-update">Update</button>
          </div>
        </td>
      `;
      els.tableBody.appendChild(tr);
    });
  }

  function renderTimeline() {
    const sorted = [...batches]
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
      .slice(0, 3);

    els.timelineRows.innerHTML = "";

    sorted.forEach((b) => {
      const dLeft = daysLeft(b.expiryDate);
      const status = statusFromDays(dLeft);
      const width = Math.max(6, Math.min(100, ((dLeft + 3) / 20) * 100));

      const row = document.createElement("div");
      row.className = "timeline-row";
      row.innerHTML = `
        <div class="timeline-head">
          <strong>Batch ${b.id}</strong>
          <span>${fmtDays(dLeft)} remaining</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar ${status}" style="width: ${width}%"></div>
        </div>
      `;
      els.timelineRows.appendChild(row);
    });
  }

  function renderMovement() {
    const rows = movementTabs[state.activeTab];
    els.movementBody.innerHTML = "";

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${row.id}</strong></td>
        <td>${row.from}</td>
        <td><span class="zone-arrow">&rarr; ${row.to}</span></td>
        <td>${row.time}</td>
        <td>${row.by}</td>
      `;
      els.movementBody.appendChild(tr);
    });
  }

  function openModal(batchId) {
    const b = batches.find((x) => x.id === batchId);
    if (!b) return;

    const dLeft = daysLeft(b.expiryDate);
    const status = statusFromDays(dLeft);

    els.modalContent.innerHTML = `
      <div class="modal-grid">
        <div class="modal-block">
          <h4>Batch Details</h4>
          <p><strong>Batch ID:</strong> ${b.id}</p>
          <p><strong>Product:</strong> ${b.emoji} ${b.product}</p>
          <p><strong>Quantity:</strong> ${b.quantity}</p>
          <p><strong>Status:</strong> <span class="status ${status}">${status === "fresh" ? "Fresh" : status === "warning" ? "Warning" : "Critical"}</span></p>
        </div>
        <div class="modal-block">
          <h4>Farmer & Storage</h4>
          <p><strong>Farmer:</strong> ${b.farmer}</p>
          <p><strong>Storage Zone:</strong> ${b.zone}</p>
          <p><strong>Entry Date:</strong> ${formatDate(new Date(b.entryDate))}</p>
          <p><strong>Expiry Date:</strong> ${formatDate(new Date(b.expiryDate))}</p>
        </div>
      </div>
      <div class="modal-block">
        <h4>Temperature Exposure</h4>
        <div class="temp-graph"></div>
      </div>
      <div class="modal-block">
        <h4>Movement History Timeline</h4>
        <ul class="vertical-timeline">
          ${b.movements.map((m) => `<li>${m}</li>`).join("")}
        </ul>
      </div>
    `;

    els.modal.classList.add("open");
    els.modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    els.modal.classList.remove("open");
    els.modal.setAttribute("aria-hidden", "true");
  }

  function updateClock() {
    els.liveClock.textContent = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("dark-mode", isDark);
    els.themeToggle.textContent = isDark ? "Light" : "Dark";
  }

  function bindEvents() {
    els.search.addEventListener("input", (e) => {
      state.search = e.target.value.trim();
      renderTable();
    });

    els.statusFilter.addEventListener("change", (e) => {
      state.filter = e.target.value;
      renderTable();
    });

    els.sortFilter.addEventListener("change", (e) => {
      state.sort = e.target.value;
      renderTable();
    });

    els.tableBody.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-view");
      if (id) openModal(id);
    });

    els.tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        state.activeTab = tab.dataset.tab;
        els.tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        renderMovement();
      });
    });

    els.closeModal.addEventListener("click", closeModal);

    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    els.themeToggle.addEventListener("click", () => {
      const next = document.body.classList.contains("dark") || document.body.classList.contains("dark-mode") ? "light" : "dark";
      localStorage.setItem("batch-theme", next);
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

  function init() {
    const saved = localStorage.getItem("batch-theme") || (document.body.classList.contains("dark") || document.body.classList.contains("dark-mode") ? "dark" : "light");
    applyTheme(saved);
    bindEvents();
    renderSummary();
    renderTable();
    renderTimeline();
    renderMovement();
    updateClock();
    setInterval(updateClock, 1000);
  }

  init();
})();
