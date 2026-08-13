/* FIXORA - Main Application */

const App = {
  init() {
    this.setupTheme();
    this.setupGlobalSearch();
  },

  setupTheme() {
    const saved = Utils.storage.get(CONFIG.theme.storageKey, CONFIG.theme.default);
    document.documentElement.setAttribute('data-theme', saved);
  },

  setupGlobalSearch() {
    if (window.GlobalSearch) {
      GlobalSearch.init();
    }
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    let next;
    if (current === 'dark') next = 'light';
    else if (current === 'light') next = 'dark';
    else next = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', next);
    Utils.storage.set(CONFIG.theme.storageKey, next);
  },

  setupSidebar() {
    const toggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.getElementById('mobile-menu-btn');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    if (menuBtn && sidebar && backdrop) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        backdrop.classList.toggle('active');
      });

      backdrop.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.remove('active');
      });
    }
  }
};

window.App = App;
