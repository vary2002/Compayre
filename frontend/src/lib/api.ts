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

// --- Data Models ---

export interface Company {
  company_id: string;
  name: string;
  sector: string | null;
  industry: string | null;
  index: string | null;
  employees: number | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyDropdown {
  company_id: string;
  name: string;
}

export interface Director {
  director_id: string;
  name: string;
  company: string;
  company_name: string;
  designation: string | null;
  category: string | null;
  qualification: string | null;
  dob: string | null;
  promoter_status: string | null;
  gender: string | null;
  appointment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DirectorDropdown {
  director_id: string;
  name: string;
  company__name: string;
}

export interface DirectorRemuneration {
  id: number;
  company: string;
  company_name: string;
  director: string;
  director_name: string;
  fy_end_date: string;
  fy_label: string;
  basic_salary: number | null;
  pf: number | null;
  perqs: number | null;
  bonus: number | null;
  pay_excl_esops: number | null;
  esops: number | null;
  total_remuneration: number | null;
  options_granted: number | null;
  discount: number | null;
  fair_value: number | null;
  aggregate_value: number | null;
  remuneration_status: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFinancialTimeSeries {
  id: number;
  company: string;
  company_name: string;
  fy_end_date: string;
  fy_label: string;
  total_income: number | null;
  pat: number | null;
  roa: number | null;
  employee_cost: number | null;
  mcap: number | null;
  employees: number | null;
  created_at: string;
  updated_at: string;
}

export interface PeerComparison {
  id: number;
  company: string;
  company_name: string;
  peer_company: string;
  peer_company_name: string;
  peer_position: number;
  salary_to_median_emp_pay: number | null;
  created_at: string;
  updated_at: string;
}

// --- Data API Methods ---

class DataApiClient {
  private baseUrl: string;
  private apiClient: typeof apiClient;

  constructor(baseUrl: string = API_BASE_URL, apiClient_: typeof apiClient = apiClient) {
    this.baseUrl = baseUrl;
    this.apiClient = apiClient_;
  }

  // --- Companies ---

  async getCompanies(
    page: number = 1,
    pageSize: number = 50,
    sector?: string,
    industry?: string,
    search?: string
  ): Promise<{ results: Company[]; count: number; next: string | null; previous: string | null }> {
    let url = `${this.baseUrl}/companies/?page=${page}&page_size=${pageSize}`;
    
    if (sector) url += `&sector=${encodeURIComponent(sector)}`;
    if (industry) url += `&industry=${encodeURIComponent(industry)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch companies: ${response.statusText}`);
    }

    return response.json();
  }

  async getCompanyDropdown(): Promise<CompanyDropdown[]> {
    const response = await this.apiClient.fetchWithAuth(`${this.baseUrl}/companies/dropdown/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch companies dropdown: ${response.statusText}`);
    }

    return response.json();
  }

  async getCompanyDetails(companyId: string): Promise<Company> {
    const response = await this.apiClient.fetchWithAuth(`${this.baseUrl}/companies/${companyId}/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch company details: ${response.statusText}`);
    }

    return response.json();
  }

  async getSectors(): Promise<{ sectors: string[] }> {
    const response = await this.apiClient.fetchWithAuth(`${this.baseUrl}/companies/sectors/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch sectors: ${response.statusText}`);
    }

    return response.json();
  }

  async getIndustries(): Promise<{ industries: string[] }> {
    const response = await this.apiClient.fetchWithAuth(`${this.baseUrl}/companies/industries/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch industries: ${response.statusText}`);
    }

    return response.json();
  }

  // --- Directors ---

  async getDirectors(
    page: number = 1,
    pageSize: number = 50,
    companyId?: string,
    category?: string,
    search?: string
  ): Promise<{ results: Director[]; count: number; next: string | null; previous: string | null }> {
    let url = `${this.baseUrl}/directors/?page=${page}&page_size=${pageSize}`;
    
    if (companyId) url += `&company=${encodeURIComponent(companyId)}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch directors: ${response.statusText}`);
    }

    return response.json();
  }

  async getDirectorDropdown(companyId?: string): Promise<DirectorDropdown[]> {
    let url = `${this.baseUrl}/directors/dropdown/`;
    if (companyId) url += `?company_id=${encodeURIComponent(companyId)}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch directors dropdown: ${response.statusText}`);
    }

    return response.json();
  }

  async getDirectorsByCompany(companyId: string): Promise<{ company: { id: string; name: string }; directors: Director[] }> {
    const response = await this.apiClient.fetchWithAuth(
      `${this.baseUrl}/directors/by_company/?company_id=${encodeURIComponent(companyId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch directors by company: ${response.statusText}`);
    }

    return response.json();
  }

  async getDirectorDetails(directorId: string): Promise<Director> {
    const response = await this.apiClient.fetchWithAuth(`${this.baseUrl}/directors/${directorId}/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch director details: ${response.statusText}`);
    }

    return response.json();
  }

  // --- Director Remuneration ---

  async getDirectorRemuneration(
    page: number = 1,
    pageSize: number = 50,
    directorId?: string,
    companyId?: string,
    fyLabel?: string
  ): Promise<{ results: DirectorRemuneration[]; count: number; next: string | null; previous: string | null }> {
    let url = `${this.baseUrl}/director-remuneration/?page=${page}&page_size=${pageSize}`;
    
    if (directorId) url += `&director=${encodeURIComponent(directorId)}`;
    if (companyId) url += `&company=${encodeURIComponent(companyId)}`;
    if (fyLabel) url += `&fy_label=${encodeURIComponent(fyLabel)}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch director remuneration: ${response.statusText}`);
    }

    return response.json();
  }

  async getDirectorRemunerationTimeSeries(directorId: string, companyId?: string): Promise<{ director_id: string; remuneration_data: any[] }> {
    let url = `${this.baseUrl}/director-remuneration/by_director/?director_id=${encodeURIComponent(directorId)}`;
    if (companyId) url += `&company_id=${encodeURIComponent(companyId)}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch director remuneration time series: ${response.statusText}`);
    }

    return response.json();
  }

  async getCompanyRemunerationData(companyId: string): Promise<{ company: { id: string; name: string }; remuneration_data: DirectorRemuneration[] }> {
    const response = await this.apiClient.fetchWithAuth(
      `${this.baseUrl}/director-remuneration/by_company/?company_id=${encodeURIComponent(companyId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch company remuneration data: ${response.statusText}`);
    }

    return response.json();
  }

  // --- Financial Time Series ---

  async getFinancialTimeSeries(
    page: number = 1,
    pageSize: number = 50,
    companyId?: string,
    fyLabel?: string
  ): Promise<{ results: CompanyFinancialTimeSeries[]; count: number; next: string | null; previous: string | null }> {
    let url = `${this.baseUrl}/financial-timeseries/?page=${page}&page_size=${pageSize}`;
    
    if (companyId) url += `&company=${encodeURIComponent(companyId)}`;
    if (fyLabel) url += `&fy_label=${encodeURIComponent(fyLabel)}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch financial time series: ${response.statusText}`);
    }

    return response.json();
  }

  async getCompanyFinancialData(companyId: string): Promise<{ company: { id: string; name: string }; financial_data: any[] }> {
    const response = await this.apiClient.fetchWithAuth(
      `${this.baseUrl}/financial-timeseries/by_company/?company_id=${encodeURIComponent(companyId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch company financial data: ${response.statusText}`);
    }

    return response.json();
  }

  async compareCompaniesFinancial(companyIds: string[], metric: string = 'total_income'): Promise<{ metric: string; comparison_data: Record<string, any[]> }> {
    const url = `${this.baseUrl}/financial-timeseries/comparison/?${companyIds.map(id => `company_ids=${encodeURIComponent(id)}`).join('&')}&metric=${encodeURIComponent(metric)}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to compare companies financial data: ${response.statusText}`);
    }

    return response.json();
  }

  // --- Peer Comparisons ---

  async getPeerComparisons(
    page: number = 1,
    pageSize: number = 50,
    companyId?: string,
    peerPosition?: number
  ): Promise<{ results: PeerComparison[]; count: number; next: string | null; previous: string | null }> {
    let url = `${this.baseUrl}/peer-comparisons/?page=${page}&page_size=${pageSize}`;
    
    if (companyId) url += `&company=${encodeURIComponent(companyId)}`;
    if (peerPosition) url += `&peer_position=${peerPosition}`;

    const response = await this.apiClient.fetchWithAuth(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch peer comparisons: ${response.statusText}`);
    }

    return response.json();
  }

  async getCompanyPeerComparisons(companyId: string): Promise<{ company: { id: string; name: string }; peers: PeerComparison[] }> {
    const response = await this.apiClient.fetchWithAuth(
      `${this.baseUrl}/peer-comparisons/by_company/?company_id=${encodeURIComponent(companyId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch company peer comparisons: ${response.statusText}`);
    }

    return response.json();
  }
}

export const dataApi = new DataApiClient();

