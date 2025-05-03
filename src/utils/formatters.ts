
import { Currency } from '@/types';

/**
 * Format a number as a currency string
 */
export const formatCurrency = (
  amount: number, 
  currency: Currency | string
): string => {
  // Default to USD if currency is not provided or invalid
  const currencyCode = typeof currency === 'string' ? currency : (currency?.code || 'USD');
  const locale = typeof currency === 'string' ? 'en-US' : (currency?.locale || 'en-US');

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format a date string
 */
export const formatDate = (
  dateString: string, 
  currency: Currency | string
): string => {
  const date = new Date(dateString);
  const locale = typeof currency === 'string' ? 'en-US' : (currency?.locale || 'en-US');

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};
