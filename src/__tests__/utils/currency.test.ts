import { describe, it, expect } from 'vitest';
import { formatIndianCurrency, usdToInr } from '@/utils/currency';

describe('Currency Utilities', () => {
  describe('formatIndianCurrency', () => {
    it('formats integer amounts correctly', () => {
      expect(formatIndianCurrency(1000)).toBe('₹1,000.00');
    });

    it('formats decimal amounts correctly', () => {
      expect(formatIndianCurrency(1000.50)).toBe('₹1,000.50');
    });

    it('formats large amounts with proper Indian number formatting', () => {
      expect(formatIndianCurrency(1234567.89)).toBe('₹12,34,567.89');
    });

    it('formats zero correctly', () => {
      expect(formatIndianCurrency(0)).toBe('₹0.00');
    });

    it('formats negative amounts correctly', () => {
      expect(formatIndianCurrency(-1000)).toBe('-₹1,000.00');
    });
  });

  describe('usdToInr', () => {
    it('converts USD to INR using the fixed rate', () => {
      // The fixed rate is 83 as defined in the function
      expect(usdToInr(1)).toBe(83);
    });

    it('handles decimal values correctly', () => {
      expect(usdToInr(1.5)).toBe(124.5);
    });

    it('rounds to 2 decimal places', () => {
      expect(usdToInr(1.234)).toBe(102.42); // 1.234 * 83 = 102.422, rounded to 102.42
    });

    it('handles zero correctly', () => {
      expect(usdToInr(0)).toBe(0);
    });

    it('handles negative values correctly', () => {
      expect(usdToInr(-10)).toBe(-830);
    });
  });
});