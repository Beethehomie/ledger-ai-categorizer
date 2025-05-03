
/**
 * Utility functions for date handling
 */

/**
 * Parse a date string in various formats to a Date object
 * @param dateString The date string to parse
 * @returns A Date object or null if parsing fails
 */
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  // Remove non-breaking spaces and trim
  const trimmed = dateString.replace(/\u00A0/g, ' ').trim();
  
  // Try different date formats
  const formats = [
    // ISO format
    /^\d{4}-\d{2}-\d{2}(T.*)?$/,
    // MM/DD/YYYY or DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM-DD-YYYY or DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY/MM/DD
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
    // Month name formats
    /^([a-zA-Z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/,
    // DD Month YYYY
    /^(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})$/
  ];
  
  // Try to parse using built-in Date
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try to manually parse with regex patterns
  for (const format of formats) {
    if (format.test(trimmed)) {
      const parts = trimmed.match(format);
      if (parts) {
        if (format === formats[1] || format === formats[2]) {
          // Handle MM/DD/YYYY or DD/MM/YYYY formats
          // Since we're not sure of the order, default to MM/DD/YYYY
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const year = parseInt(parts[3], 10);
          
          if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
            return new Date(year, month, day);
          }
        } else if (format === formats[3]) {
          // Handle YYYY/MM/DD format
          const year = parseInt(parts[1], 10);
          const month = parseInt(parts[2], 10) - 1;
          const day = parseInt(parts[3], 10);
          
          return new Date(year, month, day);
        } else if (format === formats[4]) {
          // Month name formats like "January 15, 2023"
          const monthName = parts[1].toLowerCase();
          const day = parseInt(parts[2], 10);
          const year = parseInt(parts[3], 10);
          
          const monthIndex = getMonthIndexFromName(monthName);
          if (monthIndex !== -1) {
            return new Date(year, monthIndex, day);
          }
        } else if (format === formats[5]) {
          // DD Month YYYY format like "15 January 2023"
          const day = parseInt(parts[1], 10);
          const monthName = parts[2].toLowerCase();
          const year = parseInt(parts[3], 10);
          
          const monthIndex = getMonthIndexFromName(monthName);
          if (monthIndex !== -1) {
            return new Date(year, monthIndex, day);
          }
        }
      }
    }
  }
  
  // If all attempts failed, return null
  return null;
};

/**
 * Get month index from month name
 * @param monthName Month name (full or abbreviated)
 * @returns Month index (0-11) or -1 if not found
 */
const getMonthIndexFromName = (monthName: string): number => {
  const months = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  const shortMonths = [
    'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
  ];
  
  const monthLower = monthName.toLowerCase();
  
  // Try full month name
  const monthIndex = months.findIndex(m => m === monthLower);
  if (monthIndex !== -1) {
    return monthIndex;
  }
  
  // Try abbreviated month name
  const shortIndex = shortMonths.findIndex(m => m === monthLower);
  if (shortIndex !== -1) {
    return shortIndex;
  }
  
  // Try partial match
  for (let i = 0; i < months.length; i++) {
    if (months[i].startsWith(monthLower) || shortMonths[i].startsWith(monthLower)) {
      return i;
    }
  }
  
  return -1;
};

/**
 * Format a date as YYYY-MM-DD
 * @param date Date to format
 * @returns Formatted date string
 */
export const formatDateYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
