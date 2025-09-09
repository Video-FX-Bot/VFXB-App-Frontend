import React, { useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Pages/Layout";

// Enhanced lazy loading with performance optimizations
import { createLazyRoute } from "./utils/performanceOptimizer.jsx";
import { ProjectCardSkeleton } from "./components/ui/Skeleton";

// Create optimized lazy components with proper loading states
const Home = createLazyRoute(() => import("./Pages/Home"));
const Editor = createLazyRoute(() => import("./Pages/Editor"));
const Login = createLazyRoute(() => import("./Pages/Login"));
const Signup = createLazyRoute(() => import("./Pages/Signup"));
const Profile = createLazyRoute(() => import("./Pages/Profile"));
const Dashboard = createLazyRoute(() => import("./Pages/Dashboard"), 
  <div className="p-6 space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => <ProjectCardSkeleton key={i} />)}
    </div>
  </div>
);
const Projects = createLazyRoute(() => import("./Pages/Projects"),
  <div className="p-6 space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => <ProjectCardSkeleton key={i} />)}
    </div>
  </div>
);
const Templates = createLazyRoute(() => import("./Pages/Templates"));
const Settings = createLazyRoute(() => import("./Pages/Settings"));
const AIEditor = createLazyRoute(() => import("./Pages/AIEditor"),
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-white text-lg">Loading AI Editor...</p>
    </div>
  </div>
);
import { AuthProvider } from "./AuthContext";
import { useUI } from "./hooks";
import { Modal, Loading } from "./components/ui";
import { motion, AnimatePresence } from "framer-motion";
// Authentication routes are now public - auth will be implemented later
import EnhancedErrorBoundary from "./components/EnhancedErrorBoundary";
import { AsyncErrorBoundary, FeatureErrorBoundary, NetworkErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";
import { globalErrorHandler } from "./utils/errorHandler";

function AppContent() {
  const {
    theme,
    modalOpen,
    modalProps,
    loading,
    loadingMessage,
    notifications,
    removeNotification,
  } = useUI();

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <EnhancedErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <Layout>
            <Routes>
            {/* Dashboard Routes */}
            <Route 
              path="/" 
              element={
                <AsyncErrorBoundary>
                  <FeatureErrorBoundary feature="Dashboard">
                    <Dashboard />
                  </FeatureErrorBoundary>
                </AsyncErrorBoundary>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <AsyncErrorBoundary>
                  <FeatureErrorBoundary feature="Dashboard">
                    <Dashboard />
                  </FeatureErrorBoundary>
                </AsyncErrorBoundary>
              } 
            />
            <Route 
              path="/projects" 
              element={
                <NetworkErrorBoundary>
                  <AsyncErrorBoundary>
                    <FeatureErrorBoundary feature="Projects">
                      <Projects />
                    </FeatureErrorBoundary>
                  </AsyncErrorBoundary>
                </NetworkErrorBoundary>
              } 
            />
            <Route 
              path="/templates" 
              element={
                <AsyncErrorBoundary>
                  <FeatureErrorBoundary feature="Templates">
                    <Templates />
                  </FeatureErrorBoundary>
                </AsyncErrorBoundary>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <FeatureErrorBoundary feature="Settings">
                  <Settings />
                </FeatureErrorBoundary>
              } 
            />
            <Route 
              path="/ai-editor" 
              element={
                <NetworkErrorBoundary>
                  <AsyncErrorBoundary>
                    <FeatureErrorBoundary feature="AI Editor">
                      <AIEditor />
                    </FeatureErrorBoundary>
                  </AsyncErrorBoundary>
                </NetworkErrorBoundary>
              } 
            />
            <Route 
              path="/ai-editor/:projectId" 
              element={
                <NetworkErrorBoundary>
                  <AsyncErrorBoundary>
                    <FeatureErrorBoundary feature="AI Editor">
                      <AIEditor />
                    </FeatureErrorBoundary>
                  </AsyncErrorBoundary>
                </NetworkErrorBoundary>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <FeatureErrorBoundary feature="Profile">
                  <Profile />
                </FeatureErrorBoundary>
              } 
            />
            
            {/* Authentication Routes */}
            <Route 
              path="/login" 
              element={
                <NetworkErrorBoundary>
                  <FeatureErrorBoundary feature="Login">
                    <Login />
                  </FeatureErrorBoundary>
                </NetworkErrorBoundary>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <NetworkErrorBoundary>
                  <FeatureErrorBoundary feature="Signup">
                    <Signup />
                  </FeatureErrorBoundary>
                </NetworkErrorBoundary>
              } 
            />
            
            {/* 404 Route */}
            <Route 
              path="*" 
              element={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Page not found</p>
                    <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
                      Go Home
                    </a>
                  </div>
                </div>
              } 
            />
          </Routes>
        </Layout>
      </EnhancedErrorBoundary>

      {/* Global Modal */}
      <AnimatePresence>
        {modalOpen && (
          <Modal
            isOpen={modalOpen}
            onClose={() => {}}
            {...modalProps}
          />
        )}
      </AnimatePresence>

      {/* Global Loading Overlay */}
      <AnimatePresence>
        {loading.global && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl"
            >
              <Loading size="lg" text={loadingMessage} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.3 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.5 }}
              className={`
                max-w-sm p-4 rounded-lg shadow-lg cursor-pointer
                ${notification.type === 'success' ? 'bg-green-500 text-white' :
                  notification.type === 'error' ? 'bg-red-500 text-white' :
                  notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                  'bg-blue-500 text-white'
                }
              `}
              onClick={() => removeNotification(notification.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {notification.title && (
                    <h4 className="font-semibold text-sm mb-1">
                      {notification.title}
                    </h4>
                  )}
                  <p className="text-sm opacity-90">
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  className="ml-2 text-white/70 hover:text-white transition-colors"
                >
                  ×
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  // Set up global toast provider reference
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.toastProvider = null; // Will be set by ToastProvider
    }
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider position="top-right" maxToasts={5}>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}