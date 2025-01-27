import React, { useRef, useEffect, useState } from "react";
import { CustomMouseEvent } from "../types/types";
import { VideoControls } from "./VideoControls";

interface CanvasVideoPlayerProps {
  videoUrl: string;
  mouseEvents: CustomMouseEvent[];
}

/**
 * This component plays a video on a hidden <video> element
 * and renders the frames onto a <canvas>. When the current
 * time is within (t - 1, t + 1) seconds of a recorded click
 * at timestamp t, it applies a zoom effect at the clicked (x, y) area.
 */
const CanvasVideoPlayer: React.FC<CanvasVideoPlayerProps> = ({
  videoUrl,
  mouseEvents,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(640);
  const [height, setHeight] = useState(360);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Calculate which event is active based on the video time.
  // For a timestamp t, we consider the interval [t-1, t+1].
  // If the current time is within that interval, we apply zoom.
  const getActiveEvent = (
    currentTime: number
  ): { event: CustomMouseEvent | null; zoomScale: number } => {
    for (const evt of mouseEvents) {
      const startTime = evt.timestamp - 1;
      const endTime = evt.timestamp + 1;

      if (currentTime >= startTime && currentTime <= endTime) {
        // Calculate zoom scale based on position in the timeline
        let zoomScale = 2; // Default max zoom

        // Zoom in transition (over 0.5s)
        if (currentTime < startTime + 0.5) {
          const progress = (currentTime - startTime) / 0.5;
          zoomScale = 1 + progress; // Linear interpolation from 1 to 2
        }
        // Maintain full zoom
        else if (currentTime <= endTime - 0.5) {
          zoomScale = 2;
        }
        // Zoom out transition (over 0.5s)
        else {
          const progress = (endTime - currentTime) / 0.5;
          zoomScale = 1 + progress; // Linear interpolation from 1 to 2
        }

        return { event: evt, zoomScale };
      }
    }
    return { event: null, zoomScale: 1 };
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Handle seeking
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Update canvas size to match video after loaded
    const handleLoadedMetadata = () => {
      setWidth(video.videoWidth);
      setHeight(video.videoHeight);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    // Draw each frame to canvas with optional zoom effect
    const renderFrame = () => {
      if (!video.paused && !video.ended) {
        requestAnimationFrame(renderFrame);
      } else if (video.ended) {
        // Force one last render without zoom when video ends
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        return;
      }

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Determine if we are in a zoom event
      const { event: activeEvt, zoomScale } = getActiveEvent(video.currentTime);

      if (activeEvt && canvas && !video.ended) {
        // Calculate the scaled coordinates based on canvas size
        const scaleX = canvas.width / window.innerWidth;
        const scaleY = canvas.height / window.innerHeight;

        const zoomX = activeEvt.x * scaleX;
        const zoomY = activeEvt.y * scaleY;

        // Translate context to center the zoom at the scaled (x, y) from event
        context.save();
        context.translate(zoomX, zoomY);
        context.scale(zoomScale, zoomScale);
        context.translate(-zoomX, -zoomY);

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();
      } else {
        // Draw normally if not in a zoom period
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", () => {
      requestAnimationFrame(renderFrame);
    });
    video.addEventListener("ended", () => {
      // Ensure we render one last frame without zoom
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    });

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", () => {});
    };
  }, [mouseEvents]);

  // Update current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  return (
    <section
      style={{
        width: "80%",
        height: "80dvh",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "orange",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          borderRadius: "8px 8px 0px 0px",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            width: "90%",
            maxWidth: "1200px",
            backgroundColor: "#2a2a2a",
            padding: "1rem",
            borderRadius: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          }}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            style={{ display: "none" }}
            autoPlay
            playsInline
          />
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            style={{
              maxWidth: "100%",
              height: "auto",
              display: "block",
              margin: "0 auto",
              borderRadius: "4px",
            }}
          />
        </div>
      </div>
      <VideoControls
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
      />
    </section>
  );
};

export default CanvasVideoPlayer;
