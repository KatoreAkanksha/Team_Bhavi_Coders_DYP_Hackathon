import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpenseCard, { Expense } from '@/components/ExpenseCard';

// Mock the currency utility
vi.mock('@/utils/currency', () => ({
  formatIndianCurrency: (amount: number) => `₹${amount.toFixed(2)}`,
}));

const mockExpense: Expense = {
  id: "1",
  amount: 3817.17,
  category: "food",
  date: "2024-07-15",
  description: "Dinner at Restaurant",
  isRecurring: false,
  paymentMethod: "Credit Card"
};

describe('ExpenseCard', () => {
  it('renders expense details correctly', () => {
    render(<ExpenseCard expense={mockExpense} />);

    // Check if description is rendered
    expect(screen.getByText('Dinner at Restaurant')).toBeInTheDocument();

    // Check if amount is rendered
    expect(screen.getByText('₹3817.17')).toBeInTheDocument();

    // Check if date is rendered (formatted as Jul 15)
    expect(screen.getByText('Jul 15')).toBeInTheDocument();

    // Check if payment method is rendered
    expect(screen.getByText('Credit Card')).toBeInTheDocument();
  });

  it('renders compact version correctly', () => {
    render(<ExpenseCard expense={mockExpense} isCompact={true} />);

    // Check if description is rendered
    expect(screen.getByText('Dinner at Restaurant')).toBeInTheDocument();

    // Check if amount is rendered
    expect(screen.getByText('₹3817.17')).toBeInTheDocument();

    // Check if date is rendered
    expect(screen.getByText('Jul 15')).toBeInTheDocument();

    // Compact version doesn't show payment method
    expect(screen.queryByText('Credit Card')).not.toBeInTheDocument();
  });

  it('shows recurring badge when expense is recurring', () => {
    const recurringExpense = { ...mockExpense, isRecurring: true };
    render(<ExpenseCard expense={recurringExpense} />);

    // Check if recurring badge is rendered
    expect(screen.getByText('Recurring')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<ExpenseCard expense={mockExpense} onClick={handleClick} />);

    // Click on the card
    fireEvent.click(screen.getByText('Dinner at Restaurant'));

    // Check if onClick handler was called
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
}); 