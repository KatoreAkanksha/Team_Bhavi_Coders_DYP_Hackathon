import { apiClient } from '@/config/api';
import { CURRENCY } from '@/config/constants';

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  userId: string;
  currency: string;
}

export interface CreateExpenseDto {
  amount: number;
  description: string;
  category: string;
  date: string;
  currency?: string;
}

export interface UpdateExpenseDto extends Partial<CreateExpenseDto> {}

export const expenseService = {
  async getExpenses(): Promise<Expense[]> {
    const response = await apiClient.request<Expense[]>('/expenses');
    return response.data.map(expense => ({
      ...expense,
      currency: expense.currency || CURRENCY.CODE,
    }));
  },

  async getExpense(id: string): Promise<Expense> {
    const response = await apiClient.request<Expense>(`/expenses/${id}`);
    return {
      ...response.data,
      currency: response.data.currency || CURRENCY.CODE,
    };
  },

  async createExpense(data: CreateExpenseDto): Promise<Expense> {
    const response = await apiClient.request<Expense>('/expenses', {
      method: 'POST',
      body: {
        ...data,
        currency: data.currency || CURRENCY.CODE,
      },
    });
    return response.data;
  },

  async updateExpense(id: string, data: UpdateExpenseDto): Promise<Expense> {
    const response = await apiClient.request<Expense>(`/expenses/${id}`, {
      method: 'PATCH',
      body: {
        ...data,
        currency: data.currency || CURRENCY.CODE,
      },
    });
    return response.data;
  },

  async deleteExpense(id: string): Promise<void> {
    await apiClient.request<void>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },
};
