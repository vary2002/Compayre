const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

if (!API_BASE_URL) {
  console.error('API_BASE_URL is not configured. Please set NEXT_PUBLIC_API_URL in .env.local');
}

export interface LoginRequest {
  username: string; // Actually email, sent as 'username' for API compatibility
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string;
    subscription_type: string;
    access_level: string;
    company_name: string;
    phone_number: string;
    is_staff: boolean;
    is_superuser: boolean;
  };
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  company_name: string;
  designation: string;
  password: string;
  password_confirm: string;
}

export interface RegisterResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  subscription_type: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  company_name: string;
  designation: string;
  role: string;
  subscription_type: string;
  access_level: string;
  is_staff: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(includeAuth: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async handleUnauthorized(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      try {
        await this.refreshPromise;
        return true;
      } catch {
        return false;
      }
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;
      return true;
    } catch {
      this.isRefreshing = false;
      this.refreshPromise = null;
      this.clearTokens();
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return false;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const result: TokenRefreshResponse = await response.json();
    this.setAccessToken(result.access);
    return result.access;
  }

  private async fetchWithTokenRefresh(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    let response = await fetch(url, options);

    // If unauthorized, try to refresh token and retry
    if (response.status === 401) {
      const refreshed = await this.handleUnauthorized();
      if (refreshed) {
        // Retry with new token
        const headers = options.headers as Record<string, string>;
        const newToken = this.getAccessToken();
        if (newToken && headers) {
          headers['Authorization'] = `Bearer ${newToken}`;
        }
        response = await fetch(url, options);
      }
    }

    return response;
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('refresh_token', token);
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${this.baseUrl}/auth/token/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Login failed:', error);
      throw new Error(error.detail || 'Login failed');
    }

    const result: LoginResponse = await response.json();
    console.log('Login successful, user data:', result.user);
    
    // Store tokens
    this.setAccessToken(result.access);
    this.setRefreshToken(result.refresh);
    localStorage.setItem('user', JSON.stringify(result.user));

    return result;
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      console.log('API Base URL:', this.baseUrl);
      console.log('Sending registration data:', JSON.stringify(data, null, 2));
      const url = `${this.baseUrl}/users/register/`;
      console.log('Fetch URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      console.log('Register response status:', response.status);
      
      const responseText = await response.text();
      console.log('Register response text:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error(`Invalid response from server: ${responseText}`);
      }
      
      console.log('Register response data:', responseData);

      if (!response.ok) {
        console.error('Register API Error:', responseData);
        throw responseData;
      }

      return responseData;
    } catch (error: any) {
      console.error('Register request failed:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message || error?.toString());
      if (error && typeof error === 'object') {
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/users/logout/`, {
        method: 'POST',
        headers: this.getHeaders(true),
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.fetchWithTokenRefresh(`${this.baseUrl}/users/me/`, {
      method: 'GET',
      headers: this.getHeaders(true),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Failed to fetch current user:', error);
      throw new Error(error?.detail || 'Failed to fetch user');
    }

    const user = await response.json();
    console.log('Current user fetched from backend:', user);
    return user;
  }

  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseUrl}/auth/token/refresh/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }

    const result: TokenRefreshResponse = await response.json();
    this.setAccessToken(result.access);

    return result.access;
  }

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  getStoredUser(): User | null {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    // Ensure headers object exists
    if (!options.headers) {
      options.headers = {};
    }

    // Add authorization header
    const headers = options.headers as Record<string, string>;
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.fetchWithTokenRefresh(url, options);
  }

  async logSelectionActivity(
    activityType: 'companies' | 'directors',
    selectedItems: string[]
  ): Promise<void> {
    try {
      const description = `Selected ${activityType}: [${selectedItems.join(', ')}]`;
      
      await this.fetchWithTokenRefresh(`${this.baseUrl}/activity-logs/log-selection/`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          activity_type: activityType === 'companies' ? 'selection_companies' : 'selection_directors',
          description,
        }),
      });
    } catch (error) {
      console.error('Error logging selection activity:', error);
      // Don't throw - this is non-critical logging
    }
  }
}

export const apiClient = new ApiClient();
