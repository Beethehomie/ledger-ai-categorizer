
import { Currency, CurrencySettings } from '@/types';
import { currencySettings } from './currencyUtils';

/**
 * Formats a number as currency based on the provided currency code
 */
export const formatCurrency = (
  amount: number, 
  currency: Currency | string = 'USD'
): string => {
  // Handle the case where currency is a string but not in Currency type
  const currencyCode = currency as Currency;
  const settings = currencySettings[currencyCode] || currencySettings.USD;
  
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.code,
    minimumFractionDigits: settings.decimalPlaces,
    maximumFractionDigits: settings.decimalPlaces
  }).format(amount);
};

/**
 * Formats a date string based on the provided locale
 */
export const formatDate = (
  date: string | Date,
  currency: Currency | string = 'USD'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Different date formats based on locale
  switch (currency as Currency) {
    case 'USD':
    case 'CAD':
    case 'AUD':
      return dateObj.toLocaleDateString('en', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'EUR':
    case 'CHF':
      return dateObj.toLocaleDateString('de', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    case 'GBP':
      return dateObj.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    case 'JPY':
    case 'CNY':
      return dateObj.toLocaleDateString('ja', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    case 'INR':
      return dateObj.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    default:
      return dateObj.toLocaleDateString();
  }
};
