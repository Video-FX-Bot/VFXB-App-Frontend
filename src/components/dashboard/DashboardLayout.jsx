import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Video,
  MessageSquare,
  Settings,
  Download,
  Share2,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button, Card } from '../ui';
import VideoUpload from '../video/VideoUpload';
import VideoPlayer from '../video/VideoPlayer';
import ChatInterface from '../chat/ChatInterface';

const DashboardLayout = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    // Add welcome message when video is uploaded
    setChatMessages([
      {
        type: 'ai',
        content: `Great! I've loaded your video "${video.name}". What would you like to do with it?`,
        timestamp: new Date().toISOString()
      }
    ]);
  };
  
  const handleSendMessage = async (message) => {
    // Add user message
    const userMessage = {
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);
    
    // Simulate AI response (replace with actual AI integration)
    setTimeout(() => {
      const aiResponse = {
        type: 'ai',
        content: `I understand you want to "${message}". I'm processing your request and will apply the changes to your video.`,
        timestamp: new Date().toISOString(),
        actions: [
          {
            label: 'Apply Changes',
            onClick: () => console.log('Applying changes...')
          },
          {
            label: 'Preview',
            onClick: () => console.log('Previewing changes...')
          }
        ]
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      setIsChatLoading(false);
    }, 1500);
  };
  
  const sidebarTabs = [
    {
      id: 'chat',
      label: 'AI Assistant',
      icon: MessageSquare,
      component: (
        <ChatInterface
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
          className="h-full"
        />
      )
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      component: (
        <Card className="h-full p-4">
          <h3 className="font-semibold mb-4">Edit History</h3>
          <p className="text-gray-500 text-sm">Your editing history will appear here.</p>
        </Card>
      )
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      component: (
        <Card className="h-full p-4">
          <h3 className="font-semibold mb-4">Video Settings</h3>
          <p className="text-gray-500 text-sm">Video processing settings will appear here.</p>
        </Card>
      )
    }
  ];
  
  const activeTabData = sidebarTabs.find(tab => tab.id === activeTab);
  
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
                <h1 className="text-2xl font-bold text-gray-900">VFXB Studio</h1>
              </div>
              {selectedVideo && (
                <div className="text-sm text-gray-600">
                  Editing: <span className="font-medium">{selectedVideo.name}</span>
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
                  onTimeUpdate={(time) => console.log('Time:', time)}
                  onDurationChange={(duration) => console.log('Duration:', duration)}
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
          width: sidebarCollapsed ? 60 : 400
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
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100'
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
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
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