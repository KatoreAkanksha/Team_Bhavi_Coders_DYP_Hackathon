// Currency conversion rates to INR (as of April 2024)
const CONVERSION_RATES = {
  USD: 83.5, // 1 USD = 83.5 INR
  EUR: 90.2, // 1 EUR = 90.2 INR
  GBP: 105.5, // 1 GBP = 105.5 INR
  JPY: 0.55, // 1 JPY = 0.55 INR
  INR: 1.0, // 1 INR = 1 INR (no conversion)
  UNKNOWN: 1.0 // Default for unknown currencies
};

/**
 * Format currency amount in Indian Rupees
 * @param amount - The amount to format
 * @returns Formatted currency string with ₹ symbol
 */
export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert USD to INR
 * @param usdAmount - Amount in USD
 * @returns Equivalent amount in INR
 */
export const usdToInr = (usdAmount: number): number => {
  return parseFloat((usdAmount * CONVERSION_RATES.USD).toFixed(2));
};

/**
 * Convert any currency to INR
 * @param amount - Amount in source currency
 * @param currency - Source currency code (USD, EUR, GBP, JPY, INR)
 * @returns Equivalent amount in INR
 */
export const toInr = (amount: number, currency: string): number => {
  // Get conversion rate or default to 1 (no conversion)
  const rate = CONVERSION_RATES[currency as keyof typeof CONVERSION_RATES] || 1;
  return parseFloat((amount * rate).toFixed(2));
};

/**
 * Format amount as INR currency string
 * @param amount - Amount in INR
 * @returns Formatted string (e.g., "₹1,234.56")
 */
export const formatInr = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Format amount according to specified currency
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string): string => {
  let currencyCode = 'INR';
  let locale = 'en-IN';
  
  switch (currency) {
    case 'USD':
      currencyCode = 'USD';
      locale = 'en-US';
      break;
    case 'EUR':
      currencyCode = 'EUR';
      locale = 'de-DE';
      break;
    case 'GBP':
      currencyCode = 'GBP';
      locale = 'en-GB';
      break;
    case 'JPY':
      currencyCode = 'JPY';
      locale = 'ja-JP';
      break;
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2
  }).format(amount);
};
