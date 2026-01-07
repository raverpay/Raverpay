import React, { useEffect, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

interface PinPadProps {
  value: string;
  onChange: (pin: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PinPad({
  value,
  onChange,
  length = 4,
  error = false,
  disabled = false,
  autoFocus = false,
}: PinPadProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split('');

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handlePress = () => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  };

  const handleChangeText = (text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    // Limit to specified length
    const limited = cleaned.slice(0, length);
    onChange(limited);
  };

  const handleKeyPress = ({ nativeEvent }: any) => {
    if (nativeEvent.key === 'Backspace' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <View className="flex-row justify-center items-center gap-3">
        {Array.from({ length }).map((_, index) => {
          const isFilled = index < digits.length;
          const isActive = index === digits.length;

          return (
            <View
              key={index}
              className={`
                w-14 h-14 rounded-2xl border-2
                flex items-center justify-center
                ${
                  error
                    ? 'border-red-500 bg-red-50'
                    : isFilled
                      ? 'border-[#5B55F6] bg-purple-50'
                      : isActive
                        ? 'border-purple-400 bg-white'
                        : 'border-gray-300 bg-gray-50'
                }
                ${disabled ? 'opacity-50' : ''}
              `}
            >
              {isFilled && <View className="w-3 h-3 rounded-full bg-[#5B55F6]" />}
            </View>
          );
        })}
      </View>

      {/* Hidden input for keyboard */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        onKeyPress={handleKeyPress}
        keyboardType="number-pad"
        maxLength={length}
        secureTextEntry={false}
        editable={!disabled}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
        }}
      />
    </Pressable>
  );
}

// Utility to check for weak PINs
const WEAK_PINS = [
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1234',
  '4321',
  '0123',
  '1230',
];

export function isWeakPin(pin: string): boolean {
  return WEAK_PINS.includes(pin);
}

export function validatePin(pin: string): {
  isValid: boolean;
  error?: string;
} {
  if (pin.length !== 4) {
    return {
      isValid: false,
      error: 'PIN must be 4 digits',
    };
  }

  if (!/^\d{4}$/.test(pin)) {
    return {
      isValid: false,
      error: 'PIN must contain only numbers',
    };
  }

  if (isWeakPin(pin)) {
    return {
      isValid: false,
      error: 'PIN is too weak. Please choose a more secure PIN',
    };
  }

  return { isValid: true };
}
