import { finnhubClient } from '../lib/finnhub';
import { isApiKeyValid } from '../config/api';
// Define types inline for simplicity
export interface QuoteData {
  c: number;  // Current price
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface NewsData {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface CompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

export interface FinancialData {
  metric: Record<string, number>;
  metricType: string;
  symbol: string;
}

export interface CandleData {
  c: number[];  // Close prices
  h: number[];  // High prices
  l: number[];  // Low prices
  o: number[];  // Open prices
  s: string;    // Status
  t: number[];  // Timestamps
  v: number[];  // Volumes
}

export type Resolution = '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';

interface ApiErrorDetails {
  code: 'AUTH_ERROR' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
}

class ApiError extends Error {
  code: string;
  constructor({ code, message }: ApiErrorDetails) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

const validateApiKey = () => {
  if (!isApiKeyValid()) {
    throw new ApiError({ 
      code: 'AUTH_ERROR', 
      message: 'API key is not configured or invalid' 
    });
  }
};

const fetchFromFinnhub = async <T>(request: Promise<any>): Promise<T> => {
  try {
    validateApiKey();
    const response = await request;
    
    if (response.response?.status === 403) {
      throw new ApiError({ 
        code: 'AUTH_ERROR',
        message: 'Invalid or expired API key'
      });
    }
    
    if (response.response?.status === 429) {
      throw new ApiError({
        code: 'RATE_LIMIT',
        message: 'API rate limit exceeded'
      });
    }
    
    if (!response.data) {
      // Handle specific error codes
      if (response.status === 403) {
        throw new Error('Finnhub API access denied. The API key may be invalid or expired.');
      } else if (response.status === 429) {
        throw new Error('Finnhub API rate limit exceeded. Please try again later.');
      } else {
        throw new ApiError({
        code: 'NETWORK_ERROR',
        message: 'No data received from Finnhub'
      });
      }
    }
    
    return response.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching from Finnhub:', errorMessage);
    throw new ApiError({
      code: 'UNKNOWN_ERROR',
      message: `Finnhub API error: ${errorMessage}`
    });
  }
};

export const getQuote = async (symbol: string): Promise<QuoteData> => {
  return fetchFromFinnhub(finnhubClient.quote(symbol));
};

export const getMarketNews = async (category = 'general'): Promise<NewsData[]> => {
  return fetchFromFinnhub(finnhubClient.marketNews(category));
};

export const getCompanyProfile = async (symbol: string): Promise<CompanyProfile> => {
  return fetchFromFinnhub(finnhubClient.companyProfile2({ symbol }));
};

export const getCompanyNews = async (symbol: string, from: string, to: string): Promise<NewsData[]> => {
  return fetchFromFinnhub(finnhubClient.companyNews(symbol, from, to));
};

export const getBasicFinancials = async (symbol: string, metric = 'all'): Promise<FinancialData> => {
  return fetchFromFinnhub(finnhubClient.companyBasicFinancials(symbol, metric));
};

export const symbolSearch = async (query: string): Promise<any> => {
  return fetchFromFinnhub(finnhubClient.symbolSearch(query));
};

export const isApiKeySet = (): boolean => {
  return isApiKeyValid();
};

export const getCandles = async (
  symbol: string, 
  resolution: Resolution,
  from: number,
  to: number
): Promise<CandleData> => {
  return fetchFromFinnhub(finnhubClient.stockCandles(symbol, resolution, from, to));
};

export const getSentiment = async (symbol: string): Promise<any> => {
  return fetchFromFinnhub(finnhubClient.newsSentiment(symbol));
};