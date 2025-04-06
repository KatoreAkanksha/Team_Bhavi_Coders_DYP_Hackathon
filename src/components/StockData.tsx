import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Generate demo data for when the API fails
const generateDemoData = (symbol: string) => {
  const data = [];
  const today = new Date();
  const baseValue = symbol === 'AAPL' ? 180 : symbol === 'MSFT' ? 350 : symbol === 'GOOGL' ? 140 : 100;

  // Generate 30 days of data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Create some random fluctuation
    const randomFactor = 0.98 + Math.random() * 0.04; // Random between 0.98 and 1.02
    const value = baseValue * randomFactor * (1 + (30 - i) * 0.005); // Slight upward trend

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: parseFloat(value.toFixed(2))
    });
  }

  return data;
};

interface StockQuote {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  color: string;
}

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

// Mock stock data since we're not using an actual API
const mockStocks: Stock[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries",
    price: 2412.75,
    change: 34.5,
    changePercent: 1.45,
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    price: 547.2,
    change: -8.3,
    changePercent: -1.49,
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    price: 1687.65,
    change: 22.75,
    changePercent: 1.37,
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    price: 1412.9,
    change: -5.65,
    changePercent: -0.4,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    price: 3276.45,
    change: 42.8,
    changePercent: 1.32,
  },
  {
    symbol: "WIPRO",
    name: "Wipro Ltd",
    price: 387.25,
    change: 3.15,
    changePercent: 0.82,
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    price: 942.3,
    change: 12.45,
    changePercent: 1.34,
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    price: 628.75,
    change: -2.35,
    changePercent: -0.37,
  },
];

export function StockData() {
  const { t } = useLanguage();
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState("AAPL");
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Mock stock data
  const mockStocksList = [
    {
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 180.95,
      change: 1.95,
      changePercent: 1.09,
    },
    {
      symbol: "MSFT",
      name: "Microsoft Corp.",
      price: 378.85,
      change: -3.15,
      changePercent: -0.82,
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      price: 154.32,
      change: 0.87,
      changePercent: 0.57,
    },
    {
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      price: 179.62,
      change: 2.43,
      changePercent: 1.37,
    },
    {
      symbol: "RELIANCE.BSE",
      name: "Reliance Industries",
      price: 2456.3,
      change: -12.45,
      changePercent: -0.51,
    },
    {
      symbol: "TATAMOTORS.BSE",
      name: "Tata Motors Ltd.",
      price: 943.75,
      change: 15.3,
      changePercent: 1.65,
    },
    {
      symbol: "INFY",
      name: "Infosys Ltd",
      price: 1412.9,
      change: -5.65,
      changePercent: -0.4,
    },
    {
      symbol: "TCS",
      name: "Tata Consultancy Services",
      price: 3276.45,
      change: 42.8,
      changePercent: 1.32,
    },
    {
      symbol: "WIPRO",
      name: "Wipro Ltd",
      price: 387.25,
      change: 3.15,
      changePercent: 0.82,
    },
    {
      symbol: "ICICIBANK",
      name: "ICICI Bank Ltd",
      price: 942.3,
      change: 12.45,
      changePercent: 1.34,
    },
    {
      symbol: "SBIN",
      name: "State Bank of India",
      price: 628.75,
      change: -2.35,
      changePercent: -0.37,
    },
  ];

  // Load initial stock data
  useEffect(() => {
    loadMockData();
  }, []);

  const loadMockData = () => {
    // Generate historical data for the selected stock
    const historicalData = generateDemoData(selectedStock);
    setHistoryData(historicalData);
    setStocks(mockStocksList);
    setIsLoading(false);
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);

    // Simulate API call with mock data
    setTimeout(() => {
      const results = mockStocksList.filter(
        stock =>
          stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stock.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setSearchResults(results.map(stock => ({
        symbol: stock.symbol,
        description: stock.name,
        type: 'Common Stock'
      })));

      setShowSearchResults(true);
      setIsLoading(false);
    }, 500);
  };

  const handleSelectStock = (symbol: string, name: string) => {
    setShowSearchResults(false);
    setSelectedStock(symbol);
    setIsLoading(true);

    // Find the stock in our mock data or create a new one
    const stockExists = mockStocksList.some(s => s.symbol === symbol);

    if (!stockExists) {
      // Create a new mock stock with random values
      const basePrice = 100 + Math.random() * 200;
      const change = (Math.random() * 10) - 5;
      const changePercent = (change / basePrice) * 100;

      const newStock = {
        symbol,
        name,
        price: parseFloat(basePrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
      };

      mockStocksList.push(newStock);
    }

    // Generate new historical data for the selected stock
    const historicalData = generateDemoData(symbol);
    setHistoryData(historicalData);
    setIsLoading(false);
  };

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[300px] w-full rounded-md" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-20 w-full rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("Search stocks...")}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>
        <Button variant="outline" onClick={handleSearch} disabled={!searchQuery.trim()}>
          {t("Search")}
        </Button>
        <Button variant="outline" onClick={() => {
          setSearchQuery("");
          setShowSearchResults(false);
        }}>
          {t("Reset")}
        </Button>
      </div>

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <div className="border rounded-md p-3 mb-4">
          <h3 className="text-sm font-medium mb-2">{t("Search Results")}</h3>
          <div className="max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <div
                key={result.symbol}
                className="p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => handleSelectStock(result.symbol, result.description)}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{result.symbol}</p>
                    <p className="text-xs text-muted-foreground">{result.description}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {result.type}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {historyData.length > 0 && (
        <div className="h-[200px] w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStocks.map((stock) => (
          <Card
            key={stock.symbol}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              setSelectedStock(stock.symbol);
              // Generate new historical data for the selected stock
              const historicalData = generateDemoData(stock.symbol);
              setHistoryData(historicalData);
            }}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{stock.symbol}</p>
                  <p className="text-sm text-muted-foreground">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {stock.symbol.includes('.BSE') ? '₹' : '$'}{stock.price.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end">
                    {stock.change > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={cn(
                        "text-xs",
                        stock.change > 0 ? "text-green-500" : "text-red-500"
                      )}
                    >
                      {stock.change > 0 ? "+" : ""}
                      {stock.change.toFixed(2)} (
                      {stock.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
