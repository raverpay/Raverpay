import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { VenlyOAuthToken, VENLY_AUTH_URL } from './venly.types';

/**
 * Venly OAuth Authentication Service
 * Handles OAuth token management for Venly API
 * Based on official Venly API Reference
 */
@Injectable()
export class VenlyAuthService {
  private readonly logger = new Logger(VenlyAuthService.name);
  private readonly httpClient: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private readonly environment: 'sandbox' | 'production';

  constructor() {
    this.httpClient = axios.create({
      timeout: 30000,
    });

    // Determine environment
    this.environment =
      (process.env.VENLY_ENV as 'sandbox' | 'production') || 'sandbox';
    this.logger.log(`Venly environment: ${this.environment}`);
  }

  /**
   * Get valid access token (fetches new one if expired)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiresAt) {
      const now = new Date();
      const bufferTime = 30 * 1000; // 30 seconds buffer (tokens expire in 300s)

      if (this.tokenExpiresAt.getTime() - now.getTime() > bufferTime) {
        return this.accessToken;
      }
    }

    // Fetch new token
    return this.fetchNewToken();
  }

  /**
   * Fetch new OAuth token from Venly
   * Token expires in 300 seconds (5 minutes)
   */
  private async fetchNewToken(): Promise<string> {
    try {
      const clientId = process.env.VENLY_CLIENT_ID;
      const clientSecret = process.env.VENLY_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          'Venly credentials not configured. Please set VENLY_CLIENT_ID and VENLY_CLIENT_SECRET',
        );
      }

      const authUrl = VENLY_AUTH_URL[this.environment];
      this.logger.log(`Fetching new Venly OAuth token from ${authUrl}...`);

      const response = await this.httpClient.post<VenlyOAuthToken>(
        authUrl,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, expires_in } = response.data;

      // Cache token
      this.accessToken = access_token;
      this.tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

      this.logger.log('Venly OAuth token fetched successfully');
      this.logger.debug(
        `Token expires at: ${this.tokenExpiresAt.toISOString()}`,
      );
      this.logger.debug(`Token expires in: ${expires_in} seconds`);

      return access_token;
    } catch (error) {
      this.logger.error('Failed to fetch Venly OAuth token', error);

      if (axios.isAxiosError(error) && error.response) {
        this.logger.error('Response data:', error.response.data);
        this.logger.error('Response status:', error.response.status);
      }

      throw new Error('Failed to authenticate with Venly');
    }
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  clearToken(): void {
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.logger.log('Venly OAuth token cleared');
  }

  /**
   * Get authorization headers for Venly API requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Get environment
   */
  getEnvironment(): 'sandbox' | 'production' {
    return this.environment;
  }
}
