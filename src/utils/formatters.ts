
import { Currency, CurrencySettings } from '@/types';
import { currencySettings } from '@/utils/currencyUtils';

/**
 * Format a number as a currency string
 */
export const formatCurrency = (
  amount: number, 
  currency: Currency | string
): string => {
  // Handle string or Currency enum by getting the proper settings
  const settings: CurrencySettings = typeof currency === 'string' 
    ? (Object.prototype.hasOwnProperty.call(currencySettings, currency) 
        ? currencySettings[currency as Currency] 
        : currencySettings.USD)
    : currency;
    
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.code,
    minimumFractionDigits: settings.decimalPlaces,
    maximumFractionDigits: settings.decimalPlaces
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
  
  // Handle string or Currency enum by getting the proper settings
  const settings: CurrencySettings = typeof currency === 'string' 
    ? (Object.prototype.hasOwnProperty.call(currencySettings, currency) 
        ? currencySettings[currency as Currency] 
        : currencySettings.USD)
    : currency;

  return new Intl.DateTimeFormat(settings.locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};
