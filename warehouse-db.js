(function () {
  const DB_KEY = "warehouseUnifiedDB";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function defaultDb() {
    return {
      version: 1,
      climateSnapshot: null,
      batchTracking: {
        batches: [],
        movementTabs: {}
      },
      updatedAt: Date.now()
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultDb();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultDb(), parsed);
    } catch (error) {
      return defaultDb();
    }
  }

  function save(db) {
    const next = Object.assign({}, db, { updatedAt: Date.now() });
    localStorage.setItem(DB_KEY, JSON.stringify(next));
    return next;
  }

  function get(path) {
    const db = load();
    return path ? db[path] : db;
  }

  function set(path, value) {
    const db = load();
    db[path] = value;
    return save(db);
  }

  function merge(path, patch) {
    const db = load();
    const current = db[path] && typeof db[path] === "object" ? db[path] : {};
    db[path] = Object.assign({}, current, patch);
    return save(db);
  }

  function ensure(path, value) {
    const db = load();
    if (db[path] == null || (typeof db[path] === "object" && Object.keys(db[path]).length === 0)) {
      db[path] = clone(value);
      save(db);
    }
    return db[path];
  }

  window.WarehouseDB = {
    key: DB_KEY,
    load: load,
    save: save,
    get: get,
    set: set,
    merge: merge,
    ensure: ensure
  };
})();
