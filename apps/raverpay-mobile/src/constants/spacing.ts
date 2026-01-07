// constants/spacing.ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

// Component-specific spacing
export const layout = {
  screenPadding: spacing[4], // 16px horizontal padding
  cardPadding: spacing[4], // 16px card padding
  sectionGap: spacing[6], // 24px between sections
  itemGap: spacing[3], // 12px between list items
  buttonHeight: 52, // iOS-like button height
  inputHeight: 52,
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
};
