import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useChatStore = create(
  devtools(
    (set, get) => ({
      // Chat state
      messages: [],
      isLoading: false,
      currentConversationId: null,
      
      // AI state
      aiContext: {
        currentVideo: null,
        lastAction: null,
        userPreferences: {},
        sessionHistory: []
      },
      
      // Conversation management
      conversations: [],
      
      // Suggestions
      suggestions: [
        "Remove background noise",
        "Add subtitles",
        "Trim the video",
        "Enhance audio quality",
        "Add transitions",
        "Color correction",
        "Adjust brightness",
        "Add music",
        "Create intro",
        "Export to MP4"
      ],
      
      // Actions
      addMessage: (message) => {
        const newMessage = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...message
        };
        
        set((state) => ({
          messages: [...state.messages, newMessage]
        }));
        
        return newMessage;
      },
      
      addUserMessage: (content) => {
        const message = get().addMessage({
          type: 'user',
          content,
          status: 'sent'
        });
        
        // Update AI context with user input
        set((state) => ({
          aiContext: {
            ...state.aiContext,
            sessionHistory: [...state.aiContext.sessionHistory, {
              type: 'user_input',
              content,
              timestamp: new Date().toISOString()
            }]
          }
        }));
        
        return message;
      },
      
      addAIMessage: (content, actions = null) => {
        const message = get().addMessage({
          type: 'ai',
          content,
          actions,
          status: 'received'
        });
        
        // Update AI context with AI response
        set((state) => ({
          aiContext: {
            ...state.aiContext,
            lastAction: content,
            sessionHistory: [...state.aiContext.sessionHistory, {
              type: 'ai_response',
              content,
              timestamp: new Date().toISOString()
            }]
          }
        }));
        
        return message;
      },
      
      updateMessage: (messageId, updates) => {
        set((state) => ({
          messages: state.messages.map(msg => 
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }));
      },
      
      deleteMessage: (messageId) => {
        set((state) => ({
          messages: state.messages.filter(msg => msg.id !== messageId)
        }));
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      // Conversation management
      createConversation: (title = 'New Conversation') => {
        const conversation = {
          id: Date.now(),
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messages: []
        };
        
        set((state) => ({
          conversations: [...state.conversations, conversation],
          currentConversationId: conversation.id
        }));
        
        return conversation;
      },
      
      loadConversation: (conversationId) => {
        const state = get();
        const conversation = state.conversations.find(c => c.id === conversationId);
        
        if (conversation) {
          set({
            currentConversationId: conversationId,
            messages: conversation.messages || []
          });
        }
      },
      
      saveCurrentConversation: () => {
        const state = get();
        if (state.currentConversationId) {
          set((prevState) => ({
            conversations: prevState.conversations.map(conv => 
              conv.id === state.currentConversationId
                ? {
                    ...conv,
                    messages: state.messages,
                    updatedAt: new Date().toISOString()
                  }
                : conv
            )
          }));
        }
      },
      
      deleteConversation: (conversationId) => {
        set((state) => {
          const newConversations = state.conversations.filter(c => c.id !== conversationId);
          const newCurrentId = state.currentConversationId === conversationId 
            ? (newConversations.length > 0 ? newConversations[0].id : null)
            : state.currentConversationId;
            
          return {
            conversations: newConversations,
            currentConversationId: newCurrentId,
            messages: newCurrentId ? 
              newConversations.find(c => c.id === newCurrentId)?.messages || [] : []
          };
        });
      },
      
      // AI Context management
      updateAIContext: (updates) => {
        set((state) => ({
          aiContext: {
            ...state.aiContext,
            ...updates
          }
        }));
      },
      
      setCurrentVideo: (video) => {
        set((state) => ({
          aiContext: {
            ...state.aiContext,
            currentVideo: video
          }
        }));
        
        // Add system message when video is loaded
        if (video) {
          get().addAIMessage(
            `I've loaded your video "${video.name}". I can help you edit it! What would you like to do?`,
            [
              {
                label: 'Enhance Audio',
                onClick: () => get().addUserMessage('Enhance the audio quality')
              },
              {
                label: 'Add Subtitles',
                onClick: () => get().addUserMessage('Add subtitles to the video')
              },
              {
                label: 'Trim Video',
                onClick: () => get().addUserMessage('Help me trim the video')
              }
            ]
          );
        }
      },
      
      addUserPreference: (key, value) => {
        set((state) => ({
          aiContext: {
            ...state.aiContext,
            userPreferences: {
              ...state.aiContext.userPreferences,
              [key]: value
            }
          }
        }));
      },
      
      // Suggestions management
      addSuggestion: (suggestion) => {
        set((state) => ({
          suggestions: [...state.suggestions, suggestion]
        }));
      },
      
      removeSuggestion: (suggestion) => {
        set((state) => ({
          suggestions: state.suggestions.filter(s => s !== suggestion)
        }));
      },
      
      getContextualSuggestions: () => {
        const state = get();
        const { aiContext } = state;
        
        // Return different suggestions based on context
        if (!aiContext.currentVideo) {
          return ['Upload a video to get started'];
        }
        
        // Filter suggestions based on recent actions
        const recentActions = aiContext.sessionHistory
          .filter(h => h.type === 'user_input')
          .slice(-3)
          .map(h => h.content.toLowerCase());
          
        return state.suggestions.filter(suggestion => 
          !recentActions.some(action => 
            action.includes(suggestion.toLowerCase().split(' ')[0])
          )
        ).slice(0, 6);
      },
      
      // Utility functions
      clearMessages: () => set({ messages: [] }),
      
      clearConversations: () => {
        set({
          conversations: [],
          currentConversationId: null,
          messages: []
        });
      },
      
      reset: () => {
        set({
          messages: [],
          isLoading: false,
          currentConversationId: null,
          aiContext: {
            currentVideo: null,
            lastAction: null,
            userPreferences: {},
            sessionHistory: []
          },
          conversations: []
        });
      },
      
      // Analytics and insights
      getSessionStats: () => {
        const state = get();
        const userMessages = state.messages.filter(m => m.type === 'user');
        const aiMessages = state.messages.filter(m => m.type === 'ai');
        
        return {
          totalMessages: state.messages.length,
          userMessages: userMessages.length,
          aiMessages: aiMessages.length,
          sessionDuration: state.messages.length > 0 ? 
            new Date(state.messages[state.messages.length - 1].timestamp) - 
            new Date(state.messages[0].timestamp) : 0,
          mostUsedActions: state.aiContext.sessionHistory
            .filter(h => h.type === 'user_input')
            .reduce((acc, h) => {
              const action = h.content.toLowerCase();
              acc[action] = (acc[action] || 0) + 1;
              return acc;
            }, {})
        };
      }
    }),
    {
      name: 'chat-store'
    }
  )
);

export default useChatStore;