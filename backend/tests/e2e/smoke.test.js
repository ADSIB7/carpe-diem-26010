const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { createApp } = require("../../app");
const supabaseLib = require("../../lib/supabase");
const { createMockSupabase } = require("../helpers/mockSupabase");

test("E2E smoke: login -> create warehouse -> fetch warehouse", async () => {
  const mock = createMockSupabase();
  supabaseLib.getSupabase = () => mock;

  const app = createApp({ enableTestLoginRoute: true });
  const userId = "00000000-0000-0000-0000-000000000001";

  const loginRes = await request(app).post("/test/login").send({ userId });
  assert.equal(loginRes.status, 200);
  const token = loginRes.body.access_token;
  assert.ok(token);

  const createRes = await request(app)
    .post("/api/warehouses")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Smoke Warehouse",
      location: "Test City",
      managerName: "Smoke Admin",
      capacityTons: 100,
      currentStockTons: 20
    });

  assert.equal(createRes.status, 201);
  assert.ok(createRes.body.data.id);

  const warehouseId = createRes.body.data.id;
  const fetchRes = await request(app)
    .get(`/api/warehouses/${warehouseId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(fetchRes.status, 200);
  assert.equal(fetchRes.body.data.name, "Smoke Warehouse");
  assert.equal(fetchRes.body.data.location, "Test City");
});

