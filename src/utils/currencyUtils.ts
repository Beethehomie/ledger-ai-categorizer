import { CurrencySettings, Currency } from '@/types';

export const currencySettings: Record<string, CurrencySettings> = {
  USD: { code: 'USD', symbol: '$', position: 'before', dateFormat: 'MM/dd/yyyy', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', position: 'after', dateFormat: 'dd/MM/yyyy', locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', position: 'before', dateFormat: 'dd/MM/yyyy', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', position: 'before', dateFormat: 'yyyy/MM/dd', locale: 'ja-JP' },
  AUD: { code: 'AUD', symbol: 'A$', position: 'before', dateFormat: 'dd/MM/yyyy', locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', position: 'before', dateFormat: 'MM/dd/yyyy', locale: 'en-CA' },
  CHF: { code: 'CHF', symbol: 'CHF', position: 'before', dateFormat: 'dd.MM.yyyy', locale: 'de-CH' },
  CNY: { code: 'CNY', symbol: '¥', position: 'before', dateFormat: 'yyyy/MM/dd', locale: 'zh-CN' },
  INR: { code: 'INR', symbol: '₹', position: 'before', dateFormat: 'dd/MM/yyyy', locale: 'en-IN' }
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
