// components/ui/Text.tsx
import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'h7'
  | 'h8'
  | 'h9'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'button';
export type TextColor = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'error' | 'success';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

interface TextComponentProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  align?: TextAlign;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  children: React.ReactNode;
}

export const Text: React.FC<TextComponentProps> = ({
  variant = 'body',
  color = 'primary',
  align = 'left',
  weight,
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    h1: 'text-4xl font-bold leading-tight',
    h2: 'text-3xl font-bold leading-tight',
    h3: 'text-2xl font-bold leading-normal',
    h4: 'text-xl font-bold leading-normal',
    h5: 'text-lg font-semibold leading-normal',
    h6: 'text-base font-semibold leading-normal',
    h7: 'text-sm font-semibold leading-normal',
    h8: 'text-xs font-semibold leading-normal',
    h9: 'text-2xs font-semibold leading-normal',
    body: 'text-base font-normal leading-normal',
    bodyMedium: 'text-base font-medium leading-normal',
    caption: 'text-sm font-normal leading-normal',
    button: 'text-base font-semibold tracking-wide',
  };

  const colorClasses = {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-300',
    tertiary: 'text-gray-400 dark:text-gray-500',
    inverse: 'text-white dark:text-gray-900',
    error: 'text-red-500 dark:text-red-400',
    success: 'text-green-500 dark:text-green-400',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify',
  };

  const weightClasses = weight
    ? {
        regular: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
      }[weight]
    : '';

  const textClasses =
    `${variantClasses[variant]} ${colorClasses[color]} ${alignClasses[align]} ${weightClasses} ${className || ''}`.trim();

  return (
    <RNText {...props} className={textClasses}>
      {children}
    </RNText>
  );
};
