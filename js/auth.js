/* FIXORA - Authentication */

const Auth = {
  currentUser: null,
  _initPromise: null,

  async init() {
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      const session = await supabase.getSession();
      if (session && session.user) {
        this.currentUser = session.user;
        Utils.storage.set(CONFIG.session.storageKey, session.user);
        this.startAutoRefresh();
        return session.user;
      }

      this.clearLocalSession();
      return null;
    })();

    try {
      return await this._initPromise;
    } finally {
      this._initPromise = null;
    }
  },

  clearLocalSession() {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
    this.currentUser = null;
    Utils.storage.remove(CONFIG.session.storageKey);
    localStorage.removeItem('fixora_access_token');
    localStorage.removeItem('fixora_refresh_token');
    localStorage.removeItem('fixora_user');
  },

  startAutoRefresh() {
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    this._refreshInterval = setInterval(async () => {
      const token = localStorage.getItem('fixora_access_token');
      const refreshToken = localStorage.getItem('fixora_refresh_token');
      if (!token || !refreshToken) {
        clearInterval(this._refreshInterval);
        return;
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiresIn = payload.exp * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          await supabase.refreshToken();
        }
      } catch {
        await supabase.refreshToken();
      }
    }, 60 * 1000);
  },

  async signUp(email, password, businessName) {
    const loadingToken = Components.showLoading('Creando tu cuenta...');
    try {
      const result = await supabase.signUp(email, password, { business_name: businessName });
      this.currentUser = result.user;
      Utils.storage.set(CONFIG.session.storageKey, result.user);
      this.startAutoRefresh();

      await supabase.from('profiles').insert({
        id: result.user.id,
        email: result.user.email,
        business_name: businessName,
        created_at: new Date().toISOString()
      });

      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  async signIn(email, password) {
    const loadingToken = Components.showLoading('Iniciando sesión...');
    try {
      const result = await supabase.signIn(email, password);
      this.currentUser = result.user;
      Utils.storage.set(CONFIG.session.storageKey, result.user);
      this.startAutoRefresh();
      return { user: result.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  async signOut() {
    await Components.withLoading('Cerrando sesión...', async () => {
      await supabase.signOut();
      this.clearLocalSession();
      this.redirectTo('login.html');
    });
  },

  async resetPassword(email) {
    const loadingToken = Components.showLoading('Enviando instrucciones...');
    try {
      await supabase.resetPassword(email);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    } finally {
      Components.hideLoading(loadingToken);
    }
  },

  getUser() {
    if (this.currentUser) return this.currentUser;
    return Utils.storage.get(CONFIG.session.storageKey);
  },

  getUserId() {
    const user = this.getUser();
    return user?.id || null;
  },

  isLoggedIn() {
    return !!this.getUser() && !!localStorage.getItem('fixora_access_token');
  },

  redirectTo(page) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const normalizePage = (value) => value.replace(/\.html$/i, '');
    if (normalizePage(currentPage) === normalizePage(page)) return;

    if (typeof window.location.replace === 'function') {
      window.location.replace(page);
    } else {
      window.location.href = page;
    }
  },

  async guard() {
    const user = await this.init();
    if (!user) {
      this.redirectTo('login.html');
      return false;
    }
    return true;
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      this.redirectTo('login.html');
      return false;
    }
    return true;
  }
};

window.Auth = Auth;
