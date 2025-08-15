import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect(token = null) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    const options = {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    };

    // Add authentication if token is provided
    // For now, we'll use a demo token or skip auth for development
    const authToken = token || localStorage.getItem('authToken') || 'demo-token';
    if (authToken && authToken !== 'demo-token') {
      options.auth = { token: authToken };
    }

    this.socket = io(serverUrl, options);

    // Connection event handlers
    this.socket.on('connect', () => {
      console.log('✅ Connected to server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // Send chat message to AI
  sendChatMessage(message, videoId = null, conversationId = null, videoPath = null) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('chat_message', {
      message,
      videoId,
      conversationId,
      videoPath
    });
  }

  // Notify server about video upload
  notifyVideoUpload(videoId, videoPath, fileName) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('video_uploaded', {
      videoId,
      videoPath,
      fileName
    });
  }

  // Execute video operation
  executeVideoOperation(operation, parameters, videoId, videoPath) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('execute_video_operation', {
      operation,
      parameters,
      videoId,
      videoPath
    });
  }

  // Get conversation history
  getConversationHistory(conversationId, limit = 50) {
    if (!this.socket || !this.isConnected) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('get_conversation_history', {
      conversationId,
      limit
    });
  }

  // Event listeners
  on(event, callback) {
    if (!this.socket) {
      throw new Error('Socket not initialized');
    }

    this.socket.on(event, callback);
    
    // Store listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback = null) {
    if (!this.socket) {
      return;
    }

    if (callback) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        const index = eventListeners.indexOf(callback);
        if (index > -1) {
          eventListeners.splice(index, 1);
        }
      }
    } else {
      this.socket.off(event);
      this.listeners.delete(event);
    }
  }

  // Convenience methods for common events
  onMessageReceived(callback) {
    this.on('message_received', callback);
  }

  onAIResponse(callback) {
    this.on('ai_response', callback);
  }

  onAITyping(callback) {
    this.on('ai_typing', callback);
  }

  onVideoAnalysisComplete(callback) {
    this.on('video_analysis_complete', callback);
  }

  onVideoOperationComplete(callback) {
    this.on('video_operation_complete', callback);
  }

  onVideoOperationStarted(callback) {
    this.on('video_operation_started', callback);
  }

  onVideoOperationError(callback) {
    this.on('video_operation_error', callback);
  }

  onChatError(callback) {
    this.on('chat_error', callback);
  }

  onConversationHistory(callback) {
    this.on('conversation_history', callback);
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
export { SocketService };