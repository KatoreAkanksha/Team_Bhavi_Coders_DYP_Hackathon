import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, LineChart, BarChart2, DollarSign } from 'lucide-react';

// Mock stock data
const mockStocks = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2456.75, change: 1.2, volume: '3.2M' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3567.50, change: -0.8, volume: '1.8M' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1678.30, change: 0.5, volume: '2.5M' },
  { symbol: 'INFY', name: 'Infosys', price: 1456.25, change: 2.3, volume: '4.1M' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 945.60, change: -1.1, volume: '3.7M' },
];

// Mock portfolio data
const mockPortfolio = [
  { symbol: 'RELIANCE', shares: 10, avgPrice: 2400.00, currentValue: 24567.50, profit: 567.50 },
  { symbol: 'TCS', shares: 5, avgPrice: 3600.00, currentValue: 17837.50, profit: -162.50 },
  { symbol: 'INFY', shares: 15, avgPrice: 1400.00, currentValue: 21843.75, profit: 843.75 },
];

// Mock market indices
const mockIndices = [
  { name: 'SENSEX', value: 66789.45, change: 0.8 },
  { name: 'NIFTY 50', value: 19876.30, change: 0.7 },
  { name: 'NIFTY BANK', value: 45678.90, change: -0.3 },
];

export const StockMarketDashboard: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Dashboard</CardTitle>
        <CardDescription>Track and monitor stock market trends</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">
              <LineChart className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="portfolio">
              <DollarSign className="h-4 w-4 mr-2" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="watchlist">
              <BarChart2 className="h-4 w-4 mr-2" />
              Watchlist
            </TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              {mockIndices.map((index, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{index.name}</p>
                        <p className="text-2xl font-bold">{index.value.toLocaleString()}</p>
                      </div>
                      <Badge 
                        className={index.change >= 0 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                        }
                      >
                        {index.change >= 0 
                          ? <TrendingUp className="h-3 w-3 mr-1 inline" /> 
                          : <TrendingDown className="h-3 w-3 mr-1 inline" />
                        }
                        {index.change >= 0 ? "+" : ""}{index.change}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="border rounded-lg">
              <div className="p-4 border-b">
                <h3 className="font-medium">Market Movers</h3>
              </div>
              <div className="divide-y">
                {mockStocks.map((stock, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{stock.price.toLocaleString()}</p>
                      <div className="flex items-center">
                        <Badge 
                          className={stock.change >= 0 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                          }
                        >
                          {stock.change >= 0 
                            ? <TrendingUp className="h-3 w-3 mr-1 inline" /> 
                            : <TrendingDown className="h-3 w-3 mr-1 inline" />
                          }
                          {stock.change >= 0 ? "+" : ""}{stock.change}%
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-2">Vol: {stock.volume}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3 mt-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold">₹{mockPortfolio.reduce((sum, stock) => sum + stock.currentValue, 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Profit/Loss</p>
                  <p className={`text-2xl font-bold ${mockPortfolio.reduce((sum, stock) => sum + stock.profit, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{mockPortfolio.reduce((sum, stock) => sum + stock.profit, 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-muted-foreground">Holdings</p>
                  <p className="text-2xl font-bold">{mockPortfolio.length}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="border rounded-lg">
              <div className="p-4 border-b">
                <h3 className="font-medium">Your Portfolio</h3>
              </div>
              <div className="divide-y">
                {mockPortfolio.map((holding, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{holding.symbol}</p>
                        <p className="text-sm text-muted-foreground">{holding.shares} shares @ ₹{holding.avgPrice.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{holding.currentValue.toLocaleString()}</p>
                        <p className={holding.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {holding.profit >= 0 ? '+' : ''}₹{holding.profit.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          {/* Watchlist Tab */}
          <TabsContent value="watchlist" className="space-y-6">
            <div className="border rounded-lg mt-4">
              <div className="p-4 border-b">
                <h3 className="font-medium">Your Watchlist</h3>
              </div>
              <div className="divide-y">
                {mockStocks.slice(0, 3).map((stock, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{stock.symbol}</p>
                      <p className="text-sm text-muted-foreground">{stock.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">₹{stock.price.toLocaleString()}</p>
                      <div className="flex items-center">
                        <Badge 
                          className={stock.change >= 0 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                          }
                        >
                          {stock.change >= 0 
                            ? <TrendingUp className="h-3 w-3 mr-1 inline" /> 
                            : <TrendingDown className="h-3 w-3 mr-1 inline" />
                          }
                          {stock.change >= 0 ? "+" : ""}{stock.change}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};