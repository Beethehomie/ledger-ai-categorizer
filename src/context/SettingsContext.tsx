
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Define types for our settings
export type CurrencySettings = {
  symbol: string;
  code: string;
  name: string;
  decimalPlaces: number;
};

export type TableColumn = {
  id: string;
  name: string;
  visible: boolean;
};

export type SettingsContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  currency: CurrencySettings;
  setCurrency: (currency: CurrencySettings) => void;
  showAdvancedFeatures: boolean;
  toggleAdvancedFeatures: () => void;
  tableColumns: TableColumn[];
  setTableColumns: (columns: TableColumn[]) => void;
  defaultDateRange: [Date | null, Date | null];
  setDefaultDateRange: (range: [Date | null, Date | null]) => void;
};

// Default settings values
const defaultSettings: SettingsContextType = {
  darkMode: false,
  toggleDarkMode: () => {},
  currency: {
    symbol: '$',
    code: 'USD',
    name: 'US Dollar',
    decimalPlaces: 2
  },
  setCurrency: () => {},
  showAdvancedFeatures: false,
  toggleAdvancedFeatures: () => {},
  tableColumns: [
    { id: 'date', name: 'Date', visible: true },
    { id: 'description', name: 'Description', visible: true },
    { id: 'amount', name: 'Amount', visible: true },
    { id: 'category', name: 'Category', visible: true },
    { id: 'vendor', name: 'Vendor', visible: true }
  ],
  setTableColumns: () => {},
  defaultDateRange: [null, null],
  setDefaultDateRange: () => {},
};

// Create the settings context
const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use localStorage to persist settings
  const [darkMode, setDarkMode] = useLocalStorage<boolean>('darkMode', defaultSettings.darkMode);
  const [currency, setCurrency] = useLocalStorage<CurrencySettings>('currency', defaultSettings.currency);
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useLocalStorage<boolean>(
    'showAdvancedFeatures', 
    defaultSettings.showAdvancedFeatures
  );
  const [tableColumns, setTableColumns] = useLocalStorage<TableColumn[]>(
    'tableColumns', 
    defaultSettings.tableColumns
  );
  const [defaultDateRange, setDefaultDateRange] = useLocalStorage<[Date | null, Date | null]>(
    'defaultDateRange',
    defaultSettings.defaultDateRange
  );

  // Apply dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Effect to sync with system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [setDarkMode]);

  // Effect to initialize darkMode from system preference if not set
  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (localStorage.getItem('darkMode') === null) {
      setDarkMode(isDarkMode);
    }
  }, [setDarkMode]);

  // Toggle functions
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleAdvancedFeatures = () => {
    setShowAdvancedFeatures(!showAdvancedFeatures);
  };

  // Combine all the state and functions
  const value = {
    darkMode,
    toggleDarkMode,
    currency,
    setCurrency,
    showAdvancedFeatures,
    toggleAdvancedFeatures,
    tableColumns,
    setTableColumns,
    defaultDateRange,
    setDefaultDateRange,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
