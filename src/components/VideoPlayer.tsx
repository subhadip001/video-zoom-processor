// src/components/VideoPlayer.tsx
import React, { useRef, useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
import { CustomMouseEvent, VideoState } from "../types/types";
import { calculateZoomState } from "../utils/zoomEffects";

interface VideoPlayerProps {
  videoUrl: string;
  mouseEvents: CustomMouseEvent[];
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  mouseEvents,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReactPlayer>(null);
  const [videoState, setVideoState] = useState<VideoState>({
    playing: true,
    currentTime: 0,
    duration: 0,
    zoom: {
      active: false,
      x: 0,
      y: 0,
      scale: 1,
    },
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const { width, height } = containerRef.current.getBoundingClientRect();
    const zoom = calculateZoomState(
      videoState.currentTime,
      mouseEvents,
      width,
      height
    );

    setVideoState((prev) => ({ ...prev, zoom }));
  }, [videoState.currentTime, mouseEvents]);

  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    setVideoState((prev) => ({ ...prev, currentTime: playedSeconds }));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (playerRef.current) {
      playerRef.current.seekTo(value / 100);
    }
  };

  const togglePlayPause = () => {
    setVideoState((prev) => ({ ...prev, playing: !prev.playing }));
  };

  return (
    <div className="video-container" ref={containerRef}>
      <div className="video-wrapper">
        <div className="video-content-wrapper">
          <motion.div
            className="video-content"
            style={{
              transformOrigin: videoState.zoom.active
                ? `${videoState.zoom.x}% ${videoState.zoom.y}%`
                : "50% 50%",
            }}
            animate={{
              scale: videoState.zoom.active ? videoState.zoom.scale : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 40,
            }}
          >
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              loop
              autoPlay
              className="video-player"
              playing={videoState.playing}
              onProgress={handleProgress}
              onDuration={(duration) =>
                setVideoState((prev) => ({ ...prev, duration }))
              }
              onPlay={() =>
                setVideoState((prev) => ({ ...prev, playing: true }))
              }
              onPause={() =>
                setVideoState((prev) => ({ ...prev, playing: false }))
              }
              controls={false}
            />
          </motion.div>
        </div>
        <AnimatePresence>
          {videoState.zoom.active && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.3 }}
              className="zoom-indicator"
              style={{
                left: `${videoState.zoom.x}%`,
                top: `${videoState.zoom.y}%`,
                transform: `translate(-50%, -50%) scale(${videoState.zoom.scale})`,
              }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="timeline-container">
        <div className="controls-row">
          <button className="control-button" onClick={togglePlayPause}>
            {videoState.playing ? (
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="currentColor" d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="time-display">
            {formatTime(videoState.currentTime)}
          </div>
        </div>

        <div className="timeline-track">
          <input
            type="range"
            min="0"
            max="100"
            value={(videoState.currentTime / videoState.duration) * 100 || 0}
            onChange={handleSliderChange}
            className="timeline-slider"
          />
          <div
            className="timeline-progress"
            style={{
              width: `${(videoState.currentTime / videoState.duration) * 100}%`,
            }}
          />
        </div>

        <div className="time-display">{formatTime(videoState.duration)}</div>
      </div>
    </div>
  );
};
