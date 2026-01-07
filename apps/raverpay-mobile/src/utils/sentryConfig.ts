import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const SENSITIVE_FIELDS = [
  "firstName",
  "lastName",
  "password",
  "pin",
  "token",
  "bvn",
  "nin",
  "amount",
  "balance",
  "accountNumber",
  "cardNumber",
  "cvv",
  "dateOfBirth",
  "address",
  "accessToken",
  "refreshToken",
  "authorization",
  "apiKey",
  "encryptionKey",
  "privateKey",
  "mnemonic",
  "seed",
];

/**
 * Recursively scrubs sensitive data from objects
 */
function scrubObject(obj: any, depth = 0): any {
  if (depth > 10) return "[Max Depth Reached]";
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item, depth + 1));
  }

  const scrubbed: any = {};
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field))) {
      scrubbed[key] = "[Filtered]";
    } else {
      scrubbed[key] = scrubObject(obj[key], depth + 1);
    }
  }
  return scrubbed;
}

/**
 * Scrubs sensitive data from Sentry events before sending
 */
function scrubSensitiveData(
  event: Sentry.Event,
  hint?: any
): Sentry.Event | null {
  try {
    // Scrub user context
    if (event.user) {
      SENSITIVE_FIELDS.forEach((field) => {
        if (event.user?.[field]) {
          delete event.user[field];
        }
      });
    }

    // Scrub request data
    if (event.request?.data) {
      try {
        const data =
          typeof event.request.data === "string"
            ? JSON.parse(event.request.data)
            : event.request.data;
        const scrubbedData = scrubObject(data);
        event.request.data =
          typeof event.request.data === "string"
            ? JSON.stringify(scrubbedData)
            : scrubbedData;
      } catch {
        // If parsing fails, redact entire request data
        event.request.data = "[Filtered]";
      }
    }

    // Scrub request headers
    if (event.request?.headers) {
      const sensitiveHeaders = [
        "authorization",
        "cookie",
        "x-api-key",
        "x-auth-token",
      ];
      sensitiveHeaders.forEach((header) => {
        if (event.request?.headers?.[header]) {
          event.request.headers[header] = "[Filtered]";
        }
      });
    }

    // Scrub contexts
    if (event.contexts) {
      Object.keys(event.contexts).forEach((contextKey) => {
        const context = event.contexts?.[contextKey];
        if (context && typeof context === "object") {
          event.contexts![contextKey] = scrubObject(context);
        }
      });
    }

    // Scrub breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data) {
          breadcrumb.data = scrubObject(breadcrumb.data);
        }
        if (breadcrumb.message) {
          // Scrub potential sensitive data from messages
          let message = breadcrumb.message;
          SENSITIVE_FIELDS.forEach((field) => {
            const regex = new RegExp(`${field}["\s:=]+[^"\s,}]+`, "gi");
            message = message.replace(regex, `${field}: [Filtered]`);
          });
          breadcrumb.message = message;
        }
        return breadcrumb;
      });
    }

    // Scrub exception values
    if (event.exception?.values) {
      event.exception.values = event.exception.values.map((exception) => {
        if (exception.value) {
          let value = exception.value;
          SENSITIVE_FIELDS.forEach((field) => {
            const regex = new RegExp(`${field}["\s:=]+[^"\s,}]+`, "gi");
            value = value.replace(regex, `${field}: [Filtered]`);
          });
          exception.value = value;
        }
        return exception;
      });
    }

    return event;
  } catch (error) {
    console.error("[Sentry] Error scrubbing sensitive data:", error);
    return event;
  }
}

/**
 * Initialize Sentry with privacy-first configuration
 */
export function initializeSentry() {
  const environment = __DEV__
    ? "development"
    : Constants.expoConfig?.extra?.environment || "production";

  const dsn = Constants.expoConfig?.extra?.sentryDsn;

  if (!dsn && !__DEV__) {
    console.warn("[Sentry] No DSN configured, Sentry will not be initialized");
    return;
  }

  Sentry.init({
    dsn,
    environment,
    enabled: !__DEV__, // Disabled in development, enabled in production
    debug: __DEV__, // Enable debug logs in development
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,

    // Tracing
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Session Replay
    _experiments: {
      replaysSessionSampleRate: __DEV__ ? 1.0 : 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of error sessions
    },

    integrations: [
      Sentry.mobileReplayIntegration({
        maskAllText: true,
        maskAllImages: true,
        maskAllVectors: true,
      }),
    ],

    beforeSend: (event, hint) => scrubSensitiveData(event, hint) as any,

    // Ignore specific errors that are not actionable
    ignoreErrors: [
      "Network request failed",
      "Timeout",
      "AbortError",
      /^ResizeObserver/,
      "Aborted",
      "cancelled",
      /Network Error/i,
      "Load failed",
      /cancelled by user/i,
    ],

    // Attach stack traces to messages
    attachStacktrace: true,

    // Maximum breadcrumbs to keep
    maxBreadcrumbs: 50,

    // Release version
    release: `${Constants.expoConfig?.slug}@${Constants.expoConfig?.version}`,
    dist: Constants.expoConfig?.version,
  });

  console.log("[Sentry] Initialized in", environment, "mode");
}

/**
 * Set user context with scrubbed data
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  phone?: string;
  kycTier?: string;
  accountStatus?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email, // Keep email for issue tracking
    phone: user.phone, // Keep phone for issue tracking
    kycTier: user.kycTier,
    accountStatus: user.accountStatus,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add custom context to Sentry events
 */
export function setCustomContext(key: string, data: Record<string, any>) {
  const scrubbedData = scrubObject(data);
  Sentry.setContext(key, scrubbedData);
}

/**
 * Add a breadcrumb for tracking user actions
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = "info",
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data: data ? scrubObject(data) : undefined,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
  }
) {
  Sentry.captureException(error, {
    level: context?.level || "error",
    tags: context?.tags,
    extra: context?.extra ? scrubObject(context.extra) : undefined,
  });
}

/**
 * Capture a message with additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) {
  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra ? scrubObject(context.extra) : undefined,
  });
}
