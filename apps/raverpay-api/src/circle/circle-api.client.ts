import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { CircleConfigService } from './config/circle.config.service';
import { CircleApiResponse, CircleApiError } from './circle.types';
import { randomUUID } from 'crypto';

/**
 * Circle API Client
 * Handles all HTTP communication with Circle's API
 */
@Injectable()
export class CircleApiClient {
  private readonly logger = new Logger(CircleApiClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly config: CircleConfigService) {
    // Create axios instance with base configuration
    this.httpClient = axios.create({
      baseURL: this.config.apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.config.getAuthHeader(),
      },
    });

    // Add request interceptor for logging
    this.httpClient.interceptors.request.use(
      (request) => {
        this.logger.debug(
          `Circle API Request: ${request.method?.toUpperCase()} ${request.url}`,
        );
        return request;
      },
      (error: Error) => {
        this.logger.error('Circle API Request Error:', error);
        return Promise.reject(error);
      },
    );

    // Add response interceptor for logging and error handling
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `Circle API Response: ${response.status} ${response.config.url}`,
        );
        return response;
      },
      (error: AxiosError<CircleApiError>) => {
        this.logApiError(error);
        return Promise.reject(this.transformError(error));
      },
    );
  }

  /**
   * Generate a unique idempotency key
   */
  generateIdempotencyKey(): string {
    return randomUUID();
  }

  /**
   * Make a GET request to Circle API
   */
  async get<T>(
    endpoint: string,
    params?: object,
  ): Promise<CircleApiResponse<T>> {
    const response = await this.httpClient.get<CircleApiResponse<T>>(endpoint, {
      params,
    });
    return response.data;
  }

  /**
   * Make a POST request to Circle API
   */
  async post<T>(
    endpoint: string,
    data: object,
    headers?: Record<string, string>,
  ): Promise<CircleApiResponse<T>> {
    const response = await this.httpClient.post<CircleApiResponse<T>>(
      endpoint,
      data,
      { headers },
    );
    return response.data;
  }

  /**
   * Make a PUT request to Circle API
   */
  async put<T>(endpoint: string, data: object): Promise<CircleApiResponse<T>> {
    const response = await this.httpClient.put<CircleApiResponse<T>>(
      endpoint,
      data,
    );
    return response.data;
  }

  /**
   * Make a DELETE request to Circle API
   */
  async delete<T>(endpoint: string): Promise<CircleApiResponse<T>> {
    const response =
      await this.httpClient.delete<CircleApiResponse<T>>(endpoint);
    return response.data;
  }

  /**
   * Log API errors with details
   */
  private logApiError(error: AxiosError<CircleApiError>): void {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const code = error.response?.data?.code;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    this.logger.error(
      `Circle API Error: ${method} ${url} - Status: ${status}, Code: ${code}, Message: ${message}`,
    );

    if (error.response?.data) {
      this.logger.error('Error Response:', JSON.stringify(error.response.data));
    }
  }

  /**
   * Transform Axios error to a more usable format
   */
  private transformError(error: AxiosError<CircleApiError>): Error {
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.message || error.message || 'Circle API Error';
    const code = error.response?.data?.code;

    const transformedError = new Error(message);
    (transformedError as any).status = status;
    (transformedError as any).code = code;
    (transformedError as any).isCircleApiError = true;

    return transformedError;
  }

  /**
   * Check if error is a Circle API error
   */
  isCircleApiError(error: unknown): boolean {
    return (error as any)?.isCircleApiError === true;
  }

  /**
   * Get error status code
   */
  getErrorStatus(error: unknown): number {
    return (error as any)?.status || 500;
  }

  /**
   * Get error code from Circle API
   */
  getErrorCode(error: unknown): number | undefined {
    return (error as any)?.code;
  }
}
