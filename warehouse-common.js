(function () {
  function hasValidWarehouseSession() {
    if (localStorage.getItem('warehouseLoggedIn') !== 'true') return false;
    const role = localStorage.getItem('profileRole');
    if (role && role !== 'Warehouse Owner') return false;

    const rawUser = localStorage.getItem('warehouseAuthUser');
    const sessionOperatorId = localStorage.getItem('warehouseSessionOperatorId');
    if (!rawUser || !sessionOperatorId) return false;

    try {
      const parsed = JSON.parse(rawUser);
      return Boolean(parsed && parsed.operatorId && parsed.operatorId === sessionOperatorId);
    } catch (error) {
      return false;
    }
  }

  if (!hasValidWarehouseSession()) {
    window.location.href = 'warehouse.html';
    return;
  }

  const profile = {
    name: localStorage.getItem('profileName') || 'Warehouse Owner',
    role: localStorage.getItem('profileRole') || 'Warehouse Owner',
    avatar: localStorage.getItem('profileImage') || 'warehouse-owner-profile.png',
    location: localStorage.getItem('profileLocation') || 'Warehouse'
  };

  const sidebarName = document.getElementById('sidebarName');
  const sidebarRole = document.getElementById('sidebarRole');
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  const topName = document.getElementById('topName');
  const topAvatar = document.getElementById('topAvatar');
  const weatherSummary = document.getElementById('weatherSummary');
  const liveClock = document.getElementById('liveClock');

  if (sidebarName) sidebarName.textContent = profile.name;
  if (sidebarRole) sidebarRole.textContent = profile.role;
  if (sidebarAvatar) sidebarAvatar.src = profile.avatar;
  if (topName) topName.textContent = profile.name;
  if (topAvatar) topAvatar.src = profile.avatar;
  if (weatherSummary) weatherSummary.textContent = profile.location + ' | 28 C | Clear';

  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', function () {
      sidebar.classList.toggle('sidebar-open');
    });
  }

  const profileCard = document.getElementById('profileCard');
  const profileToggle = document.getElementById('profileToggle');
  const profileMenu = document.getElementById('profileMenu');
  function closeProfileMenu() {
    if (!profileMenu || !profileToggle) return;
    profileMenu.classList.remove('open');
    profileToggle.setAttribute('aria-expanded', 'false');
  }

  if (profileCard && profileToggle && profileMenu) {
    profileToggle.addEventListener('click', function () {
      const isOpen = profileMenu.classList.toggle('open');
      profileToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', function (event) {
      if (!profileCard.contains(event.target) && !profileMenu.contains(event.target)) {
        closeProfileMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeProfileMenu();
    });
  }

  const themeToggle = document.getElementById('themeToggle');
  const storedTheme = localStorage.getItem('dashboardTheme') || 'light';
  if (storedTheme === 'dark') {
    document.body.classList.add('dark-mode');
  }

  function syncThemeButton() {
    if (!themeToggle) return;
    themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Light' : 'Dark';
  }
  syncThemeButton();

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('dashboardTheme', isDark ? 'dark' : 'light');
      syncThemeButton();
    });
  }

  function tickClock() {
    if (!liveClock) return;
    liveClock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tickClock();
  setInterval(tickClock, 1000);

  const page = document.body.getAttribute('data-page');
  if (page) {
    document.querySelectorAll('.side-nav a[data-nav]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === page);
    });
  }
})();
