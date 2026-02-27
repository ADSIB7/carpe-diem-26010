(function () {
  const warehouses = [
    {
      name: "Warehouse A",
      location: "Nashik, MH",
      commodity: "Onion",
      quantityStoredTons: 48,
      totalCapacityTons: 60
    },
    {
      name: "Warehouse B",
      location: "Ludhiana, PB",
      commodity: "Wheat",
      quantityStoredTons: 37,
      totalCapacityTons: 50
    },
    {
      name: "Warehouse C",
      location: "Kurnool, AP",
      commodity: "Rice",
      quantityStoredTons: 40,
      totalCapacityTons: 70
    }
  ];

  const rowsHost = document.getElementById("capacityRows");
  const barsHost = document.getElementById("capacityBars");

  function statusFromPercent(usedPercent) {
    if (usedPercent >= 90) {
      return { label: "Almost Full", cls: "full" };
    }
    if (usedPercent >= 75) {
      return { label: "Almost Full", cls: "almost" };
    }
    return { label: "Normal", cls: "normal" };
  }

  function render() {
    let totalStored = 0;
    let totalCapacity = 0;

    rowsHost.innerHTML = "";
    barsHost.innerHTML = "";

    warehouses.forEach(function (w) {
      const usedPercent = Math.round((w.quantityStoredTons / w.totalCapacityTons) * 100);
      const status = statusFromPercent(usedPercent);

      totalStored += w.quantityStoredTons;
      totalCapacity += w.totalCapacityTons;

      const row = document.createElement("tr");
      row.innerHTML = ""
        + "<td>" + w.name + "</td>"
        + "<td>" + w.location + "</td>"
        + "<td>" + w.commodity + "</td>"
        + "<td>" + w.quantityStoredTons + " Tons</td>"
        + "<td>" + w.totalCapacityTons + " Tons</td>"
        + "<td>" + usedPercent + "%</td>"
        + "<td><span class='badge " + status.cls + "'>" + status.label + "</span></td>";
      rowsHost.appendChild(row);

      const barRow = document.createElement("div");
      barRow.className = "bar-row";
      barRow.innerHTML = ""
        + "<strong>" + w.name + "</strong>"
        + "<div class='track'><span class='fill " + status.cls + "' style='width:" + usedPercent + "%'></span></div>"
        + "<span>" + usedPercent + "%</span>";
      barsHost.appendChild(barRow);
    });

    const totalUsedPercent = totalCapacity ? Math.round((totalStored / totalCapacity) * 100) : 0;
    const available = Math.max(0, totalCapacity - totalStored);

    document.getElementById("totalPurchased").textContent = totalStored + " Tons";
    document.getElementById("totalPurchasedMeta").textContent = "Across " + warehouses.length + " Warehouses";

    document.getElementById("usedCapacity").textContent = totalUsedPercent + "%";
    document.getElementById("usedCapacityBar").style.width = totalUsedPercent + "%";
    document.getElementById("usedCapacityMeta").textContent = totalStored + " of " + totalCapacity + " Tons used";

    document.getElementById("availableCapacity").textContent = available + " Tons";
    document.getElementById("availableCapacityMeta").textContent = "Remaining across all warehouses";
  }

  render();
})();
