
import { Category } from '@/types';

export function generateMockCategories(): Category[] {
  return [
    {
      id: 'cat-1',
      name: 'Salaries',
      type: 'expense',
      statementType: 'profit_loss',
      keywords: ['salary', 'payroll', 'wage', 'compensation']
    },
    {
      id: 'cat-2',
      name: 'Office Supplies',
      type: 'expense',
      statementType: 'profit_loss',
      keywords: ['office', 'supplies', 'paper', 'pen', 'stationary']
    },
    {
      id: 'cat-3',
      name: 'Utilities',
      type: 'expense',
      statementType: 'profit_loss',
      keywords: ['utility', 'electric', 'water', 'gas', 'power', 'energy']
    },
    {
      id: 'cat-4',
      name: 'Rent',
      type: 'expense',
      statementType: 'profit_loss',
      keywords: ['rent', 'lease', 'space', 'property']
    },
    {
      id: 'cat-5',
      name: 'Revenue',
      type: 'income',
      statementType: 'profit_loss',
      keywords: ['income', 'revenue', 'sale', 'cash', 'deposit']
    },
    {
      id: 'cat-6',
      name: 'Equipment',
      type: 'asset',
      statementType: 'balance_sheet',
      keywords: ['equipment', 'machinery', 'computer', 'hardware']
    },
    {
      id: 'cat-7',
      name: 'Loan',
      type: 'liability',
      statementType: 'balance_sheet',
      keywords: ['loan', 'debt', 'credit', 'finance']
    }
  ];
}

export const fetchMockCategories = async (): Promise<Category[]> => {
  // Simulate an API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(generateMockCategories());
    }, 300);
  });
};
