import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Sparkles, 
  Mic, 
  MicOff, 
  Volume2, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  Zap,
  Wand2,
  MessageSquare,
  Settings
} from 'lucide-react';
import { Button, Input, Card } from '../ui';
import { useHotkeys } from 'react-hotkeys-hook';

const ChatInterface = ({
  messages = [],
  onSendMessage,
  isLoading = false,
  placeholder = "Ask me to edit your video...",
  className = '',
  enableVoiceInput = true,
  enableSuggestions = true,
  currentProject = null,
  onFeedback = null
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contextualSuggestions, setContextualSuggestions] = useState([]);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [speechSynthesis, setSpeechSynthesis] = useState(null);

  // NEW: listRef replaces messagesEndRef
  const listRef = useRef(null);

  // Initialize voice recognition
  useEffect(() => {
    if (enableVoiceInput && 'webkitSpeechRecognition' in window) {
      setVoiceSupported(true);
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInputValue(transcript);
      };
      
      recognitionRef.current = recognition;
    }
    
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      setSpeechSynthesis(window.speechSynthesis);
    }
  }, [enableVoiceInput]);
  
  // Keep view pinned to the newest (bottom) message
  useEffect(() => {
    if (listRef.current) {
      // with flex-col-reverse, bottom is scrollTop = 0
      listRef.current.scrollTop = 0;
    }
  }, [messages, isLoading]);
  
  // Generate contextual suggestions based on current project
  useEffect(() => {
    if (enableSuggestions && currentProject) {
      const suggestions = generateContextualSuggestions(currentProject);
      setContextualSuggestions(suggestions);
    }
  }, [currentProject, enableSuggestions]);
  
  // Generate contextual suggestions based on project state
  const generateContextualSuggestions = useCallback((project) => {
    const baseSuggestions = [
      "Remove background noise",
      "Add subtitles", 
      "Trim the video",
      "Enhance audio quality",
      "Add transitions",
      "Color correction"
    ];
    
    if (!project) return baseSuggestions;
    
    const contextual = [];
    if (project.hasAudio) {
      contextual.push("Normalize audio levels", "Add background music");
    }
    if (project.duration > 300) {
      contextual.push("Create highlights reel", "Split into chapters");
    }
    if (project.resolution && project.resolution.includes('4K')) {
      contextual.push("Optimize for web", "Create mobile version");
    }
    
    return [...contextual, ...baseSuggestions].slice(0, 6);
  }, []);
  
  const handleVoiceToggle = useCallback(() => {
    if (!voiceSupported || !recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  }, [isListening, voiceSupported]);
  
  const speakMessage = useCallback((text) => {
    if (speechSynthesis && text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }, [speechSynthesis]);
  
  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage?.(inputValue.trim());
      setInputValue('');
      setShowSuggestions(false);
    }
  };
  
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };
  
  const handleInputFocus = () => {
    if (enableSuggestions && contextualSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };
  
  // Keyboard shortcuts
  useHotkeys('ctrl+/', () => inputRef.current?.focus());
  useHotkeys('ctrl+shift+v', handleVoiceToggle, { enabled: voiceSupported });
  
  const suggestedActions = [
    "Remove background noise",
    "Add subtitles",
    "Trim the video",
    "Enhance audio quality",
    "Add transitions",
    "Color correction"
  ];
  
  return (
    <Card className={`flex flex-col h-full ${className}`} padding="none">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Video Editor</h3>
            <p className="text-sm text-gray-600">Tell me what you'd like to do with your video</p>
          </div>
        </div>
      </div>
      
      {/* Messages (bottom-anchored) */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col-reverse space-y-4 space-y-reverse"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Ready to edit your video!
            </h4>
            <p className="text-gray-600 mb-6">
              Try one of these suggestions or ask me anything:
            </p>
            
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
              {(enableSuggestions ? contextualSuggestions : suggestedActions).map((action, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleSuggestionClick(action);
                    setInputValue(action);
                    inputRef.current?.focus();
                  }}
                  className="p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-200"
                >
                  {action}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {[...messages].reverse().map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex items-start space-x-3 ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user'
                    ? 'bg-primary-600'
                    : 'bg-secondary-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                
                <div className={`flex-1 max-w-xs lg:max-w-md ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}>
                  <div className={`inline-block p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    {message.timestamp && (
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  
                  {/* AI Response Actions */}
                  {message.type === 'ai' && message.actions && message.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs font-medium text-gray-600 flex items-center">
                        <Zap className="w-3 h-3 mr-1" />
                        Quick Actions
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {message.actions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            variant={action.type === 'primary' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              if (action.command) {
                                setInputValue(action.command);
                                inputRef.current?.focus();
                              }
                              action.onClick?.();
                            }}
                            className="text-xs h-7 px-2"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* AI Response Tips */}
                  {message.type === 'ai' && message.tips && message.tips.length > 0 && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-xs font-medium text-blue-800 flex items-center mb-1">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Pro Tips
                      </div>
                      <ul className="text-xs text-blue-700 space-y-1">
                        {message.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="flex items-start">
                            <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start space-x-3"
              >
                <div className="w-8 h-8 bg-secondary-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t border-gray-200 relative">
        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && contextualSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
            >
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 mb-2 flex items-center">
                  <Wand2 className="w-3 h-3 mr-1" />
                  Smart Suggestions
                </div>
                <div className="space-y-1">
                  {contextualSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              placeholder={placeholder}
              disabled={isLoading}
              className="resize-none pr-10"
            />
            {enableSuggestions && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Voice Input Button */}
          {enableVoiceInput && voiceSupported && (
            <Button
              onClick={handleVoiceToggle}
              disabled={isLoading}
              variant={isListening ? "destructive" : "outline"}
              className="px-3"
              title={isListening ? "Stop listening" : "Start voice input (Ctrl+Shift+V)"}
            >
              {isListening ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          )}
          
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-3"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            Press Enter to send, Shift+Enter for new line
            {voiceSupported && " • Ctrl+Shift+V for voice"}
          </p>
          {isListening && (
            <div className="flex items-center text-xs text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-1" />
              Listening...
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ChatInterface;
