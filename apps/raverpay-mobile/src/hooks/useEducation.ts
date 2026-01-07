// src/hooks/useEducation.ts

import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { apiClient } from '../lib/api/client';
import { API_ENDPOINTS } from '../lib/api/endpoints';

// ==================== JAMB ====================

export function useJAMBVariations() {
  return useQuery({
    queryKey: ['jamb-variations'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.VTU.JAMB_VARIATIONS);
      return response.data;
    },
  });
}

export function useVerifyJAMBProfile() {
  return useMutation({
    mutationFn: async (data: { profileId: string; variationCode: string }) => {
      const response = await apiClient.post(API_ENDPOINTS.VTU.JAMB_VERIFY_PROFILE, data);
      return response.data;
    },
    onError: (error: any) => {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.message ||
          'Failed to verify JAMB Profile ID. Please check and try again.',
      );
    },
  });
}

export function usePurchaseJAMBPin() {
  return useMutation({
    mutationFn: async (data: {
      profileId: string;
      variationCode: string;
      pin: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const response = await apiClient.post(API_ENDPOINTS.VTU.JAMB_PURCHASE, data);
      return response.data;
    },
    onError: (error: any) => {
      Alert.alert(
        'Purchase Failed',
        error.response?.data?.message || 'Failed to purchase JAMB PIN',
      );
    },
  });
}

// ==================== WAEC Registration ====================

export function useWAECRegistrationVariations() {
  return useQuery({
    queryKey: ['waec-registration-variations'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.VTU.WAEC_REGISTRATION_VARIATIONS);
      return response.data;
    },
  });
}

export function usePurchaseWAECRegistration() {
  return useMutation({
    mutationFn: async (data: {
      phone: string;
      pin: string;
      variationCode: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const response = await apiClient.post(API_ENDPOINTS.VTU.WAEC_REGISTRATION_PURCHASE, data);
      return response.data;
    },
    onError: (error: any) => {
      Alert.alert(
        'Purchase Failed',
        error.response?.data?.message || 'Failed to purchase WAEC Registration PIN',
      );
    },
  });
}

// ==================== WAEC Result Checker ====================

export function useWAECResultVariations() {
  return useQuery({
    queryKey: ['waec-result-variations'],
    queryFn: async () => {
      const response = await apiClient.get(API_ENDPOINTS.VTU.WAEC_RESULT_VARIATIONS);
      return response.data;
    },
  });
}

export function usePurchaseWAECResult() {
  return useMutation({
    mutationFn: async (data: {
      phone: string;
      pin: string;
      variationCode: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const response = await apiClient.post(API_ENDPOINTS.VTU.WAEC_RESULT_PURCHASE, data);
      return response.data;
    },
    onError: (error: any) => {
      Alert.alert(
        'Purchase Failed',
        error.response?.data?.message || 'Failed to purchase WAEC Result Checker',
      );
    },
  });
}
