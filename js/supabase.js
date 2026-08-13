/* FIXORA - Supabase Client */

const SUPABASE_URL = CONFIG.supabase.url;
const SUPABASE_ANON_KEY = CONFIG.supabase.anonKey;

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  _clearStoredSession() {
    localStorage.removeItem('fixora_access_token');
    localStorage.removeItem('fixora_refresh_token');
    localStorage.removeItem('fixora_user');
    localStorage.removeItem(window.CONFIG?.session?.storageKey || 'fixora-session');
  }

  _buildUrl(path) {
    return `${this.url}${path}`;
  }

  getAuthHeaders(method = 'GET', options = {}) {
    const token = localStorage.getItem('fixora_access_token');
    const headers = { apikey: this.key };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      if (!options.omitPrefer) headers['Prefer'] = 'return=representation';
    }
    return headers;
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('fixora_refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await fetch(this._buildUrl('/auth/v1/token?grant_type=refresh_token'), {
        method: 'POST',
        headers: { apikey: this.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        this._clearStoredSession();
        return false;
      }

      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem('fixora_access_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('fixora_refresh_token', data.refresh_token);
        }
        return true;
      }
      this._clearStoredSession();
      return false;
    } catch {
      return false;
    }
  }

  async request(method, path, body = null, options = {}) {
    const url = this._buildUrl(path);
    const extraHeaders = options?.headers ? { ...options.headers } : {};

    const buildConfig = () => {
      const headers = { ...this.getAuthHeaders(method, options), ...extraHeaders };
      const cfg = { method, headers };
      if (body && method !== 'GET') {
        cfg.body = JSON.stringify(body);
      }
      return cfg;
    };

    try {
      let response = await fetch(url, buildConfig());

      if (response.status === 401 && localStorage.getItem('fixora_refresh_token')) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          response = await fetch(url, buildConfig());
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error de red' }));
        throw new SupabaseError(error.message || `HTTP ${response.status}`, response.status, error);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    } catch (err) {
      if (err instanceof SupabaseError) throw err;
      throw new SupabaseError(err.message || 'Error de conexion', 0, null);
    }
  }

  from(table) {
    return new SupabaseQuery(this, table);
  }

  async signUp(email, password, metadata = {}) {
    const result = await this.request('POST', '/auth/v1/signup', {
      email,
      password,
      data: metadata
    });
    if (result.access_token) {
      localStorage.setItem('fixora_access_token', result.access_token);
      localStorage.setItem('fixora_refresh_token', result.refresh_token);
    }
    return result;
  }

  async signIn(email, password) {
    const result = await this.request('POST', '/auth/v1/token?grant_type=password', {
      email,
      password
    });
    if (result.access_token) {
      localStorage.setItem('fixora_access_token', result.access_token);
      localStorage.setItem('fixora_refresh_token', result.refresh_token);
    }
    return result;
  }

  async signOut() {
    try {
      await this.request('POST', '/auth/v1/logout');
    } catch (e) { /* ignore */ }
    this._clearStoredSession();
  }

  async getSession() {
    const token = localStorage.getItem('fixora_access_token');
    if (!token) return null;

    try {
      const result = await this.request('GET', '/auth/v1/user');
      return { user: result, access_token: token };
    } catch {
      this._clearStoredSession();
      return null;
    }
  }

  async resetPassword(email) {
    return this.request('POST', '/auth/v1/recover', { email });
  }

  async upload(bucket, path, file) {
    const token = localStorage.getItem('fixora_access_token');
    const url = this._buildUrl(`/storage/v1/object/${bucket}/${path}`);

    const formData = new FormData();
    formData.append('file', file);

    const headers = { apikey: this.key };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error al subir' }));
      throw new SupabaseError(error.message, response.status, error);
    }

    return response.json();
  }

  getPublicUrl(bucket, path) {
    return `${this.url}/storage/v1/object/public/${bucket}/${path}`;
  }

  async createSignedUrl(bucket, path, expiresIn = 3600) {
    const token = localStorage.getItem('fixora_access_token');
    const response = await fetch(this._buildUrl(`/storage/v1/object/sign/${bucket}/${path}`), {
      method: 'POST',
      headers: {
        apikey: this.key,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Error al firmar URL' }));
      throw new SupabaseError(error.message || `HTTP ${response.status}`, response.status, error);
    }

    const data = await response.json();
    return data?.signedURL || data?.signedUrl || data?.url || null;
  }

  async deleteObject(bucket, path) {
    return this.request('DELETE', `/storage/v1/object/${bucket}/${path}`);
  }

  async getObjectBlob(bucket, path) {
    const token = localStorage.getItem('fixora_access_token');
    const response = await fetch(this._buildUrl(`/storage/v1/object/${bucket}/${path}`), {
      method: 'GET',
      headers: {
        apikey: this.key,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new SupabaseError(errorText || `HTTP ${response.status}`, response.status, { error: errorText });
    }

    return response.blob();
  }

  async invoke(functionName, body = {}) {
    return this.request('POST', `/functions/v1/${functionName}`, body, { omitPrefer: true });
  }
}

class SupabaseQuery {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this._select = '*';
    this._filters = [];
    this._order = null;
    this._limit = null;
    this._offset = null;
    this._single = false;
  }

  select(columns = '*', options = {}) {
    this._select = columns;
    if (options.count) this._count = options.count;
    return this;
  }

  eq(column, value) {
    this._filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  neq(column, value) {
    this._filters.push(`${column}=neq.${encodeURIComponent(value)}`);
    return this;
  }

  gt(column, value) {
    this._filters.push(`${column}=gt.${encodeURIComponent(value)}`);
    return this;
  }

  gte(column, value) {
    this._filters.push(`${column}=gte.${encodeURIComponent(value)}`);
    return this;
  }

  lt(column, value) {
    this._filters.push(`${column}=lt.${encodeURIComponent(value)}`);
    return this;
  }

  lte(column, value) {
    this._filters.push(`${column}=lte.${encodeURIComponent(value)}`);
    return this;
  }

  like(column, value) {
    this._filters.push(`${column}=like.${encodeURIComponent(value)}`);
    return this;
  }

  ilike(column, value) {
    this._filters.push(`${column}=ilike.${encodeURIComponent(value)}`);
    return this;
  }

  in(column, values) {
    this._filters.push(`${column}=in.(${values.map(v => encodeURIComponent(v)).join(',')})`);
    return this;
  }

  is(column, value) {
    this._filters.push(`${column}=is.${value}`);
    return this;
  }

  or(conditions) {
    this._filters.push(`or=(${encodeURIComponent(conditions)})`);
    return this;
  }

  order(column, options = {}) {
    const ascending = options.ascending !== false;
    this._order = `${column}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  limit(count) {
    this._limit = count;
    return this;
  }

  range(from, to) {
    this._offset = from;
    this._limit = to - from + 1;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._single = true;
    this._maybeSingle = true;
    return this;
  }

  async insert(data) {
    return this.client.request('POST', `/rest/v1/${this.table}`, data);
  }

  async update(data) {
    const params = this._filters.length ? `?${this._filters.join('&')}` : '';
    return this.client.request('PATCH', `/rest/v1/${this.table}${params}`, data);
  }

  async delete() {
    const params = this._filters.length ? `?${this._filters.join('&')}` : '';
    return this.client.request('DELETE', `/rest/v1/${this.table}${params}`);
  }

  async then(resolve, reject) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }

  async _execute() {
    let path = `/rest/v1/${this.table}?select=${encodeURIComponent(this._select)}`;

    if (this._filters.length) {
      path += '&' + this._filters.join('&');
    }

    if (this._order) {
      path += `&order=${this._order}`;
    }

    if (this._limit) {
      path += `&limit=${this._limit}`;
    }

    if (this._offset) {
      path += `&offset=${this._offset}`;
    }

    const token = localStorage.getItem('fixora_access_token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (this._count) {
      headers['Prefer'] = `count=${this._count},return=representation`;
    }

    const result = await this.client.request('GET', path, null, { headers });

    if (this._single) {
      if (Array.isArray(result)) {
        return result[0] || (this._maybeSingle ? null : (() => { throw new Error('Row not found'); })());
      }
      return result;
    }

    return result;
  }
}

class SupabaseError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'SupabaseError';
    this.status = status;
    this.details = details;
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase;
window.SupabaseError = SupabaseError;
