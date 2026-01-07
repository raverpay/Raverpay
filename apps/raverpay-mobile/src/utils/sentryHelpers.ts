import * as Sentry from "@sentry/react-native";

/**
 * Wrap an async function with Sentry span tracking (Sentry v7 compatible)
 */
export async function withSpan<T>(
  op: string,
  name: string,
  fn: () => Promise<T>,
  data?: Record<string, any>
): Promise<T> {
  return Sentry.startSpan({ op, name, attributes: data }, async () => {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      throw error;
    }
  });
}

/**
 * Track API call performance and errors
 */
export async function trackApiCall<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>,
  additionalData?: Record<string, any>
): Promise<T> {
  return withSpan(
    "http.client",
    `${method} ${endpoint}`,
    async () => {
      try {
        const result = await fn();
        return result;
      } catch (error: any) {
        Sentry.captureException(error, {
          tags: {
            endpoint,
            method,
            status: error?.response?.status || "unknown",
          },
          extra: additionalData,
        });
        throw error;
      }
    },
    { endpoint, method, ...additionalData }
  );
}

/**
 * Track VTU service operations
 */
export async function trackVtuOperation<T>(
  operation: string,
  provider: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    "vtu.operation",
    operation,
    async () => {
      try {
        const result = await fn();
        Sentry.setTag("vtu.success", "true");
        return result;
      } catch (error: any) {
        Sentry.setTag("vtu.success", "false");
        Sentry.captureException(error, {
          tags: {
            vtu_operation: operation,
            vtu_provider: provider,
          },
        });
        throw error;
      }
    },
    { provider, operation }
  );
}

/**
 * Track Circle wallet operations
 */
export async function trackCircleOperation<T>(
  operation: string,
  network?: string,
  fn?: () => Promise<T>
): Promise<T | void> {
  return withSpan(
    "circle.operation",
    operation,
    async () => {
      try {
        const result = fn ? await fn() : undefined;
        Sentry.setTag("circle.success", "true");
        return result;
      } catch (error: any) {
        Sentry.setTag("circle.success", "false");
        Sentry.captureException(error, {
          tags: {
            circle_operation: operation,
            circle_network: network || "unknown",
          },
        });
        throw error;
      }
    },
    { operation, network }
  );
}

/**
 * Track P2P transfer operations
 */
export async function trackP2pOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    "p2p.operation",
    operation,
    async () => {
      try {
        const result = await fn();
        Sentry.setTag("p2p.success", "true");
        return result;
      } catch (error: any) {
        Sentry.setTag("p2p.success", "false");
        Sentry.captureException(error, {
          tags: {
            p2p_operation: operation,
          },
        });
        throw error;
      }
    },
    { operation }
  );
}

/**
 * Track authentication operations
 */
export async function trackAuthOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    "auth.operation",
    operation,
    async () => {
      try {
        const result = await fn();
        Sentry.setTag("auth.success", "true");
        return result;
      } catch (error: any) {
        Sentry.setTag("auth.success", "false");
        Sentry.captureException(error, {
          tags: {
            auth_operation: operation,
          },
        });
        throw error;
      }
    },
    { operation }
  );
}

/**
 * Track wallet operations (fund, withdraw)
 */
export async function trackWalletOperation<T>(
  operation: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  return withSpan(
    "wallet.operation",
    operation,
    async () => {
      try {
        const result = await fn();
        Sentry.setTag("wallet.success", "true");
        return result;
      } catch (error: any) {
        Sentry.setTag("wallet.success", "false");
        Sentry.captureException(error, {
          tags: {
            wallet_operation: operation,
            wallet_method: method,
          },
        });
        throw error;
      }
    },
    { operation, method }
  );
}
