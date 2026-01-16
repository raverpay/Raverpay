import apiClient from '../api-client';
import { AuthResponse } from '@/types';

export interface SetupMfaResponse {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface MfaStatus {
  mfaEnabled: boolean;
  mfaEnabledAt: string | null;
  backupCodesRemaining: number;
  lastMfaSuccess: string | null;
}

export interface Session {
  id: string;
  deviceId: string | null;
  ipAddress: string | null;
  location: string | null;
  userAgent: string | null;
  lastUsedAt: string;
  createdAt: string;
}

export interface LoginResponse extends AuthResponse {
  mfaRequired?: boolean;
  tempToken?: string;
  mustChangePassword?: boolean;
  passwordChangeToken?: string;
}

export interface ChangePasswordRequest {
  passwordChangeToken: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  mfaCode: string;
}

export interface ChangePasswordResponse extends AuthResponse {
  reAuthToken?: string;
  expiresIn?: number;
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      identifier: email,
      password,
    });
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  // MFA endpoints
  setupMfa: async (): Promise<SetupMfaResponse> => {
    const response = await apiClient.post<SetupMfaResponse>('/auth/mfa/setup');
    return response.data;
  },

  verifyMfaSetup: async (code: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/mfa/verify-setup', { code });
    return response.data;
  },

  verifyMfaCode: async (tempToken: string, code: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/mfa/verify', {
      tempToken,
      code,
    });
    return response.data;
  },

  verifyBackupCode: async (tempToken: string, backupCode: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/mfa/verify-backup', {
      tempToken,
      backupCode,
    });
    return response.data;
  },

  disableMfa: async (password: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/mfa/disable', { password });
    return response.data;
  },

  regenerateBackupCodes: async (
    mfaCode: string,
  ): Promise<{
    backupCodes: string[];
    message: string;
  }> => {
    const response = await apiClient.post('/auth/mfa/regenerate-backup-codes', { code: mfaCode });
    return response.data;
  },

  getMfaStatus: async (): Promise<MfaStatus> => {
    const response = await apiClient.get<MfaStatus>('/auth/mfa/status');
    return response.data;
  },

  // Session management
  getSessions: async (): Promise<Session[]> => {
    const response = await apiClient.get<Session[]>('/auth/sessions');
    return response.data;
  },

  revokeSession: async (sessionId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post(`/auth/sessions/${sessionId}/revoke`);
    return response.data;
  },

  revokeAllSessions: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/auth/sessions/revoke-all');
    return response.data;
  },

  // Re-authentication
  verifyPasswordReauth: async (
    password: string,
  ): Promise<{
    reAuthToken: string;
    expiresIn: number;
  }> => {
    const response = await apiClient.post('/auth/verify-password-reauth', {
      password,
    });
    return response.data;
  },

  verifyMfaReauth: async (
    mfaCode: string,
  ): Promise<{
    reAuthToken: string;
    expiresIn: number;
  }> => {
    const response = await apiClient.post('/auth/verify-mfa-reauth', {
      mfaCode,
    });
    return response.data;
  },

  // Password change (for first login)
  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const response = await apiClient.post<ChangePasswordResponse>(
      '/admin/auth/change-password',
      data,
    );
    return response.data;
  },
};
