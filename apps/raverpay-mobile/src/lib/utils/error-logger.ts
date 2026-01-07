// lib/utils/error-logger.ts
/**
 * Centralized Error Logging Utility
 *
 * Integrated with Sentry for production error tracking
 */

import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

type ErrorSeverity = "info" | "warning" | "error" | "fatal";

interface ErrorContext {
  [key: string]: any;
}

interface ErrorLogOptions {
  severity?: ErrorSeverity;
  context?: ErrorContext;
  tags?: Record<string, string>;
}

class ErrorLogger {
  private isDevelopment: boolean;
  private isEnabled: boolean;

  constructor() {
    this.isDevelopment = __DEV__;
    this.isEnabled = true;
  }

  /**
   * Log an error with context
   */
  log(error: Error | string, options: ErrorLogOptions = {}) {
    const { severity = "error", context = {}, tags = {} } = options;

    // In development, log to console
    if (this.isDevelopment) {
      this.logToConsole(error, severity, context, tags);
    }

    // In production, send to error tracking service
    if (!this.isDevelopment && this.isEnabled) {
      this.sendToErrorTrackingService(error, severity, context, tags);
    }
  }

  /**
   * Log to console (development only)
   */
  private logToConsole(
    error: Error | string,
    severity: ErrorSeverity,
    context: ErrorContext,
    tags: Record<string, string>
  ) {
    const timestamp = new Date().toISOString();
    const errorMessage = typeof error === "string" ? error : error.message;
    const errorStack = typeof error === "string" ? undefined : error.stack;

    console.group(`[${severity.toUpperCase()}] ${timestamp}`);
    console.error("Message:", errorMessage);

    if (errorStack) {
      console.error("Stack:", errorStack);
    }

    if (Object.keys(context).length > 0) {
      console.log("Context:", context);
    }

    if (Object.keys(tags).length > 0) {
      console.log("Tags:", tags);
    }

    console.groupEnd();
  }

  /**
   * Send to error tracking service (Sentry)
   */
  private sendToErrorTrackingService(
    error: Error | string,
    severity: ErrorSeverity,
    context: ErrorContext,
    tags: Record<string, string>
  ) {
    try {
      Sentry.withScope((scope) => {
        // Set severity level
        scope.setLevel(this.mapSeverityToSentryLevel(severity));

        // Add context
        Object.keys(context).forEach((key) => {
          scope.setContext(key, { [key]: context[key] });
        });

        // Add tags
        Object.keys(tags).forEach((key) => {
          scope.setTag(key, tags[key]);
        });

        // Add app metadata
        scope.setTag("app.version", Constants.expoConfig?.version || "unknown");
        scope.setTag("app.environment", __DEV__ ? "development" : "production");

        // Capture exception or message
        if (typeof error === "string") {
          Sentry.captureMessage(error);
        } else {
          Sentry.captureException(error);
        }
      });
    } catch (sentryError) {
      // Fallback to console if Sentry fails
      console.error("[ErrorLogger] Failed to send to Sentry:", sentryError);
    }
  }

  /**
   * Map error severity to Sentry level
   */
  private mapSeverityToSentryLevel(
    severity: ErrorSeverity
  ): Sentry.SeverityLevel {
    const mapping: Record<ErrorSeverity, Sentry.SeverityLevel> = {
      info: "info",
      warning: "warning",
      error: "error",
      fatal: "fatal",
    };
    return mapping[severity];
  }

  /**
   * Log info level message
   */
  info(message: string, context?: ErrorContext) {
    this.log(message, { severity: "info", context });
  }

  /**
   * Log warning
   */
  warn(message: string, context?: ErrorContext) {
    this.log(message, { severity: "warning", context });
  }

  /**
   * Log error
   */
  error(error: Error | string, context?: ErrorContext) {
    this.log(error, { severity: "error", context });
  }

  /**
   * Log fatal error
   */
  fatal(error: Error | string, context?: ErrorContext) {
    this.log(error, { severity: "fatal", context });
  }

  /**
   * Log authentication errors
   */
  logAuthError(error: Error | string, action: string) {
    this.error(error, {
      category: "authentication",
      action,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log API errors
   */
  logApiError(error: Error | string, endpoint: string, method: string) {
    this.error(error, {
      category: "api",
      endpoint,
      method,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log navigation errors
   */
  logNavigationError(error: Error | string, route: string) {
    this.error(error, {
      category: "navigation",
      route,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log payment/transaction errors
   */
  logTransactionError(error: Error | string, transactionType: string) {
    this.error(error, {
      category: "transaction",
      transactionType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Enable/disable error logging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();

// Export types
export type { ErrorContext, ErrorLogOptions, ErrorSeverity };
