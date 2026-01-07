// src/components/circle/CircleChallengeWebView.tsx
/**
 * WebView component for handling Circle SDK challenges
 * Replaces the native React Native SDK with Web SDK approach
 */

import React, { useCallback, useRef, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/src/components/ui';
import { useTheme } from '@/src/hooks/useTheme';

export interface CircleChallengeParams {
  appId: string;
  userToken: string;
  encryptionKey: string;
  challengeId: string;
}

export interface CircleChallengeResult {
  success: boolean;
  result?: any;
  error?: string;
}

interface CircleChallengeWebViewProps {
  visible: boolean;
  params: CircleChallengeParams | null;
  onComplete: (result: CircleChallengeResult) => void;
  onClose: () => void;
  title?: string;
}

export const CircleChallengeWebView: React.FC<CircleChallengeWebViewProps> = ({
  visible,
  params,
  onComplete,
  onClose,
  title = 'Secure Wallet',
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isDark } = useTheme();

  // Build URL to hosted Circle SDK page
  const getWebViewSource = useCallback(() => {
    if (!params) return { html: '<html><body>Loading...</body></html>' };

    // URL to your hosted Circle SDK page (raverpay-admin)
    // Production: https://myadmin.raverpay.com/circle-challenge
    // Development: set EXPO_PUBLIC_CIRCLE_SDK_URL env variable
    const baseUrl =
      process.env.EXPO_PUBLIC_CIRCLE_SDK_URL || 'https://myadmin.raverpay.com/circle-challenge';

    // Log the raw values before encoding
    console.log('[CircleWebView] Raw params:');
    console.log('  appId:', params.appId);
    console.log('  userToken length:', params.userToken?.length);
    console.log('  encryptionKey:', params.encryptionKey);
    console.log('  challengeId:', params.challengeId);

    // Use explicit encodeURIComponent to ensure proper encoding
    const queryString = [
      `appId=${encodeURIComponent(params.appId)}`,
      `userToken=${encodeURIComponent(params.userToken)}`,
      `encryptionKey=${encodeURIComponent(params.encryptionKey)}`,
      `challengeId=${encodeURIComponent(params.challengeId)}`,
    ].join('&');

    const fullUrl = `${baseUrl}?${queryString}`;
    console.log('[CircleWebView] Full URL:', fullUrl);

    return {
      uri: fullUrl,
    };
  }, [params]);

  // Handle messages from WebView
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data);
        console.log('[CircleWebView] Message received:', message.type);

        switch (message.type) {
          case 'initialized':
            console.log('[CircleWebView] SDK initialized');
            setIsLoading(false);
            break;

          case 'challengeComplete':
            console.log('[CircleWebView] Challenge complete:', message.data);
            onComplete({
              success: true,
              result: message.data.result,
            });
            break;

          case 'error':
            console.error('[CircleWebView] Error:', message.data);
            onComplete({
              success: false,
              error: message.data.error,
            });
            break;

          case 'closed':
            onClose();
            break;

          default:
            console.log('[CircleWebView] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('[CircleWebView] Failed to parse message:', error);
      }
    },
    [onComplete, onClose],
  );

  // Handle WebView errors
  const handleError = useCallback(
    (syntheticEvent: any) => {
      const { nativeEvent } = syntheticEvent;
      console.error('[CircleWebView] WebView error:', nativeEvent);
      onComplete({
        success: false,
        error: nativeEvent.description || 'Failed to load wallet interface',
      });
    },
    [onComplete],
  );

  if (!visible || !params) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? '#fff' : '#374151'} />
          </TouchableOpacity>
          <Text variant="h5" style={styles.title}>
            {title}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#5b55f6" />
            <Text variant="body" color="secondary" style={styles.loadingText}>
              Preparing secure environment...
            </Text>
          </View>
        )}

        {/* WebView */}
        <WebView
          ref={webViewRef}
          source={getWebViewSource()}
          style={styles.webview}
          onMessage={handleMessage}
          onError={handleError}
          onLoadEnd={() => setIsLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          // Security settings
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          // Enable caching - Circle SDK needs to persist device IDs
          cacheEnabled={true}
          // Don't use incognito mode - Circle SDK needs localStorage access
          // incognito={true}  // REMOVED - breaks Circle SDK device management
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#1f2937',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerDark: {
    borderBottomColor: '#374151',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
  },
});
