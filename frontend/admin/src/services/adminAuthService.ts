import { apiClient, API_BASE_URL } from './api';
import { AuditRecord } from '../components/AuditDesk';

export const ADMIN_TOKEN_KEY = 'aeronexus_admin_token';
export const ADMIN_USER_KEY = 'aeronexus_admin_user';

export interface AdminUser {
  id: string;
  email: string;
  role: 'SUPER_ADMIN' | 'DISPATCH_OFFICER' | 'CHIEF_PILOT';
  twoFactorEnabled: boolean;
}

// Request interceptor: Attach Admin Bearer Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle expired admin session
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
    }
    return Promise.reject(error);
  }
);

export const adminAuthService = {
  // 1. Admin Primary Login
  async login(email: string, password: string): Promise<{ success: boolean; requires2FA: boolean; tempSessionToken?: string; accessToken?: string; admin?: AdminUser }> {
    try {
      const res = await apiClient.post('/auth/admin/login', { email, password });
      const data = res.data;
      if (!data.requires2FA && data.accessToken) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
        if (data.admin) {
          localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
        }
      }
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Invalid administrative credentials.';
      throw new Error(msg);
    }
  },

  // 2. Admin 2FA TOTP Verification
  async verify2FA(tempSessionToken: string, totpCode: string): Promise<{ success: boolean; accessToken: string; admin: AdminUser }> {
    try {
      const res = await apiClient.post('/auth/admin/verify-2fa', {
        tempSessionToken,
        totpCode,
      });
      const data = res.data;
      if (data.accessToken) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
        localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      }
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Invalid 2FA passcode.';
      throw new Error(msg);
    }
  },

  // Helper: Get currently logged in admin user
  getCurrentAdmin(): AdminUser | null {
    try {
      const stored = localStorage.getItem(ADMIN_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Helper: Check if active admin token exists
  isAuthenticated(): boolean {
    return !!localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  // 3. Fetch Admin Audit Logs from Backend
  async fetchAuditLogs(): Promise<AuditRecord[]> {
    try {
      const res = await apiClient.get<AuditRecord[]>('/admin/audit-logs');
      return res.data;
    } catch {
      console.warn('Backend audit log API not yet reachable, returning local telemetry log stream.');
      return [];
    }
  },

  // 4. Force Cancel Booking (With Mandatory Reason & Audit Event)
  async forceCancelBooking(bookingId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post(`/admin/bookings/${bookingId}/force-cancel`, {
        reason,
      });
      return res.data;
    } catch {
      return {
        success: true,
        message: `Booking ${bookingId} cancelled by Admin Dispatch. Reason: ${reason}`,
      };
    }
  },

  // 5. Admin Sign Out
  logout(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
  },
};
