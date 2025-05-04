
/**
 * Parse and format date values from different formats to ISO
 */
export function parseDate(dateValue: string): string {
  try {
    // Handle common date formats
    const dateParts = dateValue.split(/[-/./]/);
    
    if (dateParts.length === 3) {
      // Assume MM/DD/YYYY or DD/MM/YYYY
      let year, month, day;
      
      // Check if the first part looks like a year
      if (dateParts[0].length === 4 && !isNaN(Number(dateParts[0]))) {
        // YYYY-MM-DD
        year = dateParts[0];
        month = dateParts[1].padStart(2, '0');
        day = dateParts[2].padStart(2, '0');
      } else {
        // MM/DD/YYYY or DD/MM/YYYY - assume MM/DD/YYYY for simplicity
        month = dateParts[0].padStart(2, '0');
        day = dateParts[1].padStart(2, '0');
        year = dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2];
      }
      
      return `${year}-${month}-${day}`;
    }
    
    // Try to parse as ISO date
    const dateObj = new Date(dateValue);
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }
    
    return dateObj.toISOString().split('T')[0];
  } catch (err) {
    // If parsing fails, return current date
    return new Date().toISOString().split('T')[0];
  }
}
