import { useEffect } from 'react';
import { initializeMockExpensesInLocalStorage, addSmartExpenseMockData } from '@/utils/initMockData';

/**
 * Component to initialize mock data in localStorage
 * This is invisible and just runs the initialization on mount
 */
export const InitMockData = () => {
  useEffect(() => {
    // Check if we've already initialized data
    const hasInitialized = localStorage.getItem('mockDataInitialized');
    
    if (!hasInitialized) {
      console.log('Initializing mock data in localStorage...');
      
      // Initialize regular expenses
      initializeMockExpensesInLocalStorage();
      
      // Add smart OCR expenses
      addSmartExpenseMockData();
      
      // Mark as initialized so we don't re-initialize on every reload
      localStorage.setItem('mockDataInitialized', 'true');
      
      console.log('Mock data initialization complete');
    } else {
      console.log('Mock data already initialized in localStorage');
    }
  }, []);
  
  // This component doesn't render anything
  return null;
};

export default InitMockData; 