function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function validateWarehouse(payload, isPatch) {
  const errors = [];
  const required = ["name", "location"];

  if (!isPatch) {
    required.forEach((field) => {
      if (!payload[field]) errors.push(`${field} is required`);
    });
  }

  if (payload.name !== undefined && String(payload.name).trim().length < 2) {
    errors.push("name must be at least 2 characters");
  }

  if (payload.capacityTons !== undefined) {
    const capacity = toNumber(payload.capacityTons);
    if (Number.isNaN(capacity) || capacity < 0) {
      errors.push("capacityTons must be a non-negative number");
    }
  }

  if (payload.currentStockTons !== undefined) {
    const stock = toNumber(payload.currentStockTons);
    if (Number.isNaN(stock) || stock < 0) {
      errors.push("currentStockTons must be a non-negative number");
    }
  }

  return errors;
}

module.exports = { toNumber, validateWarehouse };

