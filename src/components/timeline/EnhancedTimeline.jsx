// src/components/timeline/EnhancedTimeline.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Play, Pause } from "lucide-react";

/**
 * Minimal EnhancedTimeline
 *
 * Props:
 * - title?: string                 // default "Timeline"
 * - currentTime: number            // seconds
 * - duration: number               // seconds
 * - onTimeChange: (t:number) => void
 * - isPlaying?: boolean
 * - onPlay?: () => void
 * - onPause?: () => void
 * - zoom?: number                  // affects visual frame density; default 1
 * - className?: string
 */
export default function EnhancedTimeline({
  title = "Timeline",
  currentTime = 0,
  duration = 30,
  onTimeChange = () => {},
  isPlaying = false,
  onPlay = () => {},
  onPause = () => {},
  zoom = 1,
  className = "",
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* Header: Title + Play/Pause */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <button
          type="button"
          onClick={() => (isPlaying ? onPause() : onPlay())}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          <span className="hidden sm:inline">{isPlaying ? "Pause" : "Play"}</span>
        </button>
      </div>

      {/* Frames-only bar */}
      <FramesOnlyBar
        currentTime={currentTime}
        duration={duration}
        onTimeChange={onTimeChange}
        zoom={zoom}
      />

      {/* Time readout */}
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                             Frames Only Timeline                            */
/* -------------------------------------------------------------------------- */

function FramesOnlyBar({ currentTime, duration, onTimeChange, zoom }) {
  const barRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  // Frame density based on zoom
  const segmentCount = useMemo(() => {
    const z = Math.max(0.5, Math.min(4, zoom || 1));
    return Math.min(240, Math.max(20, Math.floor(60 * z))); // 20..240
  }, [zoom]);

  const segments = useMemo(() => new Array(segmentCount).fill(0), [segmentCount]);

  const clamp = (t) => Math.max(0, Math.min(duration || 0, t || 0));

  const pxToTime = useCallback(
    (clientX) => {
      const rect = barRef.current?.getBoundingClientRect();
      if (!rect || !duration) return currentTime;
      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      return ratio * duration;
    },
    [duration, currentTime]
  );

  const handlePointerDown = (e) => {
    setDragging(true);
    onTimeChange(clamp(pxToTime(e.clientX)));
  };

  const handlePointerMove = (e) => {
    if (!dragging) return;
    onTimeChange(clamp(pxToTime(e.clientX)));
  };

  const handlePointerUp = () => setDragging(false);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => handlePointerMove(e);
    const onUp = () => handlePointerUp();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.5 : -0.5;
    onTimeChange(clamp((currentTime || 0) + delta));
  };

  const progressPct = useMemo(() => {
    if (!duration) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  }, [currentTime, duration]);

  return (
    <div className="px-3 py-3">
      <div
        ref={barRef}
        onMouseDown={handlePointerDown}
        onWheel={onWheel}
        className="
          relative w-full h-20
          bg-white rounded-md
          cursor-pointer select-none
          border border-neutral-200
          shadow-sm
        "
        title="Timeline scrubber"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime || 0}
      >
        {/* Subtle 'frames' grid */}
        <div className="absolute inset-0 overflow-hidden rounded-md">
          <div className="flex h-full">
            {segments.map((_, i) => (
              <div
                key={i}
                className={`
                  h-full
                  ${i % 2 === 0 ? "bg-white" : "bg-neutral-50"}
                  border-r border-neutral-200/60
                  flex-1
                `}
              />
            ))}
          </div>
        </div>

        {/* Progress fill (very subtle) */}
        <div
          className="absolute inset-y-0 left-0 bg-neutral-100 pointer-events-none"
          style={{ width: `${progressPct}%` }}
        />

        {/* Scrubber line + handle */}
        <div
          className="absolute top-0 bottom-0"
          style={{ left: `${progressPct}%`, transform: "translateX(-50%)" }}
        >
          <div className="h-full w-[2px] bg-violet-500/80" />
          <div
            className="
              absolute -top-2.5 left-1/2 -translate-x-1/2
              h-4 w-4 rounded-full
              bg-violet-500
              shadow
            "
          />
        </div>

        {/* Ticks (every ~10% of duration). Comment out if you want a perfectly blank bar */}
        <Ticks duration={duration} />
      </div>
    </div>
  );
}

function Ticks({ duration }) {
  if (!duration || duration <= 0) return null;
  const count = 10;
  const ticks = [];
  for (let i = 0; i <= count; i++) ticks.push((i / count) * duration);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {ticks.map((t, idx) => {
        const pct = (t / duration) * 100;
        return (
          <div
            key={idx}
            className="absolute bottom-0 translate-x-[-50%]"
            style={{ left: `${pct}%` }}
          >
            <div
              className="w-px bg-neutral-300"
              style={{ height: idx % 2 === 0 ? "12px" : "8px" }}
            />
          </div>
        );
      })}
    </div>
  );
}

function formatTime(s) {
  const sec = Math.floor(s || 0);
  const m = Math.floor(sec / 60);
  const r = String(sec % 60).padStart(2, "0");
  return `${m}:${r}`;
}
