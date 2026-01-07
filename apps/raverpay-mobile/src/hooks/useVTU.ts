// src/hooks/useVTU.ts
import { apiClient, handleApiError } from '@/src/lib/api/client';
import { toast } from '@/src/lib/utils/toast';
import { useAuthStore } from '@/src/store/auth.store';
import { useMutation, useQuery } from '@tanstack/react-query';

// ==================== NETWORK PROVIDERS (Used by Airtime & Data) ====================

export const useNetworkProviders = () => {
  return useQuery({
    queryKey: ['network-providers'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/vtu/airtime/providers');
        // Backend returns array directly, not wrapped in providers key
        // Filter out any null/undefined values
        const providers = Array.isArray(data) ? data.filter((p) => p && p.code) : [];
        return providers;
      } catch (error) {
        console.error('Failed to fetch network providers:', error);
        // Return empty array on error to prevent undefined
        return [];
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    // Ensure we always have a fallback value
    placeholderData: [],
  });
};

// Alias for backward compatibility
export const useAirtimeProviders = useNetworkProviders;

export const usePurchaseAirtime = () => {
  return useMutation({
    mutationFn: async (payload: {
      network: string;
      phone: string;
      amount: number;
      pin: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const { data } = await apiClient.post('/vtu/airtime/purchase', payload);
      return data;
    },
    onSuccess: (data, variables) => {
      // console.log({ data });
      toast.success({
        title: 'Airtime Purchase Successful',
        message: `₦${data.amount} airtime sent to ${data.recipient}`,
      });

      // Show cashback redemption notification
      if (variables.useCashback && variables.cashbackAmount && variables.cashbackAmount > 0) {
        toast.cashback.redeemed(variables.cashbackAmount);
      }

      // Show cashback earned notification (if cashback was earned)
      if (data.cashbackEarned && data.cashbackEarned > 0) {
        // Show special notification for large cashback (>= ₦50)
        if (data.cashbackEarned >= 50) {
          toast.cashback.largeEarning(data.cashbackEarned, 'Airtime');
        } else {
          toast.cashback.earned(data.cashbackEarned, 'Airtime');
        }
      }
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Purchase Failed',
        message: apiError.message || 'Failed to purchase airtime',
      });
    },
  });
};

// ==================== DATA ====================

export const useDataPlans = (network: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['data-plans', network],
    queryFn: async () => {
      const { data } = await apiClient.get(`/vtu/data/plans/${network}`);
      // Backend returns array of variations directly
      return { plans: Array.isArray(data) ? data : [] };
    },
    enabled: enabled && !!network,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useSMEDataPlans = (network: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['sme-data-plans', network],
    queryFn: async () => {
      const { data } = await apiClient.get(`/vtu/data/sme-plans/${network}`);
      // Backend returns array of variations directly
      return { plans: Array.isArray(data) ? data : [] };
    },
    enabled: enabled && !!network,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const usePurchaseData = () => {
  return useMutation({
    mutationFn: async (payload: {
      network: string;
      phone: string;
      productCode: string;
      isSME: boolean;
      pin: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const { data } = await apiClient.post('/vtu/data/purchase', payload);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success({
        title: 'Data Purchase Successful',
        message: `Data bundle sent to ${data.recipient}`,
      });

      // Show cashback redemption notification
      if (variables.useCashback && variables.cashbackAmount && variables.cashbackAmount > 0) {
        toast.cashback.redeemed(variables.cashbackAmount);
      }

      // Show cashback earned notification (if cashback was earned)
      if (data.cashbackEarned && data.cashbackEarned > 0) {
        // Show special notification for large cashback (>= ₦50)
        if (data.cashbackEarned >= 50) {
          toast.cashback.largeEarning(data.cashbackEarned, 'Data');
        } else {
          toast.cashback.earned(data.cashbackEarned, 'Data');
        }
      }
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Purchase Failed',
        message: apiError.message || 'Failed to purchase data',
      });
    },
  });
};

// ==================== CABLE TV ====================

export const useCableTVPlans = (provider: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['cable-tv-plans', provider],
    queryFn: async () => {
      const { data } = await apiClient.get(`/vtu/cable-tv/plans/${provider}`);
      // Backend returns array of variations directly
      return { plans: Array.isArray(data) ? data : [] };
    },
    enabled: enabled && !!provider,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useVerifySmartcard = () => {
  return useMutation({
    mutationFn: async (payload: { provider: string; smartcardNumber: string }) => {
      const { data } = await apiClient.post('/vtu/cable-tv/verify', payload);
      return data;
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Verification Failed',
        message: apiError.message || 'Failed to verify smartcard',
      });
    },
  });
};

export const usePayCableTV = () => {
  return useMutation({
    mutationFn: async (payload: {
      provider: string;
      smartcardNumber: string;
      subscriptionType: string;
      productCode: string;
      quantity: number;
      phone: string;
      pin: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const { data } = await apiClient.post('/vtu/cable-tv/pay', payload);
      return data;
    },
    onSuccess: (data, variables) => {
      // console.log({ data });
      toast.success({
        title: 'Payment Successful',
        message: `${data.provider} subscription successful`,
      });

      // Show cashback redemption notification
      if (variables.useCashback && variables.cashbackAmount && variables.cashbackAmount > 0) {
        toast.cashback.redeemed(variables.cashbackAmount);
      }

      // Show cashback earned notification (if cashback was earned)
      if (data.cashbackEarned && data.cashbackEarned > 0) {
        // Show special notification for large cashback (>= ₦50)
        if (data.cashbackEarned >= 50) {
          toast.cashback.largeEarning(data.cashbackEarned, 'Cable TV');
        } else {
          toast.cashback.earned(data.cashbackEarned, 'Cable TV');
        }
      }
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Payment Failed',
        message: apiError.message || 'Failed to process payment',
      });
    },
  });
};

// ==================== ELECTRICITY ====================

export const useElectricityProviders = () => {
  return useQuery({
    queryKey: ['electricity-providers'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get('/vtu/electricity/providers');
        // Backend returns array directly, not wrapped in providers key
        // Filter out any null/undefined values
        const providers = Array.isArray(data) ? data.filter((p) => p && p.code) : [];
        return providers;
      } catch (error) {
        console.error('Failed to fetch electricity providers:', error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useVerifyMeter = () => {
  return useMutation({
    mutationFn: async (payload: { disco: string; meterNumber: string; meterType: string }) => {
      const { data } = await apiClient.post('/vtu/electricity/verify', payload);
      return data;
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Verification Failed',
        message: apiError.message || 'Failed to verify meter number',
      });
    },
  });
};

export const usePayElectricity = () => {
  return useMutation({
    mutationFn: async (payload: {
      disco: string;
      meterNumber: string;
      meterType: string;
      amount: number;
      phone: string;
      pin: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const { data } = await apiClient.post('/vtu/electricity/pay', payload);

      return data;
    },
    onSuccess: (data, variables) => {
      if (data.meterToken) {
        toast.success({
          title: 'Payment Successful',
          message: `Token: ${data.meterToken}`,
        });
      } else {
        toast.success({
          title: 'Payment Successful',
          message: 'Electricity payment processed successfully',
        });
      }

      // Show cashback redemption notification
      if (variables.useCashback && variables.cashbackAmount && variables.cashbackAmount > 0) {
        toast.cashback.redeemed(variables.cashbackAmount);
      }

      // Show cashback earned notification (if cashback was earned)
      if (data.cashbackEarned && data.cashbackEarned > 0) {
        // Show special notification for large cashback (>= ₦50)
        if (data.cashbackEarned >= 50) {
          toast.cashback.largeEarning(data.cashbackEarned, 'Electricity');
        } else {
          toast.cashback.earned(data.cashbackEarned, 'Electricity');
        }
      }
    },
    onError: (error) => {
      const apiError = handleApiError(error);

      toast.error({
        title: 'Payment Failed',
        message: apiError.message || 'Failed to process payment',
      });
    },
  });
};

// ==================== SHOWMAX ====================

export const useShowmaxPlans = () => {
  return useQuery({
    queryKey: ['showmax-plans'],
    queryFn: async () => {
      const { data } = await apiClient.get('/vtu/showmax/plans');
      // Backend returns array of variations directly
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const usePayShowmax = () => {
  return useMutation({
    mutationFn: async (payload: { phoneNumber: string; productCode: string; pin: string }) => {
      const { data } = await apiClient.post('/vtu/showmax/pay', payload);
      return data;
    },
    onSuccess: (data) => {
      toast.success({
        title: 'Showmax Subscription Successful',
        message: data.order.voucher ? `Voucher: ${data.order.voucher}` : 'Subscription successful',
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Payment Failed',
        message: apiError.message || 'Failed to process Showmax payment',
      });
    },
  });
};

// ==================== INTERNATIONAL AIRTIME ====================

export const useInternationalCountries = () => {
  return useQuery({
    queryKey: ['international-countries'],
    queryFn: async () => {
      const { data } = await apiClient.get('/vtu/international/countries');
      // Backend returns array directly
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useInternationalProductTypes = (countryCode: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['international-product-types', countryCode],
    queryFn: async () => {
      const { data } = await apiClient.get(`/vtu/international/product-types/${countryCode}`);

      // Backend returns { data: [...] } structure
      const productTypes = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Transform product_type_id to id for consistency with component
      return productTypes.map((pt: any) => ({
        ...pt,
        id: pt.product_type_id || pt.id,
      }));
    },
    enabled: enabled && !!countryCode,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useInternationalOperators = (
  countryCode: string,
  productTypeId: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ['international-operators', countryCode, productTypeId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/vtu/international/operators/${countryCode}/${productTypeId}`,
      );

      // Backend returns { data: [...] } structure or array directly
      const operators = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

      // Transform operator_id to id for consistency with component
      return operators.map((op: any) => ({
        ...op,
        id: op.operator_id || op.id,
      }));
    },
    enabled: enabled && !!countryCode && !!productTypeId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const useInternationalVariations = (
  operatorId: string,
  productTypeId: string,
  enabled: boolean = true,
) => {
  return useQuery({
    queryKey: ['international-variations', operatorId, productTypeId],
    queryFn: async () => {
      const { data } = await apiClient.get(
        `/vtu/international/variations/${operatorId}/${productTypeId}`,
      );
      // Backend returns { data: [...] } structure or array directly
      return Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    },
    enabled: enabled && !!operatorId && !!productTypeId,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const usePurchaseInternationalAirtime = () => {
  return useMutation({
    mutationFn: async (payload: {
      billersCode: string;
      variationCode: string;
      operatorId: string;
      countryCode: string;
      productTypeId: string;
      email?: string;
      phone: string;
      pin: string;
      useCashback?: boolean;
      cashbackAmount?: number;
    }) => {
      const { data } = await apiClient.post('/vtu/international/purchase', payload);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success({
        title: 'International Airtime Purchase Successful',
        message: `Airtime sent to ${data.order.recipient}`,
      });

      // Show cashback redemption toast if used
      if (variables.useCashback && variables.cashbackAmount && variables.cashbackAmount > 0) {
        toast.cashback.redeemed(variables.cashbackAmount);
      }
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Purchase Failed',
        message: apiError.message || 'Failed to purchase international airtime',
      });
    },
  });
};

// ==================== BANKS (for withdrawals) ====================

export const useBanks = () => {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async () => {
      const { data } = await apiClient.get('/transactions/banks');
      // Backend returns array directly
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useResolveAccount = () => {
  return useMutation({
    mutationFn: async (payload: { accountNumber: string; bankCode: string }) => {
      const { data } = await apiClient.post('/transactions/resolve-account', payload);
      return data;
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Verification Failed',
        message: apiError.message || 'Failed to verify account',
      });
    },
  });
};

// ==================== SAVED RECIPIENTS ====================

export interface SavedRecipient {
  id: string;
  serviceType: 'AIRTIME' | 'DATA' | 'CABLE_TV' | 'ELECTRICITY';
  provider: string;
  recipient: string;
  recipientName: string | null;
  lastUsedAt: string;
  usageCount: number;
}

export const useSavedRecipients = (
  serviceType?: 'AIRTIME' | 'DATA' | 'CABLE_TV' | 'ELECTRICITY',
) => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ['saved-recipients', serviceType],
    queryFn: async () => {
      const params = serviceType ? `?serviceType=${serviceType}` : '';
      const { data } = await apiClient.get(`/vtu/saved-recipients${params}`);
      return Array.isArray(data) ? data : [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isAuthenticated,
  });
};

export const useUpdateSavedRecipient = () => {
  return useMutation({
    mutationFn: async (payload: { recipientId: string; recipientName: string }) => {
      const { data } = await apiClient.post(`/vtu/saved-recipients/${payload.recipientId}`, {
        recipientName: payload.recipientName,
      });
      return data;
    },
    onSuccess: () => {
      toast.success({
        title: 'Success',
        message: 'Recipient name updated successfully',
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Update Failed',
        message: apiError.message || 'Failed to update recipient name',
      });
    },
  });
};

export const useDeleteSavedRecipient = () => {
  return useMutation({
    mutationFn: async (recipientId: string) => {
      const { data } = await apiClient.post(`/vtu/saved-recipients/${recipientId}/delete`);
      return data;
    },
    onSuccess: () => {
      toast.success({
        title: 'Success',
        message: 'Recipient removed successfully',
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Delete Failed',
        message: apiError.message || 'Failed to remove recipient',
      });
    },
  });
};
