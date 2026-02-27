(function () {
  var DB_KEY = "warehouseUnifiedDB";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function defaultDb() {
    return {
      version: 2,
      climateSnapshot: null,
      batchTracking: {
        batches: [],
        movementTabs: {}
      },
      settings: null,
      updatedAt: Date.now()
    };
  }

  function mergeDb(base, extra) {
    var next = Object.assign({}, base, extra || {});
    next.batchTracking = Object.assign({}, base.batchTracking, (extra && extra.batchTracking) || {});
    if (!next.settings && base.settings) next.settings = base.settings;
    return next;
  }

  function loadLocal() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultDb();
      var parsed = JSON.parse(raw);
      return mergeDb(defaultDb(), parsed);
    } catch (error) {
      return defaultDb();
    }
  }

  var cache = loadLocal();
  var readyResolve;
  var readyPromise = new Promise(function (resolve) {
    readyResolve = resolve;
  });
  var initialized = false;
  var syncEnabled = true;
  var userId = null;

  function saveLocal(db) {
    cache = mergeDb(defaultDb(), db || cache);
    cache.updatedAt = Date.now();
    localStorage.setItem(DB_KEY, JSON.stringify(cache));
    return cache;
  }

  function canUseApi() {
    return Boolean(window.AgriApi && window.AgriApi.getAppState && window.AgriApi.upsertAppState);
  }

  async function resolveUserId() {
    if (userId) return userId;

    try {
      var raw = localStorage.getItem("warehouseAuthUser");
      var parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.userId) {
        userId = parsed.userId;
        return userId;
      }
    } catch (error) {
      // ignore
    }

    if (canUseApi() && window.AgriApi.getWarehouseUserId) {
      var apiUserId = window.AgriApi.getWarehouseUserId();
      if (apiUserId) {
        userId = apiUserId;
        return userId;
      }
    }
    return null;
  }

  function toApiState(db) {
    return {
      climateSnapshot: db.climateSnapshot || null,
      batchTracking: db.batchTracking || { batches: [], movementTabs: {} },
      settings: db.settings || null
    };
  }

  async function pullRemote() {
    var uid = await resolveUserId();
    if (!uid) return cache;

    if (canUseApi()) {
      try {
        var apiRes = await window.AgriApi.getAppState(uid);
        var apiData = apiRes && apiRes.data ? apiRes.data : null;
        if (!apiData) {
          await window.AgriApi.upsertAppState(uid, toApiState(cache));
          return cache;
        }
        var remoteFromApi = {
          version: 2,
          climateSnapshot: apiData.climateSnapshot || null,
          batchTracking: apiData.batchTracking || { batches: [], movementTabs: {} },
          settings: apiData.settings || null,
          updatedAt: apiData.updatedAt ? new Date(apiData.updatedAt).getTime() : Date.now()
        };
        saveLocal(mergeDb(cache, remoteFromApi));
        return cache;
      } catch (error) {
        syncEnabled = false;
      }
    }
    return cache;
  }

  async function pushRemote() {
    if (!syncEnabled) return;
    var uid = await resolveUserId();
    if (!uid) return;

    if (canUseApi()) {
      try {
        await window.AgriApi.upsertAppState(uid, toApiState(cache));
        return;
      } catch (error) {
        syncEnabled = false;
      }
    }
  }

  async function listBatches(query) {
    if (!canUseApi()) return null;
    try {
      var res = await window.AgriApi.listBatches(query || {}, { silent: true });
      return res && Array.isArray(res.data) ? res.data : null;
    } catch (error) {
      return null;
    }
  }

  async function init() {
    if (initialized) return cache;
    initialized = true;
    await pullRemote();
    readyResolve(cache);
    return cache;
  }

  function get(path) {
    return path ? cache[path] : cache;
  }

  async function getAsync(path) {
    await init();
    return get(path);
  }

  function set(path, value) {
    cache[path] = value;
    saveLocal(cache);
    pushRemote();
    return cache;
  }

  async function setAsync(path, value) {
    set(path, value);
    await pushRemote();
    return cache;
  }

  function merge(path, patch) {
    var current = cache[path] && typeof cache[path] === "object" ? cache[path] : {};
    cache[path] = Object.assign({}, current, patch);
    saveLocal(cache);
    pushRemote();
    return cache;
  }

  async function mergeAsync(path, patch) {
    merge(path, patch);
    await pushRemote();
    return cache;
  }

  function ensure(path, value) {
    if (cache[path] == null || (typeof cache[path] === "object" && Object.keys(cache[path]).length === 0)) {
      cache[path] = clone(value);
      saveLocal(cache);
      pushRemote();
    }
    return cache[path];
  }

  async function ensureAsync(path, value) {
    await init();
    return ensure(path, value);
  }

  window.WarehouseDB = {
    key: DB_KEY,
    ready: readyPromise,
    init: init,
    load: function () {
      return cache;
    },
    save: function (db) {
      saveLocal(db);
      pushRemote();
      return cache;
    },
    get: get,
    getAsync: getAsync,
    set: set,
    setAsync: setAsync,
    merge: merge,
    mergeAsync: mergeAsync,
    ensure: ensure,
    ensureAsync: ensureAsync,
    refresh: pullRemote,
    listBatches: listBatches
  };

  init();
})();
