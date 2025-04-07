/**
 * Application routes configuration
 */
export const ROUTES = {
  DASHBOARD: '/dashboard',
  EXPENSES: '/expenses',
  BUDGET: '/budget',
  GROUPS: '/groups',
  FINANCIAL_ADVISOR: '/financial-advisor',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  NOT_FOUND: '/404',
} as const;

/**
 * Application theme configuration
 */
export const THEME = {
  DEFAULT: 'light',
  DARK: 'dark',
  LIGHT: 'light',
} as const;

/**
 * Toast configuration
 */
export const TOAST = {
  POSITION: 'top-right',
  DURATION: 5000,
} as const;

/**
 * API configuration
 */
export const API = {
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

/**
 * Application configuration
 */
export const APP = {
  NAME: 'Finance App',
  VERSION: '1.0.0',
  DESCRIPTION: 'A personal finance management application',
} as const;

export const CURRENCY = {
  SYMBOL: '₹',
  CODE: 'INR',
  DEFAULT_LOCALE: 'en-IN',
} as const;

export const BUDGET_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: '🍽️', defaultLimit: 15000 },
  { id: 'transport', name: 'Transportation', icon: '��', defaultLimit: 8000 },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮', defaultLimit: 5000 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', defaultLimit: 10000 },
  { id: 'bills', name: 'Bills & Utilities', icon: '💡', defaultLimit: 12000 },
  { id: 'health', name: 'Health & Fitness', icon: '💊', defaultLimit: 3000 },
  { id: 'education', name: 'Education', icon: '📚', defaultLimit: 20000 },
  { id: 'travel', name: 'Travel', icon: '✈️', defaultLimit: 25000 },
  { id: 'savings', name: 'Savings', icon: '💰', defaultLimit: 20000 },
  { id: 'other', name: 'Other', icon: '📦', defaultLimit: 5000 },
] as const;

export const EXPENSE_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', icon: '🍽️' },
  { id: 'transport', name: 'Transportation', icon: '🚗' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️' },
  { id: 'bills', name: 'Bills & Utilities', icon: '💡' },
  { id: 'health', name: 'Health & Fitness', icon: '💊' },
  { id: 'education', name: 'Education', icon: '📚' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'savings', name: 'Savings', icon: '💰' },
  { id: 'other', name: 'Other', icon: '📦' },
] as const;

export const SMART_ALERTS = [
  {
    type: 'warning',
    title: 'Unusual Spending',
    message: 'Your dining expenses are 40% higher than last month.',
  },
  {
    type: 'info',
    title: 'Savings Opportunity',
    message: 'You could save ₹8,000 by reducing subscription services.',
  },
  {
    type: 'success',
    title: 'Budget Goal Progress',
    message: "You're on track to meet your savings goal this month!",
  },
  {
    type: 'info',
    title: 'New Feature Available',
    message: 'Try our new expense splitting feature for group expenses.',
  },
  {
    type: 'warning',
    title: 'Bill Due Soon',
    message: 'Your electricity bill payment is due in 3 days.',
  },
  {
    type: 'success',
    title: 'Investment Update',
    message: 'Your investment portfolio has grown by 5.2% this month.',
  },
  {
    type: 'info',
    title: 'Tax Saving Tip',
    message: 'Review your tax-saving investments before the financial year ends.',
  },
  {
    type: 'warning',
    title: 'Budget Alert',
    message: "You've reached 85% of your entertainment budget for this month.",
  },
] as const;
