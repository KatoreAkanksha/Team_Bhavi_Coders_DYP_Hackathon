import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeApi, cleanupApi } from "./config/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Initialize API configuration
const init = async () => {
  // Always render the app, regardless of API initialization status
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }

  try {
    // Initialize API before rendering to ensure config is loaded
    await initializeApi();
    console.info("API initialization completed successfully");
  } catch (error) {
    // Log the error but continue rendering the app with demo/fallback data
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to initialize API:", errorMessage);
    console.info("Application will continue with limited functionality");
  }

  // Render app after initialization attempt (success or failure)
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};

// Cleanup on unmount
window.addEventListener("beforeunload", () => {
  cleanupApi();
  queryClient.clear();
});

// Start initialization
init();
