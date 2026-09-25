import { envConfig } from './config';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('cf_access_token', token);
      } else {
        localStorage.removeItem('cf_access_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('cf_access_token');
    }
    return this.token;
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const apiBase = envConfig.apiUrl;
    const url = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      // Token may be expired, attempt refresh
      try {
        const refreshRes = await fetch(`${apiBase}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          this.setToken(data.accessToken);
          // Retry original request
          headers['Authorization'] = `Bearer ${data.accessToken}`;
          const retryRes = await fetch(url, { ...options, headers, credentials: 'include' });
          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({ message: 'Request failed' }));
            throw err;
          }
          if (retryRes.status === 204) return {} as T;
          return retryRes.json();
        } else {
          this.setToken(null);
        }
      } catch {
        this.setToken(null);
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({
        statusCode: res.status,
        message: res.statusText || 'Network request failed',
      }));
      throw errorData;
    }

    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  get<T>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: unknown, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();

