export default {
  expo: {
    name: "Raverpay",
    slug: "raverpay-mobile",
    version: "1.0.7",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "raverpay",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    updates: {
      url: "https://u.expo.dev/e73f2d6b-7cd6-4895-862a-0879c10822b0",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.raverpay.raverpay",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSFaceIDUsageDescription:
          "We use Face ID to secure your account and protect your personal information.",
        NSBiometricUsageDescription:
          "We use Face ID to secure your account and protect your personal information.",
        NSPhotoLibraryUsageDescription:
          "RaverPay needs access to your photo library to allow you to upload images for your profile picture.",
        NSCameraUsageDescription:
          "We need access to your camera to scan QR codes and upload profile pictures.",
        NSContactsUsageDescription:
          "We need access to your contacts to help you quickly select recipients when buying airtime or data.",
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/icon.png",
        backgroundImage: "./assets/images/icon.png",
        monochromeImage: "./assets/images/icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.raverpay.raverpayandroid",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON,
      permissions: ["USE_BIOMETRIC", "USE_FINGERPRINT", "READ_CONTACTS"],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-secure-store",
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG || "raverpay",
          project: process.env.SENTRY_PROJECT || "raverpay-mobile",
          url: "https://sentry.io/",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "e73f2d6b-7cd6-4895-862a-0879c10822b0",
      },
      apiUrl: process.env.apiUrl || "",
      environment: process.env.environment || "",
      sentryDsn: process.env.SENTRY_DSN || "",
      sentryAuthToken: process.env.SENTRY_AUTH_TOKEN || "",
    },
    owner: "raverpay",
  },
};
