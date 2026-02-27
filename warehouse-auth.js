(function () {
  function clearWarehouseSessionStorage() {
    var keys = [
      "warehouseLoggedIn",
      "warehouseSessionOperatorId",
      "warehouseAuthUser",
      "warehousePendingProfile",
      "profileName",
      "profileEmail",
      "profilePhone",
      "profileAddress",
      "profileRole",
      "profileCompany",
      "profileWarehouse",
      "profileLocation",
      "profileMember",
      "profileImage"
    ];
    keys.forEach(function (key) {
      localStorage.removeItem(key);
    });
  }

  function getSupabaseClient() {
    if (!window.AgriSupabase || !window.AgriSupabase.getClient) {
      return null;
    }
    try {
      return window.AgriSupabase.getClient();
    } catch (error) {
      return null;
    }
  }

  async function logoutWarehouse(event) {
    if (event) event.preventDefault();
    var client = getSupabaseClient();
    if (client && client.auth && client.auth.signOut) {
      try {
        await client.auth.signOut();
      } catch (error) {
        // Continue with local cleanup even if remote sign-out fails.
      }
    }
    clearWarehouseSessionStorage();
    window.location.href = "warehouse.html";
  }

  function ensureLogoutLink() {
    var profileMenu = document.getElementById("profileMenu");
    if (!profileMenu) return;

    var existing = profileMenu.querySelector('[data-action="logout"]');
    if (existing) return;

    var link = document.createElement("a");
    link.href = "#";
    link.textContent = "Logout";
    link.setAttribute("data-action", "logout");
    profileMenu.appendChild(link);
  }

  function bindLogoutAction() {
    document.querySelectorAll('[data-action="logout"]').forEach(function (link) {
      if (link.dataset.bound === "true") return;
      link.dataset.bound = "true";
      link.addEventListener("click", logoutWarehouse);
    });
  }

  ensureLogoutLink();
  bindLogoutAction();
  window.WarehouseAuth = {
    logout: logoutWarehouse
  };
})();

