// Import from config using relative path
import { getFinnhubApiKey, FINNHUB_CONFIG } from '../config/api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_CONCURRENT_REQUESTS = 30;

class RequestQueue {
  private queue: (() => Promise<any>)[] = [];
  private running = 0;

  async add<T>(request: () => Promise<T>): Promise<T> {
    if (this.running >= MAX_CONCURRENT_REQUESTS) {
      return new Promise((resolve, reject) => {
        this.queue.push(async () => {
          try {
            resolve(await request());
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    return this.executeRequest(request);
  }

  private async executeRequest<T>(request: () => Promise<T>): Promise<T> {
    this.running++;
    try {
      return await request();
    } finally {
      this.running--;
      this.processQueue();
    }
  }

  private processQueue() {
    if (this.queue.length > 0 && this.running < MAX_CONCURRENT_REQUESTS) {
      const next = this.queue.shift();
      if (next) this.executeRequest(next);
    }
  }
}

const requestQueue = new RequestQueue();

// Custom implementation of Finnhub client
class FinnhubClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = FINNHUB_CONFIG.baseUrl;
    this.apiKey = getFinnhubApiKey();
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add API key
    url.searchParams.append('token', this.apiKey);

    // Add other parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return requestQueue.add(async () => {
      let lastError;

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const response = await fetch(url.toString());

          if (response.status === 403) {
            throw new Error('Invalid or expired API key');
          }

          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
            continue;
          }

          if (!response.ok) {
            throw new Error(`Finnhub API error: ${response.status}`);
          }

          return await response.json();
        } catch (error) {
          lastError = error;
          // Don't retry if it's an API key error
          if (error instanceof Error && error.message === 'Invalid or expired API key') {
            throw error;
          }

          // For other errors, retry after a delay
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
          continue;
        }
      }

      throw lastError;
    });
  }

  // Stock APIs
  async quote(symbol: string): Promise<any> {
    return this.makeRequest('/quote', { symbol });
  }

  async marketNews(category: string = 'general'): Promise<any> {
    return this.makeRequest('/news', { category });
  }

  async companyProfile2(params: { symbol: string }): Promise<any> {
    return this.makeRequest('/stock/profile2', params);
  }

  async companyNews(symbol: string, from: string, to: string): Promise<any> {
    return this.makeRequest('/company-news', { symbol, from, to });
  }

  async companyBasicFinancials(symbol: string, metric: string = 'all'): Promise<any> {
    return this.makeRequest('/stock/metric', { symbol, metric });
  }

  async symbolSearch(query: string): Promise<any> {
    return this.makeRequest('/search', { q: query });
  }

  async stockCandles(symbol: string, resolution: string, from: number | string, to: number | string): Promise<any> {
    return this.makeRequest('/stock/candle', {
      symbol,
      resolution,
      from: from.toString(),
      to: to.toString()
    });
  }

  async newsSentiment(symbol: string): Promise<any> {
    return this.makeRequest('/news-sentiment', { symbol });
  }
}

export const finnhubClient = new FinnhubClient();

// WebSocket with reconnection logic
class FinnhubWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private messageHandlers: Set<(data: any) => void> = new Set();

  connect() {
    const apiKey = getFinnhubApiKey();
    if (!apiKey) return;

    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    this.attachListeners();
  }

  private attachListeners() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => this.handleDisconnect();
    this.ws.onerror = (error) => {
      console.error('Finnhub WebSocket error:', error);
      this.handleDisconnect();
    };
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    symbols.forEach(symbol => {
      this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }));
    });
  }

  unsubscribe(symbols: string[]) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    symbols.forEach(symbol => {
      this.ws?.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    });
  }

  addMessageHandler(handler: (data: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
}

export const finnhubWS = new FinnhubWebSocket();