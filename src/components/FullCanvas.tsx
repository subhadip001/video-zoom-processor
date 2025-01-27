import React, { useRef, useEffect, useState } from "react";
import { CustomMouseEvent } from "../types/types";
import { VideoControls } from "./VideoControls";

interface FullCanvasVideoPlayerProps {
  videoUrl: string;
  mouseEvents: CustomMouseEvent[];
}

/**
 * This component plays a video on a hidden <video> element
 * and renders the frames onto a <canvas>. When the current
 * time is within (t - 1, t + 1) seconds of a recorded click
 * at timestamp t, it applies a zoom effect at the clicked (x, y) area.
 */
const FullCanvasVideoPlayer: React.FC<FullCanvasVideoPlayerProps> = ({
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
      if (!video.paused) {
        requestAnimationFrame(renderFrame);
      }
      //   else if (video.ended) {
      //     // Force one last render without zoom when video ends
      //     context.clearRect(0, 0, canvas.width, canvas.height);
      //     context.drawImage(video, 0, 0, canvas.width, canvas.height);
      //     return;
      //   }

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      const padding = 120;
      const borderRadius = 16;

      // Draw background
      context.fillStyle = "#FFC107";
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate video frame dimensions with padding
      const frameWidth = canvas.width - padding * 2;
      const frameHeight = canvas.height - padding * 2;

      // Determine if we are in a zoom event
      const { event: activeEvt, zoomScale } = getActiveEvent(video.currentTime);

      if (activeEvt && canvas && !video.ended) {
        // Calculate the scaled coordinates based on canvas size
        const scaleX = frameWidth / window.innerWidth;
        const scaleY = frameHeight / window.innerHeight;

        const zoomX = activeEvt.x * scaleX + padding;
        const zoomY = activeEvt.y * scaleY + padding;

        // Draw the background container with shadow
        context.save();
        context.beginPath();
        context.moveTo(padding + borderRadius, padding);
        context.lineTo(padding + frameWidth - borderRadius, padding);
        context.quadraticCurveTo(
          padding + frameWidth,
          padding,
          padding + frameWidth,
          padding + borderRadius
        );
        context.lineTo(
          padding + frameWidth,
          padding + frameHeight - borderRadius
        );
        context.quadraticCurveTo(
          padding + frameWidth,
          padding + frameHeight,
          padding + frameWidth - borderRadius,
          padding + frameHeight
        );
        context.lineTo(padding + borderRadius, padding + frameHeight);
        context.quadraticCurveTo(
          padding,
          padding + frameHeight,
          padding,
          padding + frameHeight - borderRadius
        );
        context.lineTo(padding, padding + borderRadius);
        context.quadraticCurveTo(
          padding,
          padding,
          padding + borderRadius,
          padding
        );
        context.closePath();

        // Add shadow
        context.shadowColor = "rgba(0, 0, 0, 0.3)";
        context.shadowBlur = 20;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 4;

        // Fill with white background
        context.fillStyle = "#FFFFFF";
        context.fill();
        context.restore();

        // Apply zoom transformation
        context.save();
        context.translate(zoomX, zoomY);
        context.scale(zoomScale, zoomScale);
        context.translate(-zoomX, -zoomY);

        // Draw the video
        context.drawImage(video, padding, padding, frameWidth, frameHeight);
        context.restore();
      } else {
        // For non-zoom state, draw with clipping
        context.save();

        // Create clipping path
        context.beginPath();
        context.moveTo(padding + borderRadius, padding);
        context.lineTo(padding + frameWidth - borderRadius, padding);
        context.quadraticCurveTo(
          padding + frameWidth,
          padding,
          padding + frameWidth,
          padding + borderRadius
        );
        context.lineTo(
          padding + frameWidth,
          padding + frameHeight - borderRadius
        );
        context.quadraticCurveTo(
          padding + frameWidth,
          padding + frameHeight,
          padding + frameWidth - borderRadius,
          padding + frameHeight
        );
        context.lineTo(padding + borderRadius, padding + frameHeight);
        context.quadraticCurveTo(
          padding,
          padding + frameHeight,
          padding,
          padding + frameHeight - borderRadius
        );
        context.lineTo(padding, padding + borderRadius);
        context.quadraticCurveTo(
          padding,
          padding,
          padding + borderRadius,
          padding
        );
        context.closePath();

        // Add shadow
        context.shadowColor = "rgba(0, 0, 0, 0.3)";
        context.shadowBlur = 20;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 4;

        // Fill with white background
        context.fillStyle = "#FFFFFF";
        context.fill();

        // Reset shadow before clipping
        context.shadowColor = "transparent";
        context.shadowBlur = 0;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;

        // Apply clipping path
        context.clip();

        // Draw the video
        context.drawImage(video, padding, padding, frameWidth, frameHeight);
        context.restore();
      }

      // Reset shadow
      context.shadowColor = "transparent";
      context.shadowBlur = 0;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", () => {
      requestAnimationFrame(renderFrame);
    });
    // video.addEventListener("ended", () => {
    //   // Ensure we render one last frame without zoom
    //     context.clearRect(0, 0, canvas.width, canvas.height);
    //     context.drawImage(video, 0, 0, canvas.width, canvas.height);
    // });

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
          borderRadius: "8px 8px 0px 0px",
          overflow: "hidden",
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          style={{ display: "none" }}
          autoPlay
          loop
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            margin: "0 auto",
            borderRadius: "",
          }}
        />
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

export default FullCanvasVideoPlayer;
