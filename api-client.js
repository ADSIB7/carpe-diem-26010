(function () {
  /** @typedef {{ error: string, status: number, details?: unknown }} ApiError */
  /** @typedef {{ id: string, name: string, location: string, managerName?: string|null, capacityTons: number, currentStockTons: number, createdAt: string, updatedAt: string }} Warehouse */
  /** @typedef {{ id: string, warehouseId: string, zoneCode: string, state: string, capacityTons: number, occupiedTons: number, utilizationPercent: number, updatedAt: string }} StorageZone */
  /** @typedef {{ id: string, warehouseId: string, productName: string, farmerName: string, quantityTons: number, zoneCode: string, status: string, entryDate: string, expiryDate: string, createdAt: string, updatedAt: string, daysToExpiry: number, spoilageRisk: string }} Batch */

  var base = window.API_BASE_URL || "http://localhost:5000/api";
  var supabaseClient = null;
  var toastHost = null;

  var RETRYABLE_STATUS = { 408: true, 429: true, 500: true, 502: true, 503: true, 504: true };

  function ensureToastHost() {
    if (toastHost) return toastHost;
    toastHost = document.getElementById("agriApiToasts");
    if (toastHost) return toastHost;

    toastHost = document.createElement("div");
    toastHost.id = "agriApiToasts";
    toastHost.style.position = "fixed";
    toastHost.style.right = "16px";
    toastHost.style.bottom = "16px";
    toastHost.style.display = "grid";
    toastHost.style.gap = "8px";
    toastHost.style.zIndex = "9999";
    document.body.appendChild(toastHost);
    return toastHost;
  }

  function showToast(message, kind, timeout) {
    if (!message || typeof document === "undefined") return;

    var host = ensureToastHost();
    var node = document.createElement("div");
    var bg = "#1f2937";
    if (kind === "success") bg = "#166534";
    if (kind === "error") bg = "#991b1b";
    if (kind === "info") bg = "#1e3a8a";

    node.textContent = String(message);
    node.style.background = bg;
    node.style.color = "#ffffff";
    node.style.padding = "10px 12px";
    node.style.borderRadius = "10px";
    node.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
    node.style.font = "600 12px/1.4 Manrope, sans-serif";
    node.style.maxWidth = "300px";
    node.style.opacity = "0";
    node.style.transform = "translateY(8px)";
    node.style.transition = "opacity 180ms ease, transform 180ms ease";

    host.appendChild(node);
    requestAnimationFrame(function () {
      node.style.opacity = "1";
      node.style.transform = "translateY(0)";
    });

    setTimeout(function () {
      node.style.opacity = "0";
      node.style.transform = "translateY(8px)";
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 200);
    }, typeof timeout === "number" ? timeout : 3000);
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    if (!window.AgriSupabase || !window.AgriSupabase.getClient) return null;
    try {
      supabaseClient = window.AgriSupabase.getClient();
      return supabaseClient;
    } catch (_error) {
      return null;
    }
  }

  async function getAccessToken() {
    var client = getSupabaseClient();
    if (!client) return null;
    try {
      var sessionRes = await client.auth.getSession();
      var token = sessionRes && sessionRes.data && sessionRes.data.session
        ? sessionRes.data.session.access_token
        : null;
      return token || null;
    } catch (_error) {
      return null;
    }
  }

  function toApiError(status, payload, fallbackText) {
    var message = payload && (payload.error || payload.message)
      ? (payload.error || payload.message)
      : fallbackText;
    return {
      error: String(message || "Request failed"),
      status: Number(status || 0),
      details: payload && payload.details ? payload.details : null
    };
  }

  function withQuery(path, query) {
    if (!query) return path;
    var params = new URLSearchParams(query);
    var qs = params.toString();
    return qs ? path + "?" + qs : path;
  }

  /**
   * @param {string} path
   * @param {{ method?: string, body?: unknown, headers?: Record<string,string>, retry?: number, silent?: boolean, successMessage?: string }} [options]
   * @returns {Promise<any>}
   */
  async function request(path, options) {
    var opts = options || {};
    var method = (opts.method || "GET").toUpperCase();
    var retries = typeof opts.retry === "number" ? opts.retry : (method === "GET" ? 2 : 1);
    var attempt = 0;

    while (true) {
      attempt += 1;
      try {
        var token = await getAccessToken();
        var headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
        if (token) headers.Authorization = "Bearer " + token;

        var response = await fetch(base + path, {
          method: method,
          headers: headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
        });

        var raw = await response.text();
        var data = raw ? JSON.parse(raw) : null;

        if (!response.ok) {
          var apiErr = toApiError(response.status, data, "Request failed: " + response.status);
          var retryable = !!RETRYABLE_STATUS[response.status];
          if (retryable && attempt <= retries) {
            await delay(250 * attempt + Math.floor(Math.random() * 100));
            continue;
          }
          if (!opts.silent) showToast(apiErr.error, "error");
          throw apiErr;
        }

        if (opts.successMessage) showToast(opts.successMessage, "success");
        return data;
      } catch (error) {
        var networkError = !error || typeof error.status !== "number";
        if (networkError && attempt <= retries) {
          await delay(250 * attempt + Math.floor(Math.random() * 100));
          continue;
        }

        if (networkError) {
          var finalError = toApiError(0, null, "Network error. Check backend/API availability.");
          if (!opts.silent) showToast(finalError.error, "error");
          throw finalError;
        }

        throw error;
      }
    }
  }

  function getWarehouseUserId() {
    try {
      var raw = localStorage.getItem("warehouseAuthUser");
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.userId ? parsed.userId : null;
    } catch (_error) {
      return null;
    }
  }

  /** @type {{
   * listWarehouses: (query?: Record<string,string|number>) => Promise<{count:number,data:Warehouse[]}>,
   * createWarehouse: (payload: Partial<Warehouse>, options?: {silent?:boolean}) => Promise<{data:Warehouse}>,
   * listStorage: (query?: Record<string,string|number>) => Promise<{count:number,data:StorageZone[]}>,
   * listBatches: (query?: Record<string,string|number>, options?: {silent?:boolean}) => Promise<{count:number,data:Batch[]}>,
   * seedBatches: (count?: number, options?: {silent?:boolean}) => Promise<any>,
   * getClimateConfig: () => Promise<any>,
   * getClimateLiveData: () => Promise<any>,
   * getStorageCapacityData: () => Promise<any>,
   * getRiskSpoilageData: () => Promise<any>,
   * getMarketIntelligenceData: () => Promise<any>,
   * getDashboardData: () => Promise<any>,
   * getAppState: (userId: string) => Promise<any>,
   * upsertAppState: (userId: string, state: any, options?: {silent?:boolean}) => Promise<any>,
   * getWarehouseUserId: () => string|null,
   * toast: { success: (message:string) => void, error: (message:string) => void, info: (message:string) => void }
   * }} */
  var api = {
    listWarehouses: function (query) {
      return request(withQuery("/warehouses", query), { method: "GET" });
    },
    createWarehouse: function (payload, options) {
      return request("/warehouses", {
        method: "POST",
        body: payload,
        silent: !!(options && options.silent),
        successMessage: "Warehouse created"
      });
    },
    listStorage: function (query) {
      return request(withQuery("/storage", query), { method: "GET" });
    },
    listBatches: function (query, options) {
      return request(withQuery("/batches", query), {
        method: "GET",
        silent: !!(options && options.silent)
      });
    },
    seedBatches: function (count, options) {
      return request("/batches/seed", {
        method: "POST",
        body: { count: typeof count === "number" ? count : 10 },
        silent: !!(options && options.silent),
        successMessage: "Batches generated"
      });
    },
    getClimateConfig: function () {
      return request("/ui-data/climate-config", { method: "GET", silent: true });
    },
    getClimateLiveData: function () {
      return request("/ui-data/climate-live", { method: "GET", silent: true });
    },
    getStorageCapacityData: function () {
      return request("/ui-data/storage-capacity", { method: "GET", silent: true });
    },
    getRiskSpoilageData: function () {
      return request("/ui-data/risk-spoilage", { method: "GET", silent: true });
    },
    getMarketIntelligenceData: function () {
      return request("/ui-data/market-intelligence", { method: "GET", silent: true });
    },
    getDashboardData: function () {
      return request("/ui-data/dashboard", { method: "GET", silent: true });
    },
    getAppState: function (userId) {
      return request("/app-state/" + encodeURIComponent(userId), { method: "GET", silent: true });
    },
    upsertAppState: function (userId, state, options) {
      return request("/app-state/" + encodeURIComponent(userId), {
        method: "PUT",
        body: state,
        silent: !!(options && options.silent)
      });
    },
    getWarehouseUserId: getWarehouseUserId,
    toast: {
      success: function (message) { showToast(message, "success"); },
      error: function (message) { showToast(message, "error"); },
      info: function (message) { showToast(message, "info"); }
    }
  };

  window.AgriApi = api;
})();
