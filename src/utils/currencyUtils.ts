
import { CurrencySettings, Currency } from '@/types';

export const currencySettings: Record<Currency, CurrencySettings> = {
  USD: { code: 'USD', symbol: '$', locale: 'en-US', decimalPlaces: 2 },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', decimalPlaces: 2 },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', decimalPlaces: 2 },
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP', decimalPlaces: 0 },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU', decimalPlaces: 2 },
  CAD: { code: 'CAD', symbol: 'C$', locale: 'en-CA', decimalPlaces: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', locale: 'de-CH', decimalPlaces: 2 },
  CNY: { code: 'CNY', symbol: '¥', locale: 'zh-CN', decimalPlaces: 2 },
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN', decimalPlaces: 2 }
};

export const formatCurrency = (
  amount: number, 
  currency: Currency = 'USD'
): string => {
  const settings = currencySettings[currency];
  
  return new Intl.NumberFormat(settings.locale, {
    style: 'currency',
    currency: settings.code,
    minimumFractionDigits: settings.decimalPlaces,
    maximumFractionDigits: settings.decimalPlaces
  }).format(amount);
};

export const formatDate = (
  date: string | Date,
  currency: Currency = 'USD'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Different date formats based on locale
  switch (currency) {
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
