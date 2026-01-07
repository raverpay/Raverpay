// src/hooks/usePin.ts
import { apiClient, handleApiError } from "@/src/lib/api/client";
import { API_ENDPOINTS } from "@/src/lib/api/endpoints";
import { toast } from "@/src/lib/utils/toast";
import { useUserStore } from "@/src/store/user.store";
import { useMutation, useQuery } from "@tanstack/react-query";

// ==================== SET PIN (First Time) ====================

export const useSetPin = () => {
  const { updateUser } = useUserStore();

  return useMutation({
    mutationFn: async (payload: { pin: string; confirmPin: string }) => {
      const { data } = await apiClient.post(
        API_ENDPOINTS.USERS.SET_PIN,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      // Update user store with pinSetAt
      updateUser({
        pinSetAt: data.pinSetAt || new Date().toISOString(),
      });

      toast.success({
        title: "PIN Set Successfully",
        message: "Your transaction PIN has been created",
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: "Failed to Set PIN",
        message: apiError.message || "Failed to set transaction PIN",
      });
    },
  });
};

// ==================== CHANGE PIN ====================

export const useChangePin = () => {
  const { updateUser } = useUserStore();

  return useMutation({
    mutationFn: async (payload: {
      currentPin: string;
      newPin: string;
      confirmNewPin: string;
    }) => {
      const { data } = await apiClient.post(
        API_ENDPOINTS.USERS.CHANGE_PIN,
        payload
      );
      return data;
    },
    onSuccess: (data) => {
      // Update user store with new pinSetAt
      updateUser({
        pinSetAt: data.pinSetAt || new Date().toISOString(),
      });

      toast.success({
        title: "PIN Changed Successfully",
        message: "Your transaction PIN has been updated",
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: "Failed to Change PIN",
        message: apiError.message || "Failed to change transaction PIN",
      });
    },
  });
};

// ==================== VERIFY PIN (Test Only) ====================

export const useVerifyPin = () => {
  return useMutation({
    mutationFn: async (payload: { pin: string }) => {
      const { data } = await apiClient.post(
        API_ENDPOINTS.USERS.VERIFY_PIN,
        payload
      );
      return data;
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: "Invalid PIN",
        message: apiError.message || "The PIN you entered is incorrect",
      });
    },
  });
};

// ==================== CHECK PIN STATUS ====================

/**
 * Check if user has set a PIN by fetching their profile
 * This hook can be used to determine if we should show PIN setup screen
 */
export const useCheckPinStatus = () => {
  return useQuery({
    queryKey: ["pin-status"],
    queryFn: async () => {
      const { data } = await apiClient.get(API_ENDPOINTS.USERS.PROFILE);
      return {
        hasPinSet: !!data.pinSetAt,
        pinSetAt: data.pinSetAt,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
