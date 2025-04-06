import '@testing-library/jest-dom';

// Mock console.log to avoid cluttering test output
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  originalConsoleLog(...args);
};

// Mock localStorage
class LocalStorageMock {
  private store: Record<string, string>;

  constructor() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

global.localStorage = new LocalStorageMock() as Storage;