// src/services/user-controlled-wallet.service.ts
import { apiClient, handleApiError } from '../lib/api/client';
import { API_ENDPOINTS } from '../lib/api/endpoints';
import { CircleBlockchain } from '../types/circle.types';

/**
 * User-Controlled Wallet Service
 * Handles all operations for non-custodial Circle wallets
 */

// Types
export interface CreateCircleUserRequest {
  email?: string;
  authMethod: 'EMAIL' | 'PIN' | 'SOCIAL';
}

export interface CreateCircleUserResponse {
  id: string;
  circleUserId: string;
  authMethod: string;
  status: string;
}

export interface GetDeviceTokenRequest {
  email: string;
  deviceId: string;
}

export interface GetDeviceTokenResponse {
  deviceToken: string;
  deviceEncryptionKey: string;
  otpToken: string;
}

export interface GetUserTokenResponse {
  userToken: string;
  encryptionKey: string;
}

export interface InitializeUserWalletRequest {
  userToken: string;
  blockchain: CircleBlockchain;
  accountType: 'SCA' | 'EOA';
  circleUserId: string;
  isExistingUser?: boolean; // If true, uses createWallet instead of createUserPinWithWallets
}

export interface InitializeUserWalletResponse {
  challengeId: string;
}

export interface UserWallet {
  id: string;
  state: string;
  walletSetId: string;
  custodyType: string;
  userId: string;
  address: string;
  blockchain: string;
  accountType: string;
  createDate: string;
  updateDate: string;
}

export interface ListUserWalletsResponse {
  wallets: UserWallet[];
}

export interface UserStatus {
  id: string;
  status: string;
  createDate: string;
  pinStatus: string;
  pinDetails?: {
    failedAttempts: number;
  };
  securityQuestionStatus?: string;
  securityQuestionDetails?: {
    failedAttempts: number;
  };
}

export interface GetUserStatusResponse {
  user: UserStatus;
}

export interface CircleUser {
  id: string;
  userId: string;
  circleUserId: string;
  authMethod: string;
  email?: string;
  status: string;
  pinStatus?: string;
  securityQuestionStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetCircleUserResponse {
  user: CircleUser;
}

export interface UpdateCircleUserStatusRequest {
  status?: string;
  pinStatus?: string;
  securityQuestionStatus?: string;
}

export interface SecurityQuestionItem {
  questionId: string;
  questionText: string;
  questionIndex: number;
}

export interface SaveSecurityQuestionsRequest {
  circleUserId: string;
  questions: SecurityQuestionItem[];
}

export interface GetSecurityQuestionsResponse {
  questions: SecurityQuestionItem[];
}

class UserControlledWalletService {
  /**
   * Create a Circle user for user-controlled wallets
   */
  async createCircleUser(data: CreateCircleUserRequest): Promise<CreateCircleUserResponse> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CIRCLE.USER_CONTROLLED.CREATE_USER, data);
      // Backend returns { success: true, data: {...} }
      console.log({ response });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Check if user has existing Circle user and wallets
   */
  async checkUserStatus(): Promise<{
    hasCircleUser: boolean;
    hasUserControlledWallet: boolean;
    circleUser: any | null;
    wallets: any[];
  }> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CIRCLE.USER_CONTROLLED.CHECK_STATUS);
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get Circle user by user ID
   */
  async getCircleUserByUserId(userId: string): Promise<GetCircleUserResponse> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.GET_USER_BY_USER_ID(userId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get Circle user by Circle user ID
   */
  async getCircleUserByCircleUserId(circleUserId: string): Promise<GetCircleUserResponse> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.GET_USER_BY_CIRCLE_USER_ID(circleUserId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Update Circle user status
   */
  async updateCircleUserStatus(
    circleUserId: string,
    data: UpdateCircleUserStatusRequest,
  ): Promise<GetCircleUserResponse> {
    try {
      const response = await apiClient.patch(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.UPDATE_USER_STATUS(circleUserId),
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get device token for email OTP authentication
   */
  async getDeviceToken(data: GetDeviceTokenRequest): Promise<GetDeviceTokenResponse> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.GET_DEVICE_TOKEN,
        data,
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get user token for Circle operations
   */
  async getUserToken(circleUserId: string): Promise<GetUserTokenResponse> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.GET_USER_TOKEN(circleUserId),
        { circleUserId },
      );
      // Backend returns { success: true, data: {...} }
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Initialize user with wallet
   */
  async initializeUserWithWallet(
    data: InitializeUserWalletRequest,
  ): Promise<InitializeUserWalletResponse> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.INITIALIZE_WALLET,
        data,
      );
      // Backend returns { success: true, data: {...} }
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * List user wallets
   */
  async listUserWallets(userToken: string): Promise<ListUserWalletsResponse> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CIRCLE.USER_CONTROLLED.LIST_WALLETS, {
        headers: {
          'X-User-Token': userToken,
        },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Sync wallets to database after challenge completion
   */
  async syncWalletsToDatabase(
    circleUserId: string,
    userToken: string,
  ): Promise<{ synced: number; wallets: any[] }> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CIRCLE.USER_CONTROLLED.SYNC_WALLETS, {
        circleUserId,
        userToken,
      });
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get user status
   */
  async getUserStatus(circleUserId: string): Promise<GetUserStatusResponse> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.GET_USER_STATUS(circleUserId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Save security questions metadata
   */
  async saveSecurityQuestions(
    circleUserId: string,
    questions: SecurityQuestionItem[],
  ): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.SAVE_SECURITY_QUESTIONS(circleUserId),
        { circleUserId, questions },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Get security questions metadata
   */
  async getSecurityQuestions(circleUserId: string): Promise<GetSecurityQuestionsResponse> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.GET_SECURITY_QUESTIONS(circleUserId),
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Create a transaction (returns challengeId for SDK signing)
   */
  async createTransaction(params: {
    walletId: string;
    destinationAddress: string;
    amount: string;
    feeLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
    memo?: string;
  }): Promise<{
    challengeId: string;
    userToken: string;
    encryptionKey: string;
    walletId: string;
  }> {
    try {
      const response = await apiClient.post(
        API_ENDPOINTS.CIRCLE.USER_CONTROLLED.CREATE_TRANSACTION,
        params,
      );
      return response.data.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const userControlledWalletService = new UserControlledWalletService();
