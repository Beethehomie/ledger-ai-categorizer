
import { Transaction, FinancialSummary } from '@/types';

/**
 * Calculate financial metrics based on transactions
 */
export const calculateFinancialMetrics = (transactions: Transaction[]): FinancialSummary => {
  const initialSummary: FinancialSummary = {
    totalIncome: 0,
    totalExpenses: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    netProfit: 0,
    cashBalance: 0,
    income: 0,
    expenses: 0,
    netIncome: 0,
    assets: 0,
    liabilities: 0,
    equity: 0,
    categorizedExpenses: {},
    categorizedIncome: {},
    monthlyData: []
  };

  // Group by month for the monthly data calculation
  const monthlyMap = new Map<string, { income: number; expenses: number }>();

  const financialSummary = transactions.reduce((summary, transaction) => {
    const amount = transaction.amount || 0;

    // Calculate monthly data
    const date = new Date(transaction.date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyMap.has(monthYear)) {
      monthlyMap.set(monthYear, { income: 0, expenses: 0 });
    }
    
    const monthData = monthlyMap.get(monthYear)!;

    // Process different transaction types
    if (transaction.type === 'income') {
      summary.totalIncome += amount;
      summary.income += amount;
      monthData.income += amount;
      
      // Categorize income
      const category = transaction.category || 'Uncategorized';
      summary.categorizedIncome[category] = (summary.categorizedIncome[category] || 0) + amount;
      
    } else if (transaction.type === 'expense') {
      summary.totalExpenses += amount;
      summary.expenses += amount;
      monthData.expenses += amount;
      
      // Categorize expenses
      const category = transaction.category || 'Uncategorized';
      summary.categorizedExpenses[category] = (summary.categorizedExpenses[category] || 0) + amount;
      
    } else if (transaction.type === 'asset') {
      summary.totalAssets += amount;
      summary.assets += amount;
      
    } else if (transaction.type === 'liability') {
      summary.totalLiabilities += amount;
      summary.liabilities += amount;
      
    } else if (transaction.type === 'equity') {
      summary.totalEquity += amount;
      summary.equity += amount;
    }

    return summary;
  }, initialSummary);

  // Calculate derived metrics
  financialSummary.netProfit = financialSummary.totalIncome - financialSummary.totalExpenses;
  financialSummary.netIncome = financialSummary.income - financialSummary.expenses;
  financialSummary.cashBalance = financialSummary.totalAssets - financialSummary.totalLiabilities;

  // Convert monthly map to array and sort by date
  financialSummary.monthlyData = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      netIncome: data.income - data.expenses
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return financialSummary;
};

/**
 * Calculate running balance for a set of transactions
 */
export const calculateRunningBalance = (
  transactions: Transaction[], 
  initialBalance = 0
): Transaction[] => {
  // Sort transactions by date (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  let runningBalance = initialBalance;
  
  return sortedTransactions.map(transaction => {
    // For expenses, subtract from the running balance
    if (transaction.type === 'expense' || transaction.type === 'liability') {
      runningBalance -= transaction.amount;
    }
    // For income and assets, add to the running balance
    else if (transaction.type === 'income' || transaction.type === 'asset') {
      runningBalance += transaction.amount;
    }
    
    return {
      ...transaction,
      balance: runningBalance
    };
  });
};

/**
 * Find duplicate transactions based on date, amount, and description similarity
 */
export const findDuplicateTransactions = (transactions: Transaction[]): Transaction[][] => {
  const duplicateGroups: Transaction[][] = [];
  const processedIds = new Set<string>();
  
  for (let i = 0; i < transactions.length; i++) {
    if (processedIds.has(transactions[i].id)) continue;
    
    const current = transactions[i];
    const currentDate = new Date(current.date).toISOString().split('T')[0]; // YYYY-MM-DD
    const group: Transaction[] = [current];
    
    for (let j = i + 1; j < transactions.length; j++) {
      if (processedIds.has(transactions[j].id)) continue;
      
      const compare = transactions[j];
      const compareDate = new Date(compare.date).toISOString().split('T')[0];
      
      // Check if dates are the same, amounts are the same,
      // and descriptions are very similar
      if (
        currentDate === compareDate &&
        Math.abs(current.amount - compare.amount) < 0.01 &&
        areDescriptionsSimilar(current.description, compare.description)
      ) {
        group.push(compare);
        processedIds.add(compare.id);
      }
    }
    
    processedIds.add(current.id);
    
    if (group.length > 1) {
      duplicateGroups.push(group);
    }
  }
  
  return duplicateGroups;
};

/**
 * Helper function to check if two descriptions are similar
 */
function areDescriptionsSimilar(desc1: string, desc2: string): boolean {
  // Convert to lowercase and remove common punctuation and whitespace
  const normalize = (str: string) => str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\s]/g, "");
  
  const normalizedDesc1 = normalize(desc1);
  const normalizedDesc2 = normalize(desc2);
  
  // For very short descriptions, require exact match
  if (normalizedDesc1.length < 5 || normalizedDesc2.length < 5) {
    return normalizedDesc1 === normalizedDesc2;
  }
  
  // For longer descriptions, allow some difference
  // Using Levenshtein distance or similar algorithms would be better
  // This is a simple approximation
  const longerDesc = normalizedDesc1.length > normalizedDesc2.length ? normalizedDesc1 : normalizedDesc2;
  const shorterDesc = normalizedDesc1.length > normalizedDesc2.length ? normalizedDesc2 : normalizedDesc1;
  
  // If one description contains the other, consider them similar
  if (longerDesc.includes(shorterDesc)) {
    return true;
  }
  
  // Count matching characters (simplified approach)
  let matchingChars = 0;
  for (let i = 0; i < shorterDesc.length; i++) {
    if (longerDesc.includes(shorterDesc[i])) {
      matchingChars++;
    }
  }
  
  // If more than 70% of characters match, consider them similar
  return matchingChars / shorterDesc.length > 0.7;
}
