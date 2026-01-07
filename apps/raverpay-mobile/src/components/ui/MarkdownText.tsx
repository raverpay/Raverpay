import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

interface MarkdownTextProps {
  content: string;
  variant?:
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
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'error' | 'success';
  className?: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  variant = 'body',
  color = 'primary',
  className = '',
}) => {
  // Parse bold text (**text**) and return React Native Text with nested Text for bold
  const parseBold = (
    text: string,
    baseVariant = variant,
    baseColor = color,
    textClassName = '',
  ): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add bold text as nested Text component
      parts.push(
        <Text key={key++} variant={baseVariant} color={baseColor} weight="bold">
          {match[1]}
        </Text>,
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    // If no bold text found, return plain text wrapped in Text
    if (parts.length === 0) {
      return (
        <Text variant={baseVariant} color={baseColor} className={textClassName}>
          {text}
        </Text>
      );
    }

    // Return a single Text component with nested content
    return (
      <Text variant={baseVariant} color={baseColor} className={textClassName}>
        {parts}
      </Text>
    );
  };

  // Parse the content into lines and identify list items
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      elements.push(<View key={key++} className="h-3" />);
      continue;
    }

    // Check for numbered list (e.g., "1. ", "2. ")
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const number = numberedMatch[1];
      const text = numberedMatch[2];
      const boldParts = parseBold(text);
      elements.push(
        <View key={key++} className="flex-row mb-2">
          <Text variant={variant} color={color} className="mr-2">
            {number}.
          </Text>
          <View className="flex-1">{boldParts}</View>
        </View>,
      );
      continue;
    }

    // Check for bullet list (e.g., "- ", "• ")
    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1];
      const boldParts = parseBold(text);
      elements.push(
        <View key={key++} className="flex-row mb-2">
          <Text variant={variant} color={color} className="mr-2">
            •
          </Text>
          <View className="flex-1">{boldParts}</View>
        </View>,
      );
      continue;
    }

    // Regular paragraph text
    const boldParts = parseBold(line, variant, color, className);
    elements.push(
      <View key={key++} className="mb-3">
        {boldParts}
      </View>,
    );
  }

  return <View>{elements}</View>;
};
