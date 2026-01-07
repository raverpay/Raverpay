import * as Sentry from "@sentry/react-native";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  showDialog?: boolean;
}

const DefaultFallback = ({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) => (
  <View className="flex-1 items-center justify-center p-6 bg-white dark:bg-gray-800">
    <View className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl max-w-md">
      <Text className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4 text-center">
        Oops! Something went wrong
      </Text>

      {__DEV__ && (
        <View className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg mb-4">
          <Text className="text-xs font-mono text-red-800 dark:text-red-200">
            {error.message}
          </Text>
        </View>
      )}

      <Text className="text-center text-gray-600 dark:text-gray-300 mb-6">
        {__DEV__
          ? "An error occurred in the application. Check the console for more details."
          : "We encountered an unexpected error. Please try again."}
      </Text>

      <TouchableOpacity
        onPress={resetError}
        className="bg-primary px-6 py-3 rounded-lg active:opacity-80"
      >
        <Text className="text-white font-semibold text-center text-base">
          Try Again
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Sentry-integrated error boundary for catching React errors
 *
 * Usage:
 * ```tsx
 * <SentryErrorBoundary>
 *   <YourComponent />
 * </SentryErrorBoundary>
 * ```
 *
 * With custom fallback:
 * ```tsx
 * <SentryErrorBoundary fallback={CustomErrorComponent}>
 *   <YourComponent />
 * </SentryErrorBoundary>
 * ```
 */
export const SentryErrorBoundary: React.FC<Props> = ({
  children,
  fallback: FallbackComponent,
  showDialog = false,
}) => {
  const fallbackRender = FallbackComponent
    ? ({ error, resetError }: { error: unknown; resetError: () => void }) => (
        <FallbackComponent error={error as Error} resetError={resetError} />
      )
    : ({ error, resetError }: { error: unknown; resetError: () => void }) => (
        <DefaultFallback error={error as Error} resetError={resetError} />
      );

  return (
    <Sentry.ErrorBoundary
      fallback={fallbackRender}
      showDialog={showDialog}
      beforeCapture={(scope) => {
        scope.setTag("error_boundary", "react");
        scope.setLevel("error");
      }}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};

/**
 * Higher-order component to wrap a component with error boundary
 *
 * Usage:
 * ```tsx
 * export default withSentryErrorBoundary(MyComponent);
 * ```
 */
export function withSentryErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
    showDialog?: boolean;
  }
) {
  const WrappedComponent = (props: P) => (
    <SentryErrorBoundary
      fallback={options?.fallback}
      showDialog={options?.showDialog}
    >
      <Component {...props} />
    </SentryErrorBoundary>
  );

  WrappedComponent.displayName = `withSentryErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`;

  return WrappedComponent;
}
