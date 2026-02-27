const test = require("node:test");
const assert = require("node:assert/strict");

const { toNumber, validateWarehouse } = require("../../validation/warehouseValidation");

test("toNumber parses numeric values and rejects invalids", () => {
  assert.equal(toNumber("12.5"), 12.5);
  assert.equal(toNumber(""), null);
  assert.equal(Number.isNaN(toNumber("abc")), true);
});

test("validateWarehouse enforces required fields on create", () => {
  const errors = validateWarehouse({ location: "Loc" }, false);
  assert.equal(errors.includes("name is required"), true);
});

test("validateWarehouse enforces numeric bounds", () => {
  const errors = validateWarehouse(
    { name: "Warehouse", location: "Loc", capacityTons: -5, currentStockTons: -1 },
    false
  );
  assert.equal(errors.includes("capacityTons must be a non-negative number"), true);
  assert.equal(errors.includes("currentStockTons must be a non-negative number"), true);
});

