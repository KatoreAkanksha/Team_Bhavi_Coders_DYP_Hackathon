/**
 * This file contains scripts that can be manually copied and pasted into the browser console
 * to initialize or reset mock data. This is not meant to be imported, but to be used as a
 * reference for manual operations.
 */

// Copy and paste this entire section into your browser console to initialize mock data:

/*
// Mock data for demonstration
const mockExpenses = [
  {
    id: "1",
    amount: 45.99,
    category: "food",
    date: "2023-06-15",
    description: "Grocery Shopping",
    isRecurring: false,
    paymentMethod: "Credit Card",
    createdAt: new Date().toISOString()
  },
  {
    id: "2",
    amount: 120.00,
    category: "bills",
    date: "2023-06-10",
    description: "Electricity Bill",
    isRecurring: true,
    paymentMethod: "Bank Transfer",
    createdAt: new Date().toISOString()
  },
  {
    id: "3",
    amount: 35.50,
    category: "transport",
    date: "2023-06-08",
    description: "Gas Station",
    isRecurring: false,
    paymentMethod: "Debit Card",
    createdAt: new Date().toISOString()
  },
  {
    id: "4",
    amount: 89.99,
    category: "shopping",
    date: "2023-06-05",
    description: "New Shoes",
    isRecurring: false,
    paymentMethod: "Credit Card",
    createdAt: new Date().toISOString()
  },
  {
    id: "5",
    amount: 12.99,
    category: "entertainment",
    date: "2023-06-02",
    description: "Movie Tickets",
    isRecurring: false,
    paymentMethod: "Cash",
    createdAt: new Date().toISOString()
  },
  {
    id: "6",
    amount: 65.00,
    category: "health",
    date: "2023-05-28",
    description: "Doctor's Appointment",
    isRecurring: false,
    paymentMethod: "Health Insurance",
    createdAt: new Date().toISOString()
  }
];

// Smart expenses from OCR
const smartExpenses = [
  {
    id: Date.now().toString() + "1",
    amount: 92.00,
    category: "entertainment",
    date: "2024-04-03",
    description: "Movies Trip",
    isRecurring: false,
    paymentMethod: "Credit Card",
    createdAt: new Date().toISOString()
  },
  {
    id: Date.now().toString() + "2",
    amount: 543.75,
    category: "shopping",
    date: "2024-03-13",
    description: "New Smartphone Accessories",
    isRecurring: false,
    paymentMethod: "Debit Card",
    createdAt: new Date().toISOString()
  }
];

// Combine all expenses
const allExpenses = [...mockExpenses, ...smartExpenses];

// Save to localStorage
localStorage.setItem('expenses', JSON.stringify(allExpenses));
localStorage.setItem('mockDataInitialized', 'true');

// Dispatch events to notify components that expenses were added
allExpenses.forEach(expense => {
  const expenseAddedEvent = new CustomEvent('expenseAdded', {
    detail: expense,
    bubbles: true,
    composed: true
  });
  
  document.dispatchEvent(expenseAddedEvent);
});

console.log('Mock data initialized successfully! Refresh the page to see the changes.');
*/

// To reset all data, copy and paste this section:
/*
localStorage.removeItem('expenses');
localStorage.removeItem('mockDataInitialized');
console.log('All data has been reset. Refresh the page to see changes.');
*/ 