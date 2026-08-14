/* FIXORA - Storage Service */

const Storage = {
  _objectUrlCache: new Map(),

  async optimizeImageFile(file, options = {}) {
    const {
      maxDimension = 1600,
      quality = 0.82,
      maxSizeBytes = 5 * 1024 * 1024
    } = options;

    if (!file || !file.type.startsWith('image/')) return file;
    if (file.size <= maxSizeBytes && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return file;
    }

    try {
      const imageBitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxDimension / Math.max(imageBitmap.width, imageBitmap.height));
      const width = Math.max(1, Math.round(imageBitmap.width * scale));
      const height = Math.max(1, Math.round(imageBitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.drawImage(imageBitmap, 0, 0, width, height);
      imageBitmap.close?.();

      const blob = await new Promise((resolve) => {
        canvas.toBlob((result) => resolve(result || file), 'image/jpeg', quality);
      });

      const baseName = file.name.replace(/\.[^.]+$/, '');
      const optimizedName = `${baseName}.jpg`;
      return new File([blob], optimizedName, { type: 'image/jpeg', lastModified: Date.now() });
    } catch {
      return file;
    }
  },

  async uploadFile(bucket, path, file) {
    try {
      const result = await supabase.upload(bucket, path, file);
      return { url: supabase.getPublicUrl(bucket, path), path, error: null };
    } catch (error) {
      return { url: null, path: null, error: error.message };
    }
  },

  async uploadLogo(file) {
    const userId = Auth.getUserId();
    if (!userId) return { url: null, path: null, error: 'Debes iniciar sesión' };
    const ext = file.name.split('.').pop();
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    return this.uploadFile(CONFIG.storage.buckets.logo, path, file);
  },

  async uploadStamp(file) {
    const userId = Auth.getUserId();
    if (!userId) return { url: null, path: null, error: 'Debes iniciar sesión' };
    const ext = file.name.split('.').pop();
    const path = `${userId}/stamp-${Date.now()}.${ext}`;
    return this.uploadFile(CONFIG.storage.buckets.stamps, path, file);
  },

  async uploadDocument(file, docId) {
    const userId = Auth.getUserId();
    if (!userId) return { url: null, path: null, error: 'Debes iniciar sesión' };
    const ext = file.name.split('.').pop();
    const path = `${userId}/${docId}-${Date.now()}.${ext}`;
    return this.uploadFile(CONFIG.storage.buckets.documents, path, file);
  },

  async uploadIncomePhoto(file, userId, entryId) {
    const optimized = await this.optimizeImageFile(file, { maxDimension: 1800, quality: 0.84 });
    const safeName = (optimized.name || file.name || 'photo').replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
    const ext = (optimized.name || file.name || '').split('.').pop() || 'jpg';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const path = `${userId}/${entryId}/${unique}-${safeName.replace(/\.[^.]+$/, '')}.${ext}`;
    const result = await this.uploadFile(CONFIG.storage.buckets.incomePhotos, path, optimized);
    if (!result.error) {
      try {
        result.url = await this.getSignedUrl(CONFIG.storage.buckets.incomePhotos, path, 3600);
      } catch {
        result.url = null;
      }
    }
    return result;
  },

  getPublicUrl(bucket, path) {
    return supabase.getPublicUrl(bucket, path);
  },

  async getSignedUrl(bucket, path, expiresIn = 3600) {
    const url = await supabase.createSignedUrl(bucket, path, expiresIn);
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const relative = url.startsWith('/') ? url : `/${url}`;
    const storagePath = relative.startsWith('/storage/v1/')
      ? relative
      : relative.startsWith('/object/')
        ? `/storage/v1${relative}`
        : `/storage/v1${relative}`;
    return `${CONFIG.supabase.url}${storagePath}`;
  },

  async getAuthenticatedObjectUrl(bucket, path) {
    if (!bucket || !path) return null;
    const cacheKey = `${bucket}/${path}`;
    const cached = this._objectUrlCache.get(cacheKey);
    if (cached) return cached;

    const blob = await supabase.getObjectBlob(bucket, path);
    const objectUrl = URL.createObjectURL(blob);
    this._objectUrlCache.set(cacheKey, objectUrl);
    return objectUrl;
  },

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsDataURL(file);
    });
  },

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Error al leer archivo'));
      reader.readAsText(file);
    });
  },

  validateFile(file, options = {}) {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] } = options;

    if (file.size > maxSize) {
      return { valid: false, error: `El archivo excede el tamaño máximo de ${Math.round(maxSize / 1024 / 1024)}MB` };
    }

    if (allowedTypes.length && !allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no permitido' };
    }

    return { valid: true, error: null };
  },

  generatePreview(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Error al generar vista previa'));
      reader.readAsDataURL(file);
    });
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

window.Storage = Storage;
