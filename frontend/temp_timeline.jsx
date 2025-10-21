// Temporary file with fixed timeline section
{
  /* Timeline Area */
}
<div className="w-full mb-4">
  {uploadedVideo ? (
    <div className="overflow-hidden w-full">
      <FrameStrip
        videoUrl={uploadedVideo.url}
        duration={duration || 30}
        currentTime={currentTime}
        onSeek={handleTimeChange}
        height={72}
        frames={Math.max(24, Math.min(80, Math.floor(duration || 60)))}
        isPlaying={isPlaying}
        autoScroll={false}
        stretchToFit
        isGenerating={isGeneratingVideo}
      />
      <BasicTimeline
        currentTime={currentTime}
        duration={duration || 30}
        isPlaying={isPlaying}
        onTimeChange={handleTimeChange}
        onPlay={() => {
          setIsPlaying(true);
          videoRef?.current?.play();
        }}
        onPause={() => {
          setIsPlaying(false);
          videoRef?.current?.pause();
        }}
      />
    </div>
  ) : (
    <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
      Upload a video to see the timeline.
    </div>
  )}
</div>;
