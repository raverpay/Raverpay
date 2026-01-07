// services/p2p.service.ts
import { apiClient } from '@/src/lib/api/client';
import { API_ENDPOINTS } from '@/src/lib/api/endpoints';
import type {
  LookupUserResponse,
  P2PHistoryResponse,
  SendP2PRequest,
  SendP2PResponse,
  SetTagRequest,
  SetTagResponse,
} from '@/src/types/api.types';

/**
 * Set or update user's P2P username (@tag)
 * Users can change their tag up to 3 times
 */
export const setUserTag = async (tag: string): Promise<SetTagResponse> => {
  const response = await apiClient.post<SetTagResponse>(API_ENDPOINTS.TRANSACTIONS.SET_TAG, {
    tag,
  } as SetTagRequest);
  return response.data;
};

/**
 * Lookup a user by their @tag
 * Returns user's name and avatar for confirmation before sending
 */
export const lookupUserByTag = async (tag: string): Promise<LookupUserResponse> => {
  const response = await apiClient.get<LookupUserResponse>(
    API_ENDPOINTS.TRANSACTIONS.LOOKUP_TAG(tag),
  );
  return response.data;
};

/**
 * Send money to another user via their @tag
 * Requires PIN verification
 */
export const sendP2PTransfer = async (payload: SendP2PRequest): Promise<SendP2PResponse> => {
  const response = await apiClient.post<SendP2PResponse>(
    API_ENDPOINTS.TRANSACTIONS.SEND_P2P,
    payload,
  );
  return response.data;
};

/**
 * Get P2P transfer history (sent and received)
 */
export const getP2PHistory = async (
  page: number = 1,
  limit: number = 20,
): Promise<P2PHistoryResponse> => {
  const response = await apiClient.get<P2PHistoryResponse>(API_ENDPOINTS.TRANSACTIONS.P2P_HISTORY, {
    params: { page, limit },
  });
  return response.data;
};
