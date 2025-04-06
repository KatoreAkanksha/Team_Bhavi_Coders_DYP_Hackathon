import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeApi, cleanupApi } from './config/api';

// Initialize API configuration
const init = async () => {
  try {
    await initializeApi();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Failed to initialize API:', errorMessage);
    // Display error message (we'll use console.error for now)
    console.error('Failed to initialize Finnhub API. Some features may not work properly.');
  }
  
  // Render app after initialization attempt
  createRoot(document.getElementById("root")!).render(<App />);
};

// Cleanup on unmount
window.addEventListener('unload', cleanupApi);

// Start initialization
init();
