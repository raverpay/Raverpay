// src/lib/utils/dateGrouping.ts
import { format, isThisWeek, isToday, isYesterday } from 'date-fns';

export interface GroupedItem<T> {
  title: string;
  data: T[];
}

/**
 * Groups items by date categories: Today, Yesterday, specific dates
 * @param items - Array of items with a date field
 * @param dateKey - Key to access the date field in the item
 * @returns Array of grouped items with section headers
 */
export function groupItemsByDate<T extends Record<string, any>>(
  items: T[],
  dateKey: keyof T = 'createdAt' as keyof T,
): GroupedItem<T>[] {
  if (!items || items.length === 0) {
    return [];
  }

  // Sort items by date (newest first)
  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a[dateKey]);
    const dateB = new Date(b[dateKey]);
    return dateB.getTime() - dateA.getTime();
  });

  // Group items by date category
  const grouped = new Map<string, T[]>();

  sortedItems.forEach((item) => {
    const itemDate = new Date(item[dateKey]);
    const category = getDateCategory(itemDate);

    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(item);
  });

  // Convert map to array of sections
  return Array.from(grouped.entries()).map(([title, data]) => ({
    title,
    data,
  }));
}

/**
 * Determines the date category for a given date
 * @param date - Date to categorize
 * @returns Category string (e.g., "Today", "Yesterday", "Friday 29th November")
 */
export function getDateCategory(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  // For dates within this week, show day name with date
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return format(date, 'EEEE do MMMM'); // e.g., "Thursday 28th November"
  }

  // For older dates, show full date
  return format(date, 'EEEE do MMMM'); // e.g., "Monday 25th November"
}

/**
 * Gets a relative time description for display within items
 * @param date - Date to describe
 * @returns Relative time string
 */
export function getRelativeTimeLabel(date: Date): string {
  if (isToday(date)) {
    return format(date, 'h:mm a'); // e.g., "2:30 PM"
  }

  if (isYesterday(date)) {
    return format(date, "'Yesterday at' h:mm a"); // e.g., "Yesterday at 2:30 PM"
  }

  // For older dates, show date
  return format(date, "MMM d 'at' h:mm a"); // e.g., "Nov 25 at 2:30 PM"
}
