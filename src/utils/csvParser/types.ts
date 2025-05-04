
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  vendor?: string;
  category?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  warnings: string[];
}

export interface ColumnMapping {
  dateColumn: string | null;
  descriptionColumn: string | null;
  amountColumn: string | null;
  debitColumn: string | null;
  creditColumn: string | null;
}
