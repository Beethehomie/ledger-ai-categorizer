import React, { createContext, useState, useContext, useEffect } from 'react';
import { Currency, CurrencySettings, FinancialGoal, TableColumn } from '@/types';
import { currencySettings } from '@/utils/currencyUtils';

interface SettingsContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  dateRange: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  };
  setDateRange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  financialGoal: FinancialGoal;
  updateFinancialGoal: (goal: FinancialGoal) => void;
  tableColumns: TableColumn[];
  toggleColumn: (columnId: string, visible: boolean) => void;
  resetColumns: () => void;
}

const defaultGoal: FinancialGoal = {
  id: 'default-goal',
  name: 'Financial Goal',
  targetAmount: 100000,
  currentAmount: 45000,
};

const defaultColumns: TableColumn[] = [
  { id: 'date', label: 'Date', visible: true },
  { id: 'description', label: 'Description', visible: true },
  { id: 'vendor', label: 'Vendor', visible: true },
  { id: 'amount', label: 'Amount', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'statementType', label: 'Statement Type', visible: true },
  { id: 'bankAccount', label: 'Bank Account', visible: true },
  { id: 'status', label: 'Status', visible: true },
  { id: 'actions', label: 'Actions', visible: true },
];

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>('USD');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({
    startDate: undefined,
    endDate: undefined,
  });
  const [financialGoal, setFinancialGoal] = useState<FinancialGoal>(defaultGoal);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>(defaultColumns);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('currency');
    if (savedCurrency && Object.keys(currencySettings).includes(savedCurrency)) {
      setCurrency(savedCurrency as Currency);
    }

    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(savedDarkMode === 'true');
    }

    const savedGoal = localStorage.getItem('financialGoal');
    if (savedGoal) {
      try {
        setFinancialGoal(JSON.parse(savedGoal));
      } catch (error) {
        console.error('Error parsing saved goal:', error);
      }
    }

    const savedColumns = localStorage.getItem('tableColumns');
    if (savedColumns) {
      try {
        setTableColumns(JSON.parse(savedColumns));
      } catch (error) {
        console.error('Error parsing saved columns:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    
    // Apply dark mode to the document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('financialGoal', JSON.stringify(financialGoal));
  }, [financialGoal]);

  useEffect(() => {
    localStorage.setItem('tableColumns', JSON.stringify(tableColumns));
  }, [tableColumns]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const updateFinancialGoal = (goal: FinancialGoal) => {
    setFinancialGoal(goal);
  };

  const toggleColumn = (columnId: string, visible: boolean) => {
    setTableColumns(prev =>
      prev.map(col => (col.id === columnId ? { ...col, visible } : col))
    );
  };

  const resetColumns = () => {
    setTableColumns(defaultColumns);
  };

  const handleSetDateRange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setDateRange({ startDate, endDate });
  };

  const value = {
    currency,
    setCurrency,
    darkMode,
    toggleDarkMode,
    dateRange,
    setDateRange: handleSetDateRange,
    financialGoal,
    updateFinancialGoal,
    tableColumns,
    toggleColumn,
    resetColumns,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
