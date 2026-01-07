// constants/typography.ts
export const typography = {
  // Font family
  fonts: {
    regular: 'Urbanist_400Regular',
    medium: 'Urbanist_500Medium',
    semibold: 'Urbanist_600SemiBold',
    bold: 'Urbanist_700Bold',
  },

  // Font sizes (iOS-like hierarchy)
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 40,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

// Pre-defined text styles
export const textStyles = {
  h1: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['4xl'],
    lineHeight: typography.sizes['4xl'] * typography.lineHeights.tight,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['3xl'],
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
  },
  h3: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes['2xl'],
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.normal,
  },
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  bodyMedium: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  caption: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  button: {
    fontFamily: typography.fonts.semibold,
    fontSize: typography.sizes.base,
    letterSpacing: typography.letterSpacing.wide,
  },
};
