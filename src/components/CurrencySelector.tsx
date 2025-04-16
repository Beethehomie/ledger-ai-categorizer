
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Currency } from '@/types';
import { currencySettings } from '@/utils/currencyUtils';

interface CurrencySelectorProps {
  value: Currency;
  onChange: (value: Currency) => void;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({ value, onChange }) => {
  return (
    <Select 
      value={value} 
      onValueChange={(val: Currency) => onChange(val)}
    >
      <SelectTrigger className="w-[120px] text-purple-600 hover:text-purple-700 font-medium">
        <SelectValue placeholder="Currency" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(currencySettings) as Currency[]).map((currency) => (
          <SelectItem key={currency} value={currency}>
            <div className="flex items-center">
              <span className="mr-2">{currencySettings[currency].symbol}</span>
              <span>{currency}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
