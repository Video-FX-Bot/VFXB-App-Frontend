import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Play,
  Send,
  Save,
  Download,
  Sparkles,
  Settings,
  RotateCcw,
  MessageSquareMore,
  Wand2,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import EnhancedVideoPlayer from "../components/video/EnhancedVideoPlayer";
import EnhancedTimeline from "../components/timeline/EnhancedTimeline";
import EffectsLibrary from "../components/effects/EffectsLibrary";

const WELCOME_MSG = {
  type: "ai",
  content:
    "Welcome to VFXB AI Editor! I'm here to help you create amazing videos. Upload a video or ask me anything about video editing.",
  timestamp: new Date().toISOString(),
};

const formatDuration = (seconds) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
};

export default function AIEditor() {
  const location = useLocation();

  // refs/state
  const videoElRef = useRef(null);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [timelineZoom, setTimelineZoom] = useState(1);

  // chat
  const [chatMessages, setChatMessages] = useState([WELCOME_MSG]);
  const [newMessage, setNewMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  // tracks
  const [tracks, setTracks] = useState([
    {
      id: "video-track-1",
      type: "video",
      name: "Main Video",
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
    {
      id: "audio-track-1",
      type: "audio",
      name: "Audio Track",
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: 1,
    },
  ]);

  // project
  const [projectName, setProjectName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // right panel (tabs & mobile drawers)
  const [activeTab, setActiveTab] = useState("assistant"); // 'assistant' | 'effects'
  const [mobileDrawer, setMobileDrawer] = useState(null); // null | 'assistant' | 'effects'

  // load video from router state
  useEffect(() => {
    const vid = location.state?.video;
    if (!vid) return;
    setUploadedVideo(vid);
    setChatMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: `Perfect! I've loaded "${vid.name}". What would you like to do first?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [location.state]);

  // rebuild tracks when video/duration changes
  useEffect(() => {
    if (!uploadedVideo) return;
    const clipDuration = duration || 30;
    setTracks((prev) => {
      const next = [...prev];
      next[0] = {
        ...next[0],
        clips: [
          {
            id: "clip-1",
            name: uploadedVideo.name || "Video Clip",
            type: "video",
            startTime: 0,
            duration: clipDuration,
            thumbnail: uploadedVideo.thumbnail,
          },
        ],
      };
      next[1] = {
        ...next[1],
        clips: [
          {
            id: "audio-clip-1",
            name: "Audio",
            type: "audio",
            startTime: 0,
            duration: clipDuration,
          },
        ],
      };
      return next;
    });
  }, [uploadedVideo, duration]);

  const selectedClips = useMemo(
    () => tracks.flatMap((t) => (t.clips || []).filter((c) => c.selected)),
    [tracks]
  );

  // chat handlers
  const handleSendMessage = useCallback(() => {
    const content = newMessage.trim();
    if (!content) return;
    setChatMessages((prev) => [
      ...prev,
      { type: "user", content, timestamp: new Date().toISOString() },
    ]);
    setNewMessage("");
    setIsChatLoading(true);
    setTimeout(() => {
      const responses = [
        `I can help you with "${content}". Let me analyze your video and suggest the best approach.`,
        `Great idea! For "${content}", I can apply automatic enhancements. Want me to proceed?`,
        `Working on "${content}". I’ve prepared a few options that fit your footage.`,
      ];
      setChatMessages((prev) => [
        ...prev,
        {
          type: "ai",
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toISOString(),
        },
      ]);
      setIsChatLoading(false);
    }, 1000);
  }, [newMessage]);

  // save
  const saveProject = useCallback(() => {
    if (!uploadedVideo) return alert("No video to save!");
    setIsSaving(true);
    const projectData = {
      id: Date.now(),
      name: projectName || `Project ${new Date().toLocaleDateString()}`,
      video: uploadedVideo,
      thumbnail: uploadedVideo.url,
      duration: formatDuration(duration),
      lastModified: "Just now",
      status: "editing",
      createdAt: new Date().toISOString(),
      chatHistory: chatMessages,
    };
    const existing = JSON.parse(localStorage.getItem("vfxb_projects") || "[]");
    const updated = [projectData, ...existing];
    localStorage.setItem("vfxb_projects", JSON.stringify(updated));
    localStorage.setItem(
      "vfxb_recent_projects",
      JSON.stringify(updated.slice(0, 3))
    );
    setTimeout(() => {
      setIsSaving(false);
      alert("Project saved successfully!");
    }, 600);
  }, [uploadedVideo, projectName, duration, chatMessages]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* GRID: Left content || Right sticky sidebar */}
      <div className="flex-1 p-4 lg:grid lg:grid-cols-12 lg:gap-4">
        {/* LEFT COLUMN (lg: span 8) */}
        <div className="min-w-0 lg:col-span-8 flex flex-col gap-4">
          {/* Preview — reasonable height */}
          <div className="bg-black relative p-4 rounded-lg shadow-elevation-2 w-full max-w-full min-w-0">
            <div className="w-full h-[420px] md:h-[500px] lg:h-[560px]">
              {uploadedVideo ? (
                <EnhancedVideoPlayer
                  ref={videoElRef}
                  src={uploadedVideo.url}
                  poster={uploadedVideo.thumbnail}
                  currentTime={currentTime}
                  duration={duration}
                  onTimeUpdate={setCurrentTime}
                  onDurationChange={setDuration}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full"
                  showWaveform
                  showThumbnailScrubbing
                  enableKeyboardShortcuts
                  showMinimap
                  enableGestures
                  enablePiP
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-elevation-2">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        No Video Loaded
                      </h3>
                      <p className="text-muted-foreground">
                        Upload a video from the Dashboard to start editing
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline — minimal w/ title + play + time (no clipping) */}
          <div className="bg-card border-2 border-border shadow-elevation-2 rounded-lg w-full max-w-full min-w-0">
            <EnhancedTimeline
              title="Timeline"
              currentTime={currentTime}
              duration={duration || 30}
              zoom={timelineZoom}
              isPlaying={isPlaying}
              onPlay={() => {
                setIsPlaying(true);
                const el = videoElRef.current;
                if (el) el.play();
              }}
              onPause={() => {
                setIsPlaying(false);
                const el = videoElRef.current;
                if (el) el.pause();
              }}
              onTimeChange={(time) => {
                setCurrentTime(time);
                const el = videoElRef.current;
                if (el) el.currentTime = time;
              }}
              className="h-47" // little taller so the white bar + ticks don’t get cropped
            />
          </div>

          {/* (Optional) Actions row under left column if you still want it visible here */}
          <div className="hidden lg:flex justify-between items-center bg-card border-2 border-border shadow-elevation-2 rounded-lg p-4">
            <div className="flex space-x-3">
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all border border-border flex items-center">
                <RotateCcw className="w-4 h-4 mr-2" />
                Undo
              </button>
              <button className="bg-card hover:bg-muted text-foreground px-4 py-2.5 rounded-lg text-sm font-medium transition-all border border-border flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </button>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
                className="bg-card border-2 border-border rounded-lg px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-elevation-1 w-48 min-w-0"
              />
              <button
                onClick={saveProject}
                disabled={isSaving || !uploadedVideo}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center ${
                  isSaving || !uploadedVideo
                    ? "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border border-green-500"
                }`}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Project"}
              </button>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all border border-blue-500 flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export Video
              </button>
            </div>
          </div>
        </div>

      {/* RIGHT SIDEBAR (lg: span 4) — NOT sticky, fixed height, internal scroll */}
<div className="lg:col-span-4 min-w-0 mt-4 lg:mt-0">
  <div className="bg-card border-2 border-border rounded-lg shadow-elevation-2 w-full max-w-full">
    {/* Tabs */}
    <div className="flex items-stretch border-b border-border">
      <button
        className={`flex-1 px-4 py-2 text-sm font-medium ${
          activeTab === "assistant" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setActiveTab("assistant")}
      >
        AI Assistant
      </button>
      <button
        className={`flex-1 px-4 py-2 text-sm font-medium ${
          activeTab === "effects" ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        onClick={() => setActiveTab("effects")}
      >
        Effects
      </button>
    </div>

    {/* Panel: fixed height, scrolls internally */}
    {/* Adjust the height to taste: h-[70vh], h-[600px], or calc */}
    <div className="p-4 h-[80vh] overflow-hidden">
      {/* Inner scroller so input can stay visible if you want a sticky input */}
      <div className="h-full overflow-y-auto">
        {activeTab === "assistant" ? (
          <AssistantPanel
            chatMessages={chatMessages}
            isChatLoading={isChatLoading}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
          />
        ) : (
          <EffectsPanel selectedClips={selectedClips} />
        )}
      </div>
    </div>
  </div>
</div>

      </div>

      {/* MOBILE: floating dock to open Assistant/Effects drawers */}
      <div className="lg:hidden fixed bottom-4 left-0 right-0 flex justify-center z-40">
        <div className="bg-card border border-border rounded-full shadow-elevation-2 px-3 py-2 flex gap-2">
          <button
            onClick={() => setMobileDrawer("assistant")}
            className="px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 flex items-center gap-1"
          >
            <MessageSquareMore className="w-4 h-4" /> Assistant
          </button>
          <button
            onClick={() => setMobileDrawer("effects")}
            className="px-3 py-1.5 rounded-full text-sm bg-muted hover:bg-muted/80 flex items-center gap-1"
          >
            <Wand2 className="w-4 h-4" /> Effects
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {mobileDrawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileDrawer(null)}
          />
          <div className="absolute left-0 right-0 bottom-0 bg-card border-t border-border rounded-t-2xl p-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">
                {mobileDrawer === "assistant" ? "AI Assistant" : "Effects"}
              </h3>
              <button
                onClick={() => setMobileDrawer(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            {mobileDrawer === "assistant" ? (
              <AssistantPanel
                chatMessages={chatMessages}
                isChatLoading={isChatLoading}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
              />
            ) : (
              <EffectsPanel selectedClips={selectedClips} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Subcomponents ------------------------------- */

function AssistantPanel({
  chatMessages,
  isChatLoading,
  newMessage,
  setNewMessage,
  handleSendMessage,
}) {
  const listRef = React.useRef(null);

  // Stick to bottom only if user is near the bottom
  const shouldStickToBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 40; // px
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    return dist < threshold;
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  React.useEffect(() => {
    // on mount
    scrollToBottom();
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatLoading]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="pb-3 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center">
          <Sparkles className="w-5 h-5 mr-2 text-primary" />
          AI Assistant
        </h3>
        <p className="text-xs text-muted-foreground">
          Use natural language to edit your video.
        </p>
      </div>

      {/* Messages LIST is the ONLY scroll area */}
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {chatMessages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-lg ${
                m.type === "user"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}

        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-lg border border-border">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT lives OUTSIDE the scroller → never overlaps */}
      <div className="border-t border-border pt-3 mt-3 bg-card">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Describe your edit…"
            className="flex-1 min-w-0 bg-card border-2 border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm disabled:bg-muted disabled:text-muted-foreground"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function EffectsPanel({ selectedClips }) {
  return (
    <div className="flex h-full flex-col">
      <div className="pb-3 border-b border-border mb-3">
        <h3 className="text-lg font-semibold flex items-center">
          <Wand2 className="w-5 h-5 mr-2 text-primary" />
          Effects Library
        </h3>
        <p className="text-xs text-muted-foreground">Pick and apply effects to selected clips.</p>
      </div>

      {/* <-- ONLY this area scrolls */}
      <div className="flex-1 overflow-y-auto pr-2">
        <EffectsLibrary
          onApplyEffect={(effect, params) => {
            console.log("Applying effect:", effect, "with params:", params);
          }}
          selectedClips={selectedClips}
        />
      </div>
    </div>
  );
}

