const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { createApp } = require("../../app");
const supabaseLib = require("../../lib/supabase");
const { createMockSupabase } = require("../helpers/mockSupabase");

function testAuth(req, res, next) {
  const raw = req.headers.authorization || "";
  if (!raw.toLowerCase().startsWith("bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = raw.slice(7).trim();
  if (!token.startsWith("test-token:")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  req.user = { id: token.split(":")[1], email: "test@example.com", role: "authenticated" };
  return next();
}

test("GET /api/warehouses returns only owner rows", async () => {
  const mock = createMockSupabase({
    warehouses: [
      {
        id: "w1",
        owner_user_id: "u1",
        name: "Owner 1",
        location: "L1",
        manager_name: "M1",
        capacity_tons: 10,
        current_stock_tons: 5,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "w2",
        owner_user_id: "u2",
        name: "Owner 2",
        location: "L2",
        manager_name: "M2",
        capacity_tons: 20,
        current_stock_tons: 12,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z"
      }
    ]
  });

  supabaseLib.getSupabase = () => mock;
  const app = createApp({ requireAuth: testAuth });

  const res = await request(app)
    .get("/api/warehouses")
    .set("Authorization", "Bearer test-token:u1");

  assert.equal(res.status, 200);
  assert.equal(res.body.count, 1);
  assert.equal(res.body.data[0].id, "w1");
});

test("POST /api/warehouses validates payload", async () => {
  const mock = createMockSupabase();
  supabaseLib.getSupabase = () => mock;
  const app = createApp({ requireAuth: testAuth });

  const res = await request(app)
    .post("/api/warehouses")
    .set("Authorization", "Bearer test-token:u1")
    .send({ location: "Missing name" });

  assert.equal(res.status, 400);
  assert.equal(res.body.error, "Validation failed");
});

