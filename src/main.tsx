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
  try {
    await initializeApi();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Failed to initialize API:", errorMessage);
    // We can show a toast notification here if needed
  }

  // Render app after initialization attempt
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }

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
