import { useState } from 'react';
import BudgetCard from '@/components/BudgetCard';
import { type Budget } from '@/components/BudgetCard';
import AddBudgetModal from '@/components/AddBudgetModal';
import SpendingTrendChart from '@/components/SpendingTrendChart';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  CreditCard,
  AlertTriangle,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  BellRing,
  XCircle,
  CheckCircle2,
  InfoIcon,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatIndianCurrency } from '@/utils/currency';

// Mock data for demonstration
const mockBudgets: Budget[] = [
  {
    id: '1',
    category: 'Food & Dining',
    amount: 15000,
    spent: 12500,
    period: 'monthly',
  },
  {
    id: '2',
    category: 'Transportation',
    amount: 8000,
    spent: 6500,
    period: 'monthly',
  },
  {
    id: '3',
    category: 'Entertainment',
    amount: 5000,
    spent: 4200,
    period: 'monthly',
  },
  {
    id: '4',
    category: 'Shopping',
    amount: 10000,
    spent: 11500,
    period: 'monthly',
  },
  {
    id: '5',
    category: 'Bills & Utilities',
    amount: 20000,
    spent: 18500,
    period: 'monthly',
  },
  {
    id: '6',
    category: 'Health & Fitness',
    amount: 6000,
    spent: 4800,
    period: 'monthly',
  },
];

const mockTrendData = [
  { date: 'Jan', amount: 45000, budget: 50000 },
  { date: 'Feb', amount: 48000, budget: 50000 },
  { date: 'Mar', amount: 47000, budget: 50000 },
  { date: 'Apr', amount: 51000, budget: 50000 },
  { date: 'May', amount: 55000, budget: 50000 },
  { date: 'Jun', amount: 52000, budget: 50000 },
];

const mockWeeklyTrendData = [
  { date: 'Mon', amount: 2500, budget: 3000 },
  { date: 'Tue', amount: 2000, budget: 3000 },
  { date: 'Wed', amount: 2800, budget: 3000 },
  { date: 'Thu', amount: 1800, budget: 3000 },
  { date: 'Fri', amount: 3500, budget: 3000 },
  { date: 'Sat', amount: 4000, budget: 3000 },
  { date: 'Sun', amount: 3200, budget: 3000 },
];

const mockYearlyTrendData = [
  { date: '2023', amount: 600000, budget: 650000 },
  { date: '2022', amount: 550000, budget: 600000 },
  { date: '2021', amount: 500000, budget: 550000 },
  { date: '2020', amount: 450000, budget: 500000 },
  { date: '2019', amount: 400000, budget: 450000 },
];

const BudgetPage = () => {
  const [budgets, setBudgets] = useState<Budget[]>(mockBudgets);
  const [trendData, setTrendData] = useState(mockTrendData);
  const [weeklyTrendData, setWeeklyTrendData] = useState(mockWeeklyTrendData);
  const [yearlyTrendData, setYearlyTrendData] = useState(mockYearlyTrendData);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
  const remainingBudget = totalBudget - totalSpent;
  const budgetPercentage = (totalSpent / totalBudget) * 100;

  // Use the utility consistently
  const formattedTotalBudget = formatIndianCurrency(totalBudget);
  const formattedTotalSpent = formatIndianCurrency(totalSpent);
  const formattedRemainingBudget = formatIndianCurrency(remainingBudget);

  const handleAddBudget = (budget: {
    category: string;
    amount: number;
    period: 'weekly' | 'monthly' | 'yearly';
  }) => {
    const newBudget: Budget = {
      id: uuidv4(),
      ...budget,
      spent: 0,
    };

    setBudgets([...budgets, newBudget]);
    toast.success('Budget added successfully!');
  };

  const handleTimeRangeChange = (range: 'week' | 'month' | 'year') => {
    setTimeRange(range);
  };

  const getCurrentTrendData = () => {
    if (timeRange === 'week') return weeklyTrendData;
    if (timeRange === 'year') return yearlyTrendData;
    return trendData;
  };

  const getBudgetsWithStatus = () => {
    const onTrack = budgets.filter(budget => budget.spent / budget.amount < 0.8);
    const warning = budgets.filter(
      budget => budget.spent / budget.amount >= 0.8 && budget.spent / budget.amount < 1
    );
    const overBudget = budgets.filter(budget => budget.spent > budget.amount);

    return { onTrack, warning, overBudget };
  };

  const { onTrack, warning, overBudget } = getBudgetsWithStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Budget Management</h1>
                <p className="text-muted-foreground">Set, track, and analyze your budgets</p>
              </div>
              <AddBudgetModal onAddBudget={handleAddBudget} />
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Total Budget</CardTitle>
                <CardDescription>Monthly allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">{formattedTotalBudget}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Last updated on {new Date().toLocaleDateString()}
                  </span>
                  <div className="flex items-center text-blue-500">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>+5% vs last month</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Budget Status</CardTitle>
                <CardDescription>Current spending vs budget</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">{formattedTotalSpent}</span>
                  <span className="text-base font-medium">of {formattedTotalBudget}</span>
                </div>
                <Progress
                  value={budgetPercentage > 100 ? 100 : budgetPercentage}
                  className={cn(
                    'h-2 mt-2',
                    budgetPercentage > 90
                      ? 'bg-red-100'
                      : budgetPercentage > 75
                        ? 'bg-amber-100'
                        : 'bg-green-100'
                  )}
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>{budgetPercentage.toFixed(0)}% used</span>
                  <span
                    className={`font-medium ${
                      remainingBudget < 0 ? 'text-red-500' : 'text-green-500'
                    }`}
                  >
                    {remainingBudget < 0 ? 'Over by ' : 'Remaining: '}
                    {formattedRemainingBudget.replace('-', '')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Budget Insights</CardTitle>
                <CardDescription>Quick overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </div>
                      <span>On Track</span>
                    </div>
                    <span className="font-medium">{onTrack.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      </div>
                      <span>Warning</span>
                    </div>
                    <span className="font-medium">{warning.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center mr-3">
                        <XCircle className="h-4 w-4 text-red-600" />
                      </div>
                      <span>Over Budget</span>
                    </div>
                    <span className="font-medium">{overBudget.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <SpendingTrendChart
              data={getCurrentTrendData()}
              title="Budget vs. Actual Spending"
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Your Budgets</h2>
              <AddBudgetModal onAddBudget={handleAddBudget} />
            </div>

            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">Budget</TabsTrigger>
                <TabsTrigger value="warning">
                  Warning
                  {warning.length > 0 && (
                    <span className="ml-1 bg-amber-100 text-amber-700 text-xs rounded-full px-2">
                      {warning.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="over">
                  Over Budget
                  {overBudget.length > 0 && (
                    <span className="ml-1 bg-red-100 text-red-700 text-xs rounded-full px-2">
                      {overBudget.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {budgets.map(budget => (
                    <BudgetCard key={budget.id} budget={budget} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="warning" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {warning.length > 0 ? (
                    warning.map(budget => <BudgetCard key={budget.id} budget={budget} />)
                  ) : (
                    <div className="col-span-full flex items-center justify-center py-12 text-center">
                      <div>
                        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">No Budgets at Risk</h3>
                        <p className="text-muted-foreground max-w-md mb-6">
                          Great job! All your budgets are either on track or already over budget.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="over" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {overBudget.length > 0 ? (
                    overBudget.map(budget => <BudgetCard key={budget.id} budget={budget} />)
                  ) : (
                    <div className="col-span-full flex items-center justify-center py-12 text-center">
                      <div>
                        <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">No Budgets Over Limit</h3>
                        <p className="text-muted-foreground max-w-md mb-6">
                          Excellent! You're staying within all your budget limits.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="mt-12 bg-blue-50 rounded-xl p-6 border border-blue-100 animate-fade-in">
            <div className="flex items-start">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-4 flex-shrink-0">
                <InfoIcon className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Budget Tips</h3>
                <p className="text-muted-foreground mb-4">
                  Here are some tips to help you stay on track with your budgets:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center mr-2 mt-0.5">
                      1
                    </span>
                    <span>
                      Set realistic budget limits based on your historical spending patterns.
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center mr-2 mt-0.5">
                      2
                    </span>
                    <span>Review your budgets weekly to catch potential overruns early.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center mr-2 mt-0.5">
                      3
                    </span>
                    <span>Adjust your budgets as your financial situation changes.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-700 rounded-full h-5 w-5 flex items-center justify-center mr-2 mt-0.5">
                      4
                    </span>
                    <span>Use the forecasting feature to anticipate future expenses.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BudgetPage;
