import { v4 as uuidv4 } from "uuid";

// Mock data for demonstration that matches the structure in Expenses.tsx
export const mockExpenses = [
  {
    id: "1",
    amount: 45.99,
    category: "food",
    date: "2023-06-15",
    description: "Grocery Shopping",
    isRecurring: false,
    paymentMethod: "Credit Card"
  },
  {
    id: "2",
    amount: 120.00,
    category: "bills",
    date: "2023-06-10",
    description: "Electricity Bill",
    isRecurring: true,
    paymentMethod: "Bank Transfer"
  },
  {
    id: "3",
    amount: 35.50,
    category: "transport",
    date: "2023-06-08",
    description: "Gas Station",
    isRecurring: false,
    paymentMethod: "Debit Card"
  },
  {
    id: "4",
    amount: 89.99,
    category: "shopping",
    date: "2023-06-05",
    description: "New Shoes",
    isRecurring: false,
    paymentMethod: "Credit Card"
  },
  {
    id: "5",
    amount: 12.99,
    category: "entertainment",
    date: "2023-06-02",
    description: "Movie Tickets",
    isRecurring: false,
    paymentMethod: "Cash"
  },
  {
    id: "6",
    amount: 65.00,
    category: "health",
    date: "2023-05-28",
    description: "Doctor's Appointment",
    isRecurring: false,
    paymentMethod: "Health Insurance"
  },
  {
    id: "7",
    amount: 150.00,
    category: "education",
    date: "2023-05-25",
    description: "Online Course",
    isRecurring: false,
    paymentMethod: "Credit Card"
  },
  {
    id: "8",
    amount: 28.99,
    category: "food",
    date: "2023-05-20",
    description: "Pizza Delivery",
    isRecurring: false,
    paymentMethod: "Cash"
  },
  {
    id: "9",
    amount: 200.00,
    category: "bills",
    date: "2023-05-15",
    description: "Internet & Cable",
    isRecurring: true,
    paymentMethod: "Bank Transfer"
  },
  {
    id: "10",
    amount: 55.75,
    category: "transport",
    date: "2023-05-12",
    description: "Uber Rides",
    isRecurring: false,
    paymentMethod: "Credit Card"
  }
];

/**
 * Initializes the localStorage with mock expense data
 * @returns The number of expenses added to localStorage
 */
export const initializeMockExpensesInLocalStorage = (): number => {
  try {
    // Format the expenses to include createdAt
    const formattedExpenses = mockExpenses.map(expense => ({
      ...expense,
      id: expense.id || uuidv4(),
      createdAt: new Date().toISOString()
    }));

    // Save to localStorage
    localStorage.setItem('expenses', JSON.stringify(formattedExpenses));
    
    console.log(`Successfully initialized ${formattedExpenses.length} mock expenses in localStorage`);
    return formattedExpenses.length;
  } catch (error) {
    console.error("Failed to initialize mock expenses in localStorage:", error);
    return 0;
  }
};

// Add some smart expense data from OCR
export const addSmartExpenseMockData = (): void => {
  try {
    // Get existing expenses
    const existingExpensesJson = localStorage.getItem('expenses') || '[]';
    const existingExpenses = JSON.parse(existingExpensesJson);
    
    // Mock smart expenses (as if captured through OCR)
    const smartExpenses = [
      {
        id: uuidv4(),
        amount: 92.00,
        category: "entertainment",
        date: "2024-04-03", // YYYY-MM-DD format
        description: "Movies Trip",
        isRecurring: false,
        paymentMethod: "Credit Card",
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        amount: 543.75,
        category: "shopping",
        date: "2024-03-13", // YYYY-MM-DD format
        description: "New Smartphone Accessories",
        isRecurring: false,
        paymentMethod: "Debit Card",
        createdAt: new Date().toISOString()
      },
      {
        id: uuidv4(),
        amount: 150.50,
        category: "food",
        date: "2024-03-28", // YYYY-MM-DD format
        description: "Weekend Dinner Party",
        isRecurring: false,
        paymentMethod: "Cash",
        createdAt: new Date().toISOString()
      }
    ];
    
    // Add smart expenses to existing ones
    const updatedExpenses = [...existingExpenses, ...smartExpenses];
    
    // Save back to localStorage
    localStorage.setItem('expenses', JSON.stringify(updatedExpenses));
    
    console.log(`Successfully added ${smartExpenses.length} smart expenses to localStorage`);
    
    // Dispatch events to notify that expenses were added
    smartExpenses.forEach(expense => {
      const expenseAddedEvent = new CustomEvent('expenseAdded', {
        detail: expense,
        bubbles: true,
        composed: true
      });
      
      document.dispatchEvent(expenseAddedEvent);
      console.log("Expense added event dispatched for:", expense.description);
    });
    
  } catch (error) {
    console.error("Failed to add smart expenses to localStorage:", error);
  }
}; 