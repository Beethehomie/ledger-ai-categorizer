
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  [key: string]: any;
}

export interface ColumnMapping {
  date: number;
  description: number;
  amount: number;
  [key: string]: number;
}

export interface CSVParseResult {
  transactions: ParsedTransaction[];
  warnings: string[];
}
