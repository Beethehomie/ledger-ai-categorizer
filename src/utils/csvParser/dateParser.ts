
import { format, parse, isValid } from 'date-fns';

// Common date formats to try
const commonFormats = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'MM-dd-yyyy',
  'dd-MM-yyyy',
  'yyyy/MM/dd',
  'dd.MM.yyyy',
  'MM.dd.yyyy',
  'yyyy.MM.dd',
];

export const parseDate = (dateString: string): string => {
  // Try to parse with Date constructor first
  const jsDate = new Date(dateString);
  if (isValid(jsDate)) {
    return format(jsDate, 'yyyy-MM-dd');
  }

  // Try common formats
  for (const formatStr of commonFormats) {
    try {
      const parsedDate = parse(dateString, formatStr, new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy-MM-dd');
      }
    } catch (e) {
      // Continue to next format if parsing fails
    }
  }
  
  // If all else fails, return current date
  return format(new Date(), 'yyyy-MM-dd');
};
