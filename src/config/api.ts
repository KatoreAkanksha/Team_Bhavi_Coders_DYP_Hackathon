/**
 * API Configuration
 *
 * This file contains configuration for external APIs used in the application.
 * In a production environment, these values should be stored in environment variables.
 */

import { API } from './constants';

interface FinnhubConfig {
  apiKey: string;
  baseUrl: string;
}

// Finnhub API configuration
export const FINNHUB_CONFIG: FinnhubConfig = {
  // Using a demo API key - this is for demonstration purposes only
  // In a real application, you would use your own API key from Finnhub
  apiKey: 'demo',

  // Base URL for the Finnhub API
  baseUrl: 'https://finnhub.io/api/v1',
};

// Local storage key for the API key
const API_KEY_STORAGE_KEY = 'finnhub_api_key';

// Initialization state
let isInitialized = false;
const MAX_RETRIES = 3;

/**
 * Set the Finnhub API key
 * @param apiKey - The API key for Finnhub
 */
export const setFinnhubApiKey = (apiKey: string): void => {
  FINNHUB_CONFIG.apiKey = apiKey;
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (error) {
    console.error('Failed to store API key:', error);
  }
};

/**
 * Get the Finnhub API key
 * @returns The Finnhub API key
 */
export const getFinnhubApiKey = (): string => {
  // Try to get from memory first
  if (FINNHUB_CONFIG.apiKey) {
    return FINNHUB_CONFIG.apiKey;
  }

  // Try to get from local storage
  try {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      FINNHUB_CONFIG.apiKey = storedKey;
      return storedKey;
    }
  } catch (error) {
    console.error('Failed to retrieve API key from storage:', error);
  }

  return FINNHUB_CONFIG.apiKey;
};

/**
 * Check if API key is valid
 */
export const isApiKeyValid = (): boolean => {
  const apiKey = FINNHUB_CONFIG.apiKey;
  // Check if the API key exists, is not empty, and is not the default 'demo' key
  return Boolean(apiKey && apiKey.trim().length > 0 && apiKey !== 'demo');
};

/**
 * Validate the API configuration
 */
export const validateConfiguration = async (): Promise<void> => {
  if (!FINNHUB_CONFIG.baseUrl) {
    throw new Error('Finnhub base URL is not configured');
  }

  // Only warn about API key since it can be set later via UI
  if (!FINNHUB_CONFIG.apiKey) {
    console.warn('Finnhub API key is not set. Some features will be limited.');
  }

  // Skip connectivity test for demo purposes
  if (FINNHUB_CONFIG.apiKey === 'demo') {
    console.info('Using demo API key - skipping connectivity test');
    return;
  }

  // Add basic connectivity test for real API keys
  if (FINNHUB_CONFIG.apiKey) {
    try {
      const response = await fetch(
        `${FINNHUB_CONFIG.baseUrl}/stock/symbol?exchange=US&token=${FINNHUB_CONFIG.apiKey}`
      );
      if (!response.ok) {
        throw new Error('Failed to connect to Finnhub API');
      }
    } catch (error) {
      console.error('Finnhub connectivity test failed:', error);
      console.warn('Using fallback demo data instead of live API data');
      // Don't throw an error, just continue with demo data
    }
  }
};

/**
 * Initialize Finnhub API configuration
 */
export const initializeApi = async (retryCount = 0): Promise<void> => {
  if (isInitialized) return;

  try {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      FINNHUB_CONFIG.apiKey = storedKey;
    }

    await validateConfiguration();
    isInitialized = true;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return initializeApi(retryCount + 1);
    }
    throw error;
  }
};

/**
 * Check initialization status
 */
export const isApiInitialized = (): boolean => {
  return isInitialized;
};

/**
 * Cleanup API configuration
 */
export const cleanupApi = (): void => {
  isInitialized = false;
  FINNHUB_CONFIG.apiKey = '';
};

/**
 * API configuration and setup
 */
export const apiConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: API.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
};

/**
 * API error handling
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API response type
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
}

/**
 * API client configuration
 */
export const apiClient = {
  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', headers = {}, body, params } = options;

    // Add query parameters
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const url = `${apiConfig.baseURL}${endpoint}${queryString}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...apiConfig.headers,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(response.status, data.message || 'API request failed', data);
      }

      return {
        data: data as T,
        status: response.status,
        message: 'Success',
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'Network error occurred');
    }
  },
};
