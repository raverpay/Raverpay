// hooks/useP2P.ts
import { handleApiError } from '@/src/lib/api/client';
import { toast } from '@/src/lib/utils/toast';
import {
  getP2PHistory,
  lookupUserByTag,
  sendP2PTransfer,
  setUserTag,
} from '@/src/services/p2p.service';
import { useUserStore } from '@/src/store/user.store';
import { useWalletStore } from '@/src/store/wallet.store';
import type {
  LookupUserResponse,
  P2PHistoryResponse,
  SendP2PRequest,
  SendP2PResponse,
  SetTagResponse,
} from '@/src/types/api.types';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook for setting/updating user's @tag
 */
export const useSetTag = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useUserStore();

  const mutation = useMutation({
    mutationFn: async (tag: string) => {
      return await setUserTag(tag);
    },
    onSuccess: (data: SetTagResponse) => {
      // Update user in store
      updateUser({
        tag: data.tag,
        tagChangedCount: (useUserStore.getState().user?.tagChangedCount || 0) + 1,
      });

      // Invalidate user query
      queryClient.invalidateQueries({ queryKey: ['user'] });

      toast.success({
        title: 'Success!',
        message: data.message,
      });
    },
    onError: (error) => {
      const apiError = handleApiError(error);
      toast.error({
        title: 'Failed',
        message: apiError.message || 'Failed to set username',
      });
    },
  });

  return {
    setTag: mutation.mutateAsync,
    isSettingTag: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook for looking up a user by @tag
 */
export const useLookupTag = (tag: string, enabled: boolean = false) => {
  return useQuery<LookupUserResponse>({
    queryKey: ['lookup-tag', tag],
    queryFn: () => lookupUserByTag(tag),
    enabled: enabled && tag.length >= 3,
    retry: false,
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook for sending P2P transfers
 */
export const useSendP2P = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: SendP2PRequest) => {
      return await sendP2PTransfer(payload);
    },
    onSuccess: (data: SendP2PResponse) => {
      // Invalidate wallet and transactions
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['p2p-history'] });

      toast.success({
        title: 'Money Sent!',
        message: `Successfully sent to @${data.recipient.tag}`,
      });
    },
    onError: (error: any) => {
      const apiError = handleApiError(error);

      // Handle specific error cases
      if (apiError.statusCode === 403) {
        if (apiError.message?.includes('verification')) {
          // TIER_0 error - needs KYC upgrade
          toast.error({
            title: 'Verification Required',
            message: apiError.message,
          });
        } else if (apiError.message?.includes('limit')) {
          // Tier limit reached
          toast.error({
            title: 'Transaction Limit',
            message: apiError.message,
          });
        } else if (apiError.message?.includes('PIN')) {
          // Incorrect PIN
          toast.error({
            title: 'Incorrect PIN',
            message: 'Please check your PIN and try again',
          });
        } else {
          toast.error({
            title: 'Access Denied',
            message: apiError.message,
          });
        }
      } else if (apiError.statusCode === 400) {
        // Bad request - insufficient balance, invalid amount, etc.
        toast.error({
          title: 'Transfer Failed',
          message: apiError.message,
        });
      } else if (apiError.statusCode === 404) {
        // User not found
        toast.error({
          title: 'User Not Found',
          message: 'The @username you entered does not exist',
        });
      } else {
        toast.error({
          title: 'Transfer Failed',
          message: apiError.message || 'An error occurred',
        });
      }
    },
  });

  return {
    sendP2P: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  };
};

/**
 * Hook for fetching P2P transfer history with infinite scroll
 */
export const useP2PHistory = (limit: number = 20) => {
  return useInfiniteQuery<P2PHistoryResponse>({
    queryKey: ['p2p-history'],
    queryFn: ({ pageParam = 1 }) => getP2PHistory(pageParam as number, limit),
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to check user's P2P permissions based on KYC tier
 */
export const useP2PPermissions = () => {
  const { user } = useUserStore();
  const { singleTransactionLimit } = useWalletStore();

  const canSendP2P = user?.kycTier !== 'TIER_0';
  const canReceiveP2P = true; // All tiers can receive
  const canSetTag = true; // All tiers can set tag

  const transactionLimit = parseFloat(singleTransactionLimit?.toString() || '0');

  const remainingTagChanges = 3 - (user?.tagChangedCount || 0);
  const canChangeTag = remainingTagChanges > 0;

  return {
    canSendP2P,
    canReceiveP2P,
    canSetTag,
    canChangeTag,
    transactionLimit,
    remainingTagChanges,
    hasTag: !!user?.tag,
    userTag: user?.tag,
  };
};
