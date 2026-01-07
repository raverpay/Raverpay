import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'web';
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
}

/**
 * Get device fingerprint for security and device management
 * Generates a unique device identifier and collects device information
 */
export async function getDeviceFingerprint(): Promise<DeviceInfo> {
  try {
    // Get device ID (unique per device)
    let deviceId: string;

    if (Platform.OS === 'android') {
      // Android: Use Android ID
      const androidId = await Application.getAndroidId();
      deviceId = androidId || `android-${Device.modelId || 'unknown'}-${Date.now()}`;
    } else if (Platform.OS === 'ios') {
      // iOS: Use identifierForVendor
      const iosId = await Application.getIosIdForVendorAsync();
      deviceId = iosId || `ios-${Device.modelId || 'unknown'}-${Date.now()}`;
    } else {
      // Web or other platforms: Generate a persistent ID
      deviceId = `web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // Get device information
    const deviceName = Device.deviceName || 'Unknown Device';
    const deviceType = Platform.OS as 'ios' | 'android' | 'web';
    const deviceModel = Device.modelName || Device.modelId || null;
    const osVersion = Device.osVersion || null;
    const appVersion = Application.nativeApplicationVersion || null;

    return {
      deviceId,
      deviceName,
      deviceType,
      deviceModel,
      osVersion: osVersion ? `${Platform.OS} ${osVersion}` : null,
      appVersion,
    };
  } catch (error) {
    console.error('[DeviceFingerprint] Error getting device info:', error);

    // Fallback to basic device info
    return {
      deviceId: `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      deviceName: 'Unknown Device',
      deviceType: Platform.OS as 'ios' | 'android' | 'web',
      deviceModel: null,
      osVersion: Platform.OS,
      appVersion: null,
    };
  }
}

/**
 * Get network information (optional, for additional security context)
 */
export async function getNetworkInfo() {
  try {
    const state = await NetInfo.fetch();
    return {
      type: state.type,
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
    };
  } catch (error) {
    console.error('[DeviceFingerprint] Error getting network info:', error);
    return {
      type: 'unknown',
      isConnected: false,
      isInternetReachable: false,
    };
  }
}
