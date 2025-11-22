import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value by a specified delay.
 * Useful for search inputs to prevent excessive API calls.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @param minLength - Minimum length before debouncing applies (default: 0)
 * @returns The debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 300, 2);
 *
 * // Use debouncedSearch in your query
 * useQuery({
 *   queryKey: ['users', debouncedSearch],
 *   queryFn: () => fetchUsers(debouncedSearch),
 * });
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = 300,
  minLength: number = 0,
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // If value is a string and below minimum length, clear immediately
    // (except for empty string which should clear the filter)
    if (typeof value === 'string' && value.length > 0 && value.length < minLength) {
      return;
    }

    // Set up the debounce timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer on value change or unmount
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay, minLength]);

  return debouncedValue;
}

/**
 * Hook that provides both the immediate value and debounced value.
 * Useful when you need to show the input value immediately but debounce the API call.
 *
 * @param initialValue - The initial value
 * @param delay - The delay in milliseconds (default: 300ms)
 * @param minLength - Minimum length before debouncing applies (default: 0)
 * @returns Object with value, debouncedValue, setValue, and isDebouncing
 *
 * @example
 * const { value, debouncedValue, setValue, isDebouncing } = useDebouncedState('', 300, 2);
 *
 * <Input value={value} onChange={(e) => setValue(e.target.value)} />
 * {isDebouncing && <Spinner />}
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300,
  minLength: number = 0,
) {
  const [value, setValue] = useState<T>(initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debouncedValue = useDebouncedValue(value, delay, minLength);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsDebouncing(true);
    } else {
      setIsDebouncing(false);
    }
  }, [value, debouncedValue]);

  return {
    value,
    debouncedValue,
    setValue,
    isDebouncing,
  };
}
