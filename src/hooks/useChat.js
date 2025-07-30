import { useState, useEffect, useCallback, useRef } from 'react';
import useChatStore from '../context/chatStore';
import aiService from '../services/aiService';
import { generateId, debounce } from '../utils';
import { CHAT_CONFIG, ANALYTICS_EVENTS } from '../constants';

// Custom hook for AI chat functionality
export const useChat = (videoContext = null) => {
  const {
    messages,
    isTyping,
    currentInput,
    context,
    suggestions,
    analytics,
    sessionId,
    addMessage,
    setTyping,
    setCurrentInput,
    setContext,
    setSuggestions,
    updateAnalytics,
    clearMessages,
    removeMessage,
  } = useChatStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);

  // Update AI context when video context changes
  useEffect(() => {
    if (videoContext) {
      setContext({
        ...context,
        videoId: videoContext.id,
        videoMetadata: videoContext.metadata,
        editHistory: videoContext.editHistory || [],
      });
      
      // Update AI service context
      aiService.setContext({
        videoId: videoContext.id,
        videoMetadata: videoContext.metadata,
        editHistory: videoContext.editHistory || [],
      });
    }
  }, [videoContext, setContext]);

  // Generate contextual suggestions
  const generateSuggestions = useCallback(() => {
    if (videoContext) {
      const contextualSuggestions = aiService.getContextualSuggestions({
        videoLoaded: !!videoContext,
        hasAudio: videoContext.metadata?.audio?.channels > 0,
        videoDuration: videoContext.metadata?.duration || 0,
      });
      setSuggestions(contextualSuggestions);
    } else {
      setSuggestions(CHAT_CONFIG.SUGGESTED_ACTIONS);
    }
  }, [videoContext, setSuggestions]);

  // Send message to AI
  const sendMessage = useCallback(async (content, type = 'user') => {
    if (!content.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);

      // Add user message
      const userMessage = {
        id: generateId(),
        type,
        content: content.trim(),
        timestamp: new Date(),
        actions: [],
        metadata: {},
      };
      
      addMessage(userMessage);
      setCurrentInput('');
      
      // Show typing indicator
      setTyping(true);
      
      // Process message with AI
      const response = await aiService.processMessage(content, context);
      
      if (response.success) {
        // Add AI response
        const aiMessage = {
          id: generateId(),
          type: 'ai',
          content: response.response.content,
          timestamp: new Date(),
          actions: response.response.actions || [],
          metadata: {
            intent: response.intent,
            parameters: response.parameters,
            confidence: response.confidence,
          },
        };
        
        addMessage(aiMessage);
        
        // Update analytics
        updateAnalytics({
          messagesCount: messages.length + 2,
          lastInteraction: new Date(),
          intents: {
            ...analytics.intents,
            [response.intent]: (analytics.intents[response.intent] || 0) + 1,
          },
        });
        
        // Generate new suggestions
        generateSuggestions();
        
      } else {
        // Add error message
        const errorMessage = {
          id: generateId(),
          type: 'error',
          content: response.error || 'Sorry, I encountered an error processing your request.',
          timestamp: new Date(),
          actions: [],
          metadata: { error: response.error },
        };
        
        addMessage(errorMessage);
        setError(response.error);
      }
      
    } catch (err) {
      console.error('Chat error:', err);
      
      const errorMessage = {
        id: generateId(),
        type: 'error',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        timestamp: new Date(),
        actions: [],
        metadata: { error: err.message },
      };
      
      addMessage(errorMessage);
      setError(err.message);
      setIsConnected(false);
      
    } finally {
      setLoading(false);
      setTyping(false);
    }
  }, [loading, addMessage, setCurrentInput, setTyping, context, messages.length, analytics, updateAnalytics, generateSuggestions]);

  // Send suggested action
  const sendSuggestion = useCallback((suggestion) => {
    sendMessage(suggestion, 'user');
  }, [sendMessage]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback((value) => {
    setCurrentInput(value);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      // Could implement typing indicator to server here
    }, CHAT_CONFIG.TYPING_INDICATOR_DELAY);
  }, [setCurrentInput]);

  // Debounced input handler for performance
  const debouncedInputChange = useCallback(
    debounce(handleInputChange, 100),
    [handleInputChange]
  );

  // Handle key press in input
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentInput.trim()) {
        sendMessage(currentInput);
      }
    }
  }, [currentInput, sendMessage]);

  // Execute action from AI response
  const executeAction = useCallback(async (action) => {
    try {
      setLoading(true);
      
      if (action.onClick && typeof action.onClick === 'function') {
        await action.onClick();
        
        // Add system message about action execution
        const systemMessage = {
          id: generateId(),
          type: 'system',
          content: `Executed: ${action.label}`,
          timestamp: new Date(),
          actions: [],
          metadata: { action: action.type },
        };
        
        addMessage(systemMessage);
      }
      
    } catch (err) {
      console.error('Action execution error:', err);
      setError(`Failed to execute action: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [addMessage]);

  // Retry last message
  const retryLastMessage = useCallback(() => {
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.type === 'user');
    
    if (lastUserMessage) {
      sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  // Clear chat history
  const clearChat = useCallback(() => {
    clearMessages();
    setError(null);
    generateSuggestions();
  }, [clearMessages, generateSuggestions]);

  // Focus input
  const focusInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Generate initial suggestions
  useEffect(() => {
    generateSuggestions();
  }, [generateSuggestions]);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Connection status check
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(navigator.onLine);
    };
    
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', checkConnection);
    
    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', checkConnection);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K to focus input
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        focusInput();
      }
      
      // Escape to clear input
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setCurrentInput('');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusInput, setCurrentInput]);

  // Get message statistics
  const getMessageStats = useCallback(() => {
    const stats = {
      total: messages.length,
      user: messages.filter(m => m.type === 'user').length,
      ai: messages.filter(m => m.type === 'ai').length,
      system: messages.filter(m => m.type === 'system').length,
      error: messages.filter(m => m.type === 'error').length,
    };
    
    return stats;
  }, [messages]);

  // Check if input is valid
  const isInputValid = currentInput.trim().length > 0 && 
                      currentInput.length <= CHAT_CONFIG.MAX_MESSAGE_LENGTH;

  // Check if at message limit
  const isAtMessageLimit = messages.length >= CHAT_CONFIG.MAX_HISTORY_LENGTH;

  return {
    // State
    messages,
    isTyping,
    currentInput,
    context,
    suggestions,
    analytics,
    sessionId,
    loading,
    error,
    isConnected,
    
    // Validation
    isInputValid,
    isAtMessageLimit,
    
    // Actions
    sendMessage,
    sendSuggestion,
    handleInputChange: debouncedInputChange,
    handleKeyPress,
    executeAction,
    retryLastMessage,
    clearChat,
    focusInput,
    
    // Utilities
    getMessageStats,
    scrollToBottom,
    clearError: () => setError(null),
    
    // Refs
    messagesEndRef,
    inputRef,
  };
};

export default useChat;