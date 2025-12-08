import apiClient from '../api-client';
import {
  KYC,
  KYCStatistics,
  KycPendingResponse,
  KycRejectedResponse,
  KycVerificationResult,
} from '@/types';

export const kycApi = {
  getPending: async (): Promise<KycPendingResponse> => {
    const response = await apiClient.get<KycPendingResponse>('/admin/kyc/pending');
    return response.data;
  },

  getRejected: async (): Promise<KycRejectedResponse> => {
    const response = await apiClient.get<KycRejectedResponse>('/admin/kyc/rejected');
    return response.data;
  },

  getById: async (userId: string): Promise<KYC> => {
    const response = await apiClient.get<KYC>(`/admin/kyc/${userId}`);
    return response.data;
  },

  getStatistics: async (): Promise<KYCStatistics> => {
    const response = await apiClient.get<KYCStatistics>('/admin/kyc/stats');
    return response.data;
  },

  approveBVN: async (userId: string, notes?: string): Promise<KycVerificationResult> => {
    const response = await apiClient.post<KycVerificationResult>(
      `/admin/kyc/${userId}/approve-bvn`,
      {
        notes,
      },
    );
    return response.data;
  },

  rejectBVN: async (userId: string, reason: string): Promise<KycVerificationResult> => {
    const response = await apiClient.post<KycVerificationResult>(
      `/admin/kyc/${userId}/reject-bvn`,
      {
        reason,
      },
    );
    return response.data;
  },

  approveNIN: async (userId: string, notes?: string): Promise<KycVerificationResult> => {
    const response = await apiClient.post<KycVerificationResult>(
      `/admin/kyc/${userId}/approve-nin`,
      {
        notes,
      },
    );
    return response.data;
  },

  rejectNIN: async (userId: string, reason: string): Promise<KycVerificationResult> => {
    const response = await apiClient.post<KycVerificationResult>(
      `/admin/kyc/${userId}/reject-nin`,
      {
        reason,
      },
    );
    return response.data;
  },
};
