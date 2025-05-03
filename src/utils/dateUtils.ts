
/**
 * Formats a date object or ISO date string to a readable format
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format: YYYY-MM-DD
  return dateObj.toISOString().split('T')[0];
};

/**
 * Get the first day of the current month
 */
export const getFirstDayOfMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/**
 * Get the last day of the current month
 */
export const getLastDayOfMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
};

/**
 * Get the first day of the current year
 */
export const getFirstDayOfYear = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), 0, 1);
};

/**
 * Get the last day of the current year
 */
export const getLastDayOfYear = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31);
};

/**
 * Check if a date is within a given range
 */
export const isDateInRange = (
  date: Date | string,
  startDate: Date | string | undefined,
  endDate: Date | string | undefined
): boolean => {
  if (!startDate && !endDate) return true;
  
  const checkDate = new Date(date);
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return checkDate >= start && checkDate <= end;
  }
  
  if (startDate) {
    const start = new Date(startDate);
    return checkDate >= start;
  }
  
  if (endDate) {
    const end = new Date(endDate);
    return checkDate <= end;
  }
  
  return true;
};

/**
 * Get a date range for a specific period
 */
export const getDateRange = (period: 'week' | 'month' | 'quarter' | 'year' | 'all'): { start: Date; end: Date } => {
  const now = new Date();
  
  switch (period) {
    case 'week':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return { start: startOfWeek, end: endOfWeek };
      
    case 'month':
      return {
        start: getFirstDayOfMonth(),
        end: getLastDayOfMonth()
      };
      
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const endQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      return { start: startQuarter, end: endQuarter };
      
    case 'year':
      return {
        start: getFirstDayOfYear(),
        end: getLastDayOfYear()
      };
      
    case 'all':
    default:
      // Set a far past date and today's date for "all"
      return {
        start: new Date(2000, 0, 1),
        end: now
      };
  }
};
