import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setFinnhubApiKey as configureApiKey, getFinnhubApiKey } from '../config/api';
import * as finnhubService from '../services/finnhubService';

// Define the shape of the context
interface FinnhubContextType {
  // API key management
  apiKey: string;
  setApiKey: (key: string) => void;
  isApiKeySet: boolean;
  
  // Stock data
  getQuote: (symbol: string) => Promise<any>;
  getCompanyProfile: (symbol: string) => Promise<any>;
  
  // News data
  getMarketNews: (category?: string) => Promise<any>;
  getCompanyNews: (symbol: string, from: string, to: string) => Promise<any>;
  
  // Financial data
  getBasicFinancials: (symbol: string, metric?: string) => Promise<any>;
  
  // Search
  symbolSearch: (query: string) => Promise<any>;
  
  // Market sentiment
  getSentiment: (symbol: string) => Promise<any>;
  
  // Price data
  getCandles: (symbol: string, resolution: string, from: number, to: number) => Promise<any>;
  
  // Calendar data
  getEarningsCalendar: (from: string, to: string) => Promise<any>;
  getIpoCalendar: (from: string, to: string) => Promise<any>;
  
  // Loading state
  loading: boolean;
  error: string | null;
}

// Create the context
const FinnhubContext = createContext<FinnhubContextType | null>(null);

// Provider component
export const FinnhubProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiKey, setApiKeyState] = useState<string>(getFinnhubApiKey());
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(finnhubService.isApiKeySet());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from local storage
  useEffect(() => {
    const storedKey = getFinnhubApiKey();
    if (storedKey) {
      setApiKeyState(storedKey);
      setIsApiKeySet(true);
    }
  }, []);

  // Set the API key
  const setApiKey = (key: string) => {
    setApiKeyState(key);
    configureApiKey(key);
    setIsApiKeySet(key !== '');
  };

  // Wrap service methods to handle loading and error states
  const wrapServiceMethod = async <T extends any[], R>(
    method: (...args: T) => Promise<R>,
    ...args: T
  ): Promise<R> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await method(...args);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value: FinnhubContextType = {
    apiKey,
    setApiKey,
    isApiKeySet,
    
    // Wrap all service methods
    getQuote: (symbol) => wrapServiceMethod(finnhubService.getQuote, symbol),
    getCompanyProfile: (symbol) => wrapServiceMethod(finnhubService.getCompanyProfile, symbol),
    getMarketNews: (category) => wrapServiceMethod(finnhubService.getMarketNews, category),
    getCompanyNews: (symbol, from, to) => wrapServiceMethod(finnhubService.getCompanyNews, symbol, from, to),
    getBasicFinancials: (symbol, metric) => wrapServiceMethod(finnhubService.getBasicFinancials, symbol, metric),
    symbolSearch: (query) => wrapServiceMethod(finnhubService.symbolSearch, query),
    getSentiment: (symbol) => wrapServiceMethod(finnhubService.getSentiment, symbol),
    getCandles: (symbol, resolution, from, to) => wrapServiceMethod(finnhubService.getCandles, symbol, resolution, from, to),
    getEarningsCalendar: (from, to) => wrapServiceMethod(finnhubService.getEarningsCalendar, from, to),
    getIpoCalendar: (from, to) => wrapServiceMethod(finnhubService.getIpoCalendar, from, to),
    
    loading,
    error
  };

  return (
    <FinnhubContext.Provider value={value}>
      {children}
    </FinnhubContext.Provider>
  );
};

// Custom hook to use the Finnhub context
export const useFinnhub = () => {
  const context = useContext(FinnhubContext);
  
  if (!context) {
    throw new Error('useFinnhub must be used within a FinnhubProvider');
  }
  
  return context;
};