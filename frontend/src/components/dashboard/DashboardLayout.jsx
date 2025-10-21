import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Video,
  MessageSquare,
  Settings,
  Download,
  Share2,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Card } from "../ui";
import VideoUpload from "../video/VideoUpload";
import VideoPlayer from "../video/VideoPlayer";
import ChatInterface from "../chat/ChatInterface";
import socketService from "../../services/socketService";
import ApiService from "../../services/apiService";
import useVideoStore from "../../context/videoStore";

const DashboardLayout = () => {
  console.log("🏗️ DashboardLayout component rendering");

  const [selectedVideo, setSelectedVideo] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  // Get store actions and state - use selectors to prevent re-renders
  const currentVideo = useVideoStore((state) => state.currentVideo);
  const applyGlobalEffect = useVideoStore((state) => state.applyGlobalEffect);

  // Connect to socket on mount
  useEffect(() => {
    console.log("🔌 Setting up socket in DashboardLayout");
    socketService.connect();

    // Listen for AI responses
    socketService.onAIResponse((response) => {
      console.log("=== AI Response received in DashboardLayout ===");
      console.log("Full response:", response);
      console.log("Intent:", response.intent);

      const aiMessage = {
        type: "ai",
        content: response.message,
        timestamp: response.timestamp,
        actions: response.actions,
        tips: response.tips,
      };

      setChatMessages((prev) => [...prev, aiMessage]);
      setIsChatLoading(false);

      // Automatically apply brightness/contrast effects
      // Get fresh video from store
      const currentVideoFromStore = useVideoStore.getState().currentVideo;

      if (
        response.intent?.action === "brightness" &&
        currentVideoFromStore?.id
      ) {
        console.log(
          "✅ Brightness intent detected! Auto-applying effect in DashboardLayout...",
          response.intent.parameters
        );
        handleApplyEffect(response.intent.parameters);
      } else {
        console.log(
          "⚠️ Brightness intent not detected or no video loaded in DashboardLayout"
        );
        console.log("- Intent action:", response.intent?.action);
        console.log("- Video ID:", currentVideoFromStore?.id);
      }
    });

    // Listen for AI typing indicator
    socketService.onAITyping((data) => {
      setIsChatLoading(data.typing);
    });

    // Listen for chat errors
    socketService.onChatError((error) => {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            error.error || "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsChatLoading(false);
    });

    // Listen for message received confirmation
    socketService.onMessageReceived((data) => {
      console.log("Message received by server:", data);
    });

    return () => {
      socketService.disconnect();
    };
  }, []); // Only connect once, don't reconnect when video changes

  const handleApplyEffect = async (parameters) => {
    try {
      if (!currentVideo?.id) {
        throw new Error("No video selected");
      }

      console.log("Applying effect with parameters:", parameters);
      console.log("Current video ID:", currentVideo.id);

      await applyGlobalEffect({
        id: "brightness",
        name: "Brightness/Contrast",
        type: "color",
        parameters: parameters || {},
        timestamp: Date.now(),
      });

      // Add success message
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            "✅ Effect applied successfully! Your video has been updated.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Error applying effect:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: `❌ Sorry, I couldn't apply the effect: ${error.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    videoStore.setCurrentVideo(video);

    // Add welcome message when video is uploaded
    setChatMessages([
      {
        type: "ai",
        content: `Great! I've loaded your video "${video.name}". What would you like to do with it? Try saying "make it brighter" or "increase contrast".`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleSendMessage = async (message) => {
    // Add user message
    const userMessage = {
      type: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      // Send message via socket
      socketService.sendChatMessage(
        message,
        videoStore.currentVideo?.id,
        "default-conversation",
        videoStore.currentVideo?.filePath
      );
    } catch (error) {
      console.error("Error sending message:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content:
            "Sorry, I encountered an error sending your message. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsChatLoading(false);
    }
  };

  const sidebarTabs = [
    {
      id: "chat",
      label: "AI Assistant",
      icon: MessageSquare,
      component: (
        <ChatInterface
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
          className="h-full"
        />
      ),
    },
    {
      id: "history",
      label: "History",
      icon: History,
      component: (
        <Card className="h-full p-4">
          <h3 className="font-semibold mb-4">Edit History</h3>
          <p className="text-gray-500 text-sm">
            Your editing history will appear here.
          </p>
        </Card>
      ),
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      component: (
        <Card className="h-full p-4">
          <h3 className="font-semibold mb-4">Video Settings</h3>
          <p className="text-gray-500 text-sm">
            Video processing settings will appear here.
          </p>
        </Card>
      ),
    },
  ];

  const activeTabData = sidebarTabs.find((tab) => tab.id === activeTab);

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Video className="w-8 h-8 text-primary-600" />
                <h1 className="text-2xl font-bold text-gray-900">
                  VFXB Studio
                </h1>
              </div>
              {selectedVideo && (
                <div className="text-sm text-gray-600">
                  Editing:{" "}
                  <span className="font-medium">{selectedVideo.name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </header>

        {/* Video Area */}
        <div className="flex-1 p-6">
          {!selectedVideo ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-md w-full">
                <VideoUpload onVideoSelect={handleVideoSelect} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 bg-black rounded-lg overflow-hidden">
                <VideoPlayer
                  src={selectedVideo.url}
                  className="h-full"
                  onTimeUpdate={(time) => console.log("Time:", time)}
                  onDurationChange={(duration) =>
                    console.log("Duration:", duration)
                  }
                />
              </div>

              {/* Timeline/Controls Area */}
              <div className="mt-4 h-24 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between h-full">
                  <div className="text-sm text-gray-600">
                    Timeline controls will be implemented here
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline">
                      Undo
                    </Button>
                    <Button size="sm" variant="outline">
                      Redo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          width: sidebarCollapsed ? 60 : 400,
        }}
        transition={{ duration: 0.3 }}
        className="bg-white border-l border-gray-200 flex flex-col"
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex space-x-1">
                {sidebarTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                        activeTab === tab.id
                          ? "bg-primary-100 text-primary-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2"
            >
              {sidebarCollapsed ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar Content */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-hidden">
            {activeTabData?.component}
          </div>
        )}

        {sidebarCollapsed && (
          <div className="flex-1 flex flex-col items-center py-4 space-y-4">
            {sidebarTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSidebarCollapsed(false);
                  }}
                  className={`p-3 rounded-lg transition-colors duration-200 ${
                    activeTab === tab.id
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                  title={tab.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
