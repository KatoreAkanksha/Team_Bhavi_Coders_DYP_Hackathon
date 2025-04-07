import { useState, useEffect } from "react";
import ExpenseCard, { Expense, ExpenseCategory } from "@/components/ExpenseCard";
import TransactionList from "@/components/TransactionList";
import AddExpenseModal from "@/components/AddExpenseModal";
import CategoriesPieChart from "@/components/CategoriesPieChart";
import { Button } from "@/components/ui/button";
import {
  Input
} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { v4 as uuidv4 } from "uuid";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  CreditCard,
  ChevronDown,
  Clock,
  CalendarRange
} from "lucide-react";
import { toast } from "sonner";
import { formatIndianCurrency, formatInr } from "@/utils/currency";
import { mockExpenses } from "@/utils/initMockData";

const mockCategoryData = [
  { name: "Food", value: 350, color: "#FF6B6B" },
  { name: "Transport", value: 220, color: "#4ECDC4" },
  { name: "Shopping", value: 420, color: "#FFD166" },
  { name: "Entertainment", value: 180, color: "#6A0572" },
  { name: "Bills", value: 450, color: "#1A535C" },
  { name: "Health", value: 120, color: "#F25F5C" },
  { name: "Education", value: 200, color: "#247BA0" }
];

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [categoryData, setCategoryData] = useState(mockCategoryData);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);

  // Load expenses from localStorage on mount and when new expenses are added
  useEffect(() => {
    const loadExpenses = () => {
      try {
        const storedExpenses = localStorage.getItem('expenses');
        if (storedExpenses) {
          const parsedExpenses = JSON.parse(storedExpenses);
          console.log("Loaded expenses from localStorage:", parsedExpenses);
          
          // Format dates and other fields for display
          const formattedExpenses = parsedExpenses.map((exp: any) => ({
            id: exp.id || uuidv4(),
            amount: exp.amount,
            // Ensure category is a valid ExpenseCategory
            category: (exp.category || 'other') as ExpenseCategory,
            date: exp.date ? new Date(exp.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: exp.description,
            isRecurring: exp.isRecurring || false,
            paymentMethod: exp.paymentMethod || 'card'
          }));
          
          // Replace existing expenses with localStorage data
          setExpenses(formattedExpenses);
          
          // Update filtered expenses based on current filters
          applyFilters(formattedExpenses);
        } else {
          // If localStorage is empty, use mock data as fallback
          // Type cast mockExpenses to Expense[] to satisfy TypeScript
          setExpenses(mockExpenses as unknown as Expense[]);
          applyFilters(mockExpenses as unknown as Expense[]);
        }
      } catch (error) {
        console.error('Error loading expenses from localStorage:', error);
        // Fallback to mock data if localStorage fails
        setExpenses(mockExpenses as unknown as Expense[]);
        applyFilters(mockExpenses as unknown as Expense[]);
      }
    };

    // Helper function to apply filters
    const applyFilters = (expensesData: Expense[]) => {
      let filtered = [...expensesData];
      
      // Apply category filter
      if (categoryFilter !== "all") {
        filtered = filtered.filter(
          (exp) => exp.category.toLowerCase() === categoryFilter.toLowerCase()
        );
      }
      
      // Apply date filter
      if (dateFilter === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(
          (exp) => new Date(exp.date) >= weekAgo
        );
      } else if (dateFilter === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filtered = filtered.filter(
          (exp) => new Date(exp.date) >= monthAgo
        );
      } else if (dateFilter === "year") {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        filtered = filtered.filter(
          (exp) => new Date(exp.date) >= yearAgo
        );
      }
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (exp) =>
            exp.description.toLowerCase().includes(query) ||
            exp.category.toLowerCase().includes(query) ||
            (exp.paymentMethod && exp.paymentMethod.toLowerCase().includes(query))
        );
      }
      
      setFilteredExpenses(filtered);
    };

    // Listen for custom event when new expense is added
    const handleExpenseAdded = (event: any) => {
      console.log("Expense added event received:", event.detail);
      // Reload expenses from localStorage
      loadExpenses();
      
      // Show success notification
      toast.success("Expense added to your list!");
    };

    // Initial load
    loadExpenses();

    // Add event listeners to both document and window to ensure we catch the event
    document.addEventListener('expenseAdded', handleExpenseAdded);
    window.addEventListener('expenseAdded', handleExpenseAdded);
    
    // Clean up event listeners
    return () => {
      document.removeEventListener('expenseAdded', handleExpenseAdded);
      window.removeEventListener('expenseAdded', handleExpenseAdded);
    };
  }, [categoryFilter, dateFilter, searchQuery]);

  // Handle adding a new expense
  const handleAddExpense = (expense: {
    amount: number;
    category: ExpenseCategory;
    date: Date;
    description: string;
    isRecurring: boolean;
    paymentMethod: string;
  }) => {
    const newExpense: Expense = {
      id: uuidv4(),
      ...expense,
      date: expense.date.toISOString().split("T")[0],
    };
    
    // Add to current state
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    
    // Also save to localStorage for persistence
    try {
      const existingExpensesJson = localStorage.getItem('expenses') || '[]';
      const existingExpenses = JSON.parse(existingExpensesJson);
      
      existingExpenses.push({
        ...newExpense,
        createdAt: new Date().toISOString()
      });
      
      localStorage.setItem('expenses', JSON.stringify(existingExpenses));
      
      // Dispatch event to notify that expense was added
      const expenseAddedEvent = new CustomEvent('expenseAdded', { 
        detail: newExpense,
        bubbles: true,
        composed: true
      });
      
      document.dispatchEvent(expenseAddedEvent);
      window.dispatchEvent(expenseAddedEvent);
      console.log("Expense added event dispatched from Expenses.tsx:", newExpense);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    // Update category data for pie chart
    const categoryIndex = categoryData.findIndex(
      (cat: typeof categoryData[0]) => cat.name.toLowerCase() === expense.category
    );
    
    if (categoryIndex >= 0) {
      const newCategoryData = [...categoryData];
      newCategoryData[categoryIndex].value += expense.amount;
      setCategoryData(newCategoryData);
    }
    
    toast.success(`Expense added: ${formatInr(expense.amount)}`);
  };

  // Update category data whenever expenses change
  useEffect(() => {
    // Create a fresh category data structure
    const updatedCategoryData = [
      { name: "Food", value: 0, color: "#FF6B6B" },
      { name: "Transport", value: 0, color: "#4ECDC4" },
      { name: "Shopping", value: 0, color: "#FFD166" },
      { name: "Entertainment", value: 0, color: "#6A0572" },
      { name: "Bills", value: 0, color: "#1A535C" },
      { name: "Health", value: 0, color: "#F25F5C" },
      { name: "Education", value: 0, color: "#247BA0" },
      { name: "Other", value: 0, color: "#9D8DF1" }
    ];
    
    // Sum up expenses by category
    expenses.forEach(expense => {
      const categoryName = expense.category.charAt(0).toUpperCase() + expense.category.slice(1);
      const categoryIndex = updatedCategoryData.findIndex(cat => cat.name.toLowerCase() === expense.category.toLowerCase());
      
      if (categoryIndex >= 0) {
        updatedCategoryData[categoryIndex].value += expense.amount;
      } else {
        // If category not found, add to "Other"
        const otherIndex = updatedCategoryData.findIndex(cat => cat.name === "Other");
        if (otherIndex >= 0) {
          updatedCategoryData[otherIndex].value += expense.amount;
        }
      }
    });
    
    // Update the category data state
    setCategoryData(updatedCategoryData);
  }, [expenses]);

  // Calculate total amount of filtered expenses
  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const formattedTotal = formatIndianCurrency(totalAmount);

  return (
    <div className="min-h-screen bg-gray-50">
      
      <main className="pt-2 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Expense Management</h1>
                <p className="text-muted-foreground">Track, filter, and analyze your expenses</p>
              </div>
              <AddExpenseModal onAddExpense={handleAddExpense} />
            </div>
          </div>
          
          {/* Search and Filters */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search expenses..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                  className="flex items-center gap-1"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  <ChevronDown className={`h-4 w-4 transition-transform ${isFiltersVisible ? 'rotate-180' : ''}`} />
                </Button>
                
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Time Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                    <SelectItem value="year">Last 12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Expanded Filters */}
            {isFiltersVisible && (
              <div className="mt-4 p-4 border rounded-lg bg-white animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="food">Food</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="shopping">Shopping</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="bills">Bills</SelectItem>
                        <SelectItem value="health">Health</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Payment Method</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Any method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        <SelectItem value="creditCard">Credit Card</SelectItem>
                        <SelectItem value="debitCard">Debit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Amount Range</label>
                    <div className="flex items-center gap-2">
                      <Input type="number" placeholder="Min" className="w-full" />
                      <span>-</span>
                      <Input type="number" placeholder="Max" className="w-full" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    Reset Filters
                  </Button>
                  <Button size="sm">
                    Apply Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Stats & Overview */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl border shadow-subtle p-6 h-full">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Expense Summary</h2>
                  <div className="flex items-center space-x-1 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {dateFilter === "all" 
                        ? "All Time" 
                        : dateFilter === "week"
                          ? "Last 7 days"
                          : dateFilter === "month"
                            ? "Last 30 days"
                            : "Last 12 months"
                      }
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm text-muted-foreground">Total Expenses</span>
                    <h3 className="text-3xl font-bold mt-1">{formattedTotal}</h3>
                    
                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Payment Methods</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                              <span>Credit Card</span>
                            </div>
                            <span className="font-medium">{formatIndianCurrency(43221.25)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                              <span>Bank Transfer</span>
                            </div>
                            <span className="font-medium">{formatIndianCurrency(26560.00)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2 text-purple-500" />
                              <span>Cash</span>
                            </div>
                            <span className="font-medium">{formatIndianCurrency(3484.34)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Time Distribution</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CalendarRange className="h-4 w-4 mr-2 text-indigo-500" />
                              <span>Last 7 days</span>
                            </div>
                            <span className="font-medium">{formatIndianCurrency(21121.84)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <CalendarRange className="h-4 w-4 mr-2 text-pink-500" />
                              <span>8-30 days ago</span>
                            </div>
                            <span className="font-medium">{formatIndianCurrency(52144.75)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <CategoriesPieChart 
                    data={categoryData} 
                    title="Category Breakdown"
                    className="border-0 p-0 shadow-none"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <div className="bg-white rounded-xl border shadow-subtle p-6 h-full">
                <h2 className="text-lg font-semibold mb-4">Recent Expenses</h2>
                <div className="space-y-4">
                  {filteredExpenses.slice(0, 5).map((expense) => (
                    <ExpenseCard 
                      key={expense.id} 
                      expense={expense} 
                      isCompact={true}
                    />
                  ))}
                  
                  {filteredExpenses.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No expenses found matching your filters</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* All Expenses */}
          <div>
            <h2 className="text-xl font-semibold mb-4">All Expenses</h2>
            <div className="bg-white rounded-xl border shadow-subtle">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((expense) => (
                    <ExpenseCard key={expense.id} expense={expense} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <p className="text-xl text-muted-foreground mb-4">No expenses found</p>
                    <p className="text-muted-foreground mb-6">Try changing your filters or add a new expense</p>
                    <AddExpenseModal onAddExpense={handleAddExpense} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Expenses;
