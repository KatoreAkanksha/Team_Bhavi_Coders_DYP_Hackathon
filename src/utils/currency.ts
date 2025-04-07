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

// Convert USD to INR (using a fixed rate for demo)
export const usdToInr = (usdAmount: number): number => {
  const conversionRate = 83; // Example fixed rate
  return Number((usdAmount * conversionRate).toFixed(2));
};
