import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Pages/Layout";
import Home from "./Pages/Home";
import Editor from "./Pages/Editor";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Profile from "./Pages/Profile";
import Dashboard from "./Pages/Dashboard";
import Projects from "./Pages/Projects";
import Templates from "./Pages/Templates";
import Settings from "./Pages/Settings";
import AIEditor from "./Pages/AIEditor";
import { AuthProvider } from "./AuthContext";
import { useUI } from "./hooks";
import { Modal, Loading } from "./components/ui";
import { motion, AnimatePresence } from "framer-motion";

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
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ai-editor" element={<AIEditor />} />
          <Route path="/Editor" element={<Editor />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Layout>

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
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}