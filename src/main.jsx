import React from "react";
import ReactDOM from "react-dom/client";
import { enableMapSet } from "immer";
import App from "./App";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { errorService } from "./services/errorService";
import { csrfService } from "./services/csrfService";
import { tokenService } from "./services/tokenService";

// Enable Immer MapSet plugin
enableMapSet();

// Initialize security services
const initializeApp = async () => {
  try {
    // Initialize error handling
    errorService.initializeGlobalErrorHandling();
    
    // Initialize token service
    await tokenService.initialize();
    
    // Initialize CSRF protection
    await csrfService.initializeCSRF();
    
    console.log('✅ Security services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize security services:', error);
    errorService.logError(error, 'App Initialization');
  }
};

// Initialize app
initializeApp();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorService.logError(event.reason, 'Unhandled Promise Rejection');
  console.error('Unhandled promise rejection:', event.reason);
});

// Handle global errors
window.addEventListener('error', (event) => {
  errorService.logError(event.error, 'Global Error');
  console.error('Global error:', event.error);
});

// Performance monitoring
if ('performance' in window && 'getEntriesByType' in performance) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      if (loadTime > 3000) {
        console.warn(`⚠️ Slow page load detected: ${loadTime}ms`);
      }
      
      console.log(`📊 Page load time: ${loadTime}ms`);
    }, 0);
  });
}
