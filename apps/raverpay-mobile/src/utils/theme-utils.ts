// src/utils/theme-utils.ts

/**
 * Utility function to conditionally apply theme-aware classes
 * @param lightClass - Class to apply in light mode
 * @param darkClass - Class to apply in dark mode
 * @returns Combined class string with dark mode variant
 */
export function themed(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`;
}

/**
 * Get theme-aware background class
 */
export function bgThemed(light: string = 'bg-white', dark: string = 'bg-gray-900'): string {
  return `${light} dark:${dark}`;
}

/**
 * Get theme-aware text class
 */
export function textThemed(light: string = 'text-gray-900', dark: string = 'text-white'): string {
  return `${light} dark:${dark}`;
}

/**
 * Get theme-aware border class
 */
export function borderThemed(
  light: string = 'border-gray-300',
  dark: string = 'border-gray-700',
): string {
  return `${light} dark:${dark}`;
}

/**
 * Theme-aware color mappings for common UI elements
 */
export const themeColors = {
  background: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
  },
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-300',
    tertiary: 'text-gray-400 dark:text-gray-500',
    inverse: 'text-white dark:text-gray-900',
  },
  border: {
    primary: 'border-gray-300 dark:border-gray-700',
    secondary: 'border-gray-200 dark:border-gray-800',
  },
  card: 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700',
  surface: 'bg-gray-50 dark:bg-gray-900',
};
