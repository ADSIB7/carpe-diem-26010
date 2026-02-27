function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

class Query {
  constructor(table, db) {
    this.table = table;
    this.db = db;
    this.filters = [];
    this.mode = "select";
    this.payload = null;
    this.sortBy = null;
    this.onConflict = null;
  }

  select() {
    return this;
  }

  eq(column, value) {
    this.filters.push((row) => String(row[column]) === String(value));
    return this;
  }

  ilike(column, pattern) {
    const part = String(pattern || "").replace(/%/g, "").toLowerCase();
    this.filters.push((row) => String(row[column] || "").toLowerCase().includes(part));
    return this;
  }

  or(expression) {
    const match = String(expression || "").match(/\.ilike\.%(.*)%/);
    const text = match ? String(match[1]).toLowerCase() : "";
    this.filters.push((row) => {
      if (!text) return true;
      return ["name", "location", "manager_name"].some((field) =>
        String(row[field] || "").toLowerCase().includes(text)
      );
    });
    return this;
  }

  insert(payload) {
    this.mode = "insert";
    this.payload = asArray(payload);
    return this;
  }

  update(payload) {
    this.mode = "update";
    this.payload = payload || {};
    return this;
  }

  upsert(payload, options) {
    this.mode = "upsert";
    this.payload = payload || {};
    this.onConflict = options && options.onConflict ? options.onConflict : "id";
    return this;
  }

  delete() {
    this.mode = "delete";
    return this;
  }

  order(column, options) {
    this.sortBy = { column, ascending: !options || options.ascending !== false };
    return this.execList();
  }

  maybeSingle() {
    return this.execSingle(false);
  }

  single() {
    return this.execSingle(true);
  }

  rows() {
    return asArray(this.db[this.table]);
  }

  filtered() {
    return this.rows().filter((row) => this.filters.every((fn) => fn(row)));
  }

  execList() {
    let rows = clone(this.filtered());
    if (this.sortBy) {
      const col = this.sortBy.column;
      const dir = this.sortBy.ascending ? 1 : -1;
      rows.sort((a, b) => (a[col] > b[col] ? dir : a[col] < b[col] ? -dir : 0));
    }
    return Promise.resolve({ data: rows, error: null });
  }

  execSingle(required) {
    if (this.mode === "insert") {
      const toInsert = this.payload.map((p) => clone(p));
      this.db[this.table] = this.rows().concat(toInsert);
      const row = toInsert[0] || null;
      return Promise.resolve({ data: row, error: required && !row ? { message: "Not found" } : null });
    }

    if (this.mode === "update") {
      const matches = this.filtered();
      matches.forEach((row) => Object.assign(row, clone(this.payload)));
      const row = matches[0] || null;
      return Promise.resolve({ data: row, error: required && !row ? { message: "Not found" } : null });
    }

    if (this.mode === "upsert") {
      const key = this.onConflict || "id";
      const existing = this.rows().find((row) => String(row[key]) === String(this.payload[key]));
      if (existing) {
        Object.assign(existing, clone(this.payload));
      } else {
        this.rows().push(clone(this.payload));
      }
      const row = this.rows().find((r) => String(r[key]) === String(this.payload[key])) || null;
      return Promise.resolve({ data: row, error: null });
    }

    if (this.mode === "delete") {
      const keep = [];
      const removed = [];
      this.rows().forEach((row) => {
        if (this.filters.every((fn) => fn(row))) removed.push(row);
        else keep.push(row);
      });
      this.db[this.table] = keep;
      const row = removed[0] || null;
      return Promise.resolve({ data: row ? [{ id: row.id }] : [], error: null });
    }

    const matches = this.filtered();
    const row = matches[0] || null;
    return Promise.resolve({ data: row, error: required && !row ? { message: "Not found" } : null });
  }
}

function createMockSupabase(seed) {
  const db = {
    warehouses: [],
    storage_zones: [],
    batches: [],
    warehouse_app_state: [],
    ...(seed || {})
  };

  return {
    __db: db,
    auth: {
      async getUser(token) {
        if (!token || !String(token).startsWith("test-token:")) {
          return { data: null, error: { message: "invalid token" } };
        }
        const userId = String(token).split(":")[1];
        return { data: { user: { id: userId, email: "test@example.com", role: "authenticated" } }, error: null };
      }
    },
    from(table) {
      return new Query(table, db);
    }
  };
}

module.exports = { createMockSupabase };
