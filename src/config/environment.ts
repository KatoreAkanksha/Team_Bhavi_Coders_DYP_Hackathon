interface Environment {
  FINNHUB_API_KEY: string;
  APP_NAME: string;
  APP_VERSION: string;
  IS_DEVELOPMENT: boolean;
}

export const env: Environment = {
  FINNHUB_API_KEY: import.meta.env.VITE_FINNHUB_API_KEY || '',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SmartBudget',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  IS_DEVELOPMENT: import.meta.env.DEV || false,
};

export const validateEnvironment = (): void => {
  const required = ['FINNHUB_API_KEY'];
  
  const missing = required.filter(key => !env[key as keyof Environment]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and make sure all required variables are set.'
    );
  }
};
