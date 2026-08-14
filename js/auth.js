/* FIXORA - Authentication */

const Auth = {
  currentUser: null,
  accessProfile: null,
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
    this.accessProfile = null;
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
      const profile = await this.loadAccessProfile();
      if (!profile || !profile.is_active) {
        await supabase.signOut();
        this.clearLocalSession();
        return { user: null, error: profile ? 'Tu acceso se encuentra inactivo.' : 'Tu usuario no tiene un perfil válido.' };
      }
      return { user: result.user, profile, error: null };
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

  async loadAccessProfile(force = false) {
    if (this.accessProfile && !force) return this.accessProfile;
    const userId = this.getUserId();
    if (!userId) return null;
    try {
      const profile = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (profile && !Object.prototype.hasOwnProperty.call(profile, 'role')) {
        // Compatibility path while the technician migration is pending remotely.
        // Every profile in the legacy schema represents its own administrator.
        this.accessProfile = {
          ...profile,
          role: 'admin',
          business_owner_id: profile.id,
          is_active: true,
          legacy_schema: true
        };
        return this.accessProfile;
      }
      this.accessProfile = profile;
      return this.accessProfile;
    } catch { return null; }
  },

  async landingPage() {
    const profile = await this.loadAccessProfile(true);
    return profile?.role === 'technician' ? 'tecnico.html' : 'dashboard.html';
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

  async guard(requiredRole = null) {
    const user = await this.init();
    if (!user) {
      this.redirectTo('login.html');
      return false;
    }
    const profile = await this.loadAccessProfile(true);
    if (!profile || !profile.is_active) {
      await supabase.signOut();
      this.clearLocalSession();
      this.redirectTo('login.html');
      return false;
    }
    if (requiredRole && profile.role !== requiredRole) {
      this.redirectTo(profile.role === 'technician' ? 'tecnico.html' : 'dashboard.html');
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
