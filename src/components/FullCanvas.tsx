import React, { useRef, useEffect, useState } from "react";
import { CustomMouseEvent } from "../types/types";
import { VideoControls } from "./VideoControls";
import ExportModal from "./ExportModal";
import * as Mp4Muxer from "mp4-muxer";

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
export default function FullCanvasVideoPlayer({
  videoUrl,
  mouseEvents,
}: FullCanvasVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({
    framesProcessed: 0,
    totalFrames: 0,
  });

  async function exportCanvasToVideo() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    console.log(
      `Original dimensions: ${width}x${height} (${width * height} pixels)`
    );

    // Use a balanced target area (about 90% of the limit)
    const TARGET_CODED_AREA = 820000;
    const aspectRatio = width / height;

    // Calculate maximum width that maintains aspect ratio
    let exportWidth = Math.floor(Math.sqrt(TARGET_CODED_AREA * aspectRatio));
    let exportHeight = Math.floor(exportWidth / aspectRatio);

    // Ensure dimensions are even
    exportWidth = Math.floor(exportWidth / 2) * 2;
    exportHeight = Math.floor(exportHeight / 2) * 2;

    // Double check we're under the limit
    while (exportWidth * exportHeight > TARGET_CODED_AREA) {
      exportWidth -= 2;
      exportHeight = Math.floor(exportWidth / aspectRatio / 2) * 2;
    }

    console.log(
      `Export dimensions: ${exportWidth}x${exportHeight} (${
        exportWidth * exportHeight
      } pixels)`
    );
    console.log(
      `Video source dimensions: ${video.videoWidth}x${video.videoHeight}`
    );
    console.log(`Video duration: ${video.duration.toFixed(2)}s`);

    const offScreenCanvas = new OffscreenCanvas(exportWidth, exportHeight);
    const offScreenContext = offScreenCanvas.getContext("2d", {
      willReadFrequently: true,
      alpha: false,
    });

    if (!offScreenContext) {
      console.error("Failed to get offscreen context");
      return;
    }

    let videoEncoder: VideoEncoder | null = null;
    let muxer: any = null;
    let initialTime = video.currentTime;
    let initialPlaybackRate = video.playbackRate;

    try {
      // First ensure video is fully loaded
      if (video.readyState < 3) {
        // HAVE_FUTURE_DATA
        console.log("Waiting for video to load enough data...");
        await new Promise<void>((resolve) => {
          const handleCanPlay = () => {
            video.removeEventListener("canplay", handleCanPlay);
            resolve();
          };
          video.addEventListener("canplay", handleCanPlay);
        });
      }

      console.log("Video loaded, preparing for export...");

      // Set optimal conditions for frame extraction
      video.playbackRate = 0;
      video.pause();

      const fps = 40; // Good balance between smoothness and processing
      const duration = video.duration;
      const numFrames = Math.floor(duration * fps);
      console.log(`Processing ${numFrames} frames at ${fps} FPS`);
      setExportProgress({ framesProcessed: 0, totalFrames: numFrames });

      muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: {
          codec: "avc",
          width: exportWidth,
          height: exportHeight,
        },
        fastStart: "in-memory",
      });

      let encoderError: Error | null = null;
      let encoderClosed = false;
      let framesProcessed = 0;
      let framesEncoded = 0;

      videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          if (muxer && !encoderClosed) {
            try {
              muxer.addVideoChunk(chunk, meta);
              framesEncoded++;
              if (framesEncoded % 40 === 0) {
                console.log(`Encoded ${framesEncoded}/${numFrames} frames`);
                setExportProgress((prev) => ({
                  ...prev,
                  framesProcessed: framesEncoded,
                }));
              }
            } catch (e) {
              console.error("Error adding video chunk:", e);
              encoderError = e instanceof Error ? e : new Error(String(e));
              encoderClosed = true;
            }
          }
        },
        error: (e) => {
          encoderError = e;
          encoderClosed = true;
          console.error("VideoEncoder error:", e);
        },
      });

      await videoEncoder.configure({
        codec: "avc1.64001F", // Main profile, level 3.1 for better compatibility
        width: exportWidth,
        height: exportHeight,
        bitrate: 10_000_000, // 10Mbps for good quality
        bitrateMode: "variable", // Variable for better quality
        framerate: fps,
      });
      console.log("Encoder configured successfully");

      const scale = exportWidth / width;
      const padding = Math.round(120 * scale);
      const borderRadius = Math.round(16 * scale);
      const frameWidth = exportWidth - padding * 2;
      const frameHeight = exportHeight - padding * 2;
      console.log(
        `Frame dimensions with padding: ${frameWidth}x${frameHeight}`
      );

      // Seek to start
      video.currentTime = 0;
      await new Promise<void>((resolve) => {
        const handleSeeked = () => {
          video.removeEventListener("seeked", handleSeeked);
          resolve();
        };
        video.addEventListener("seeked", handleSeeked);
      });

      console.log("Starting frame processing...");

      for (let frameNumber = 0; frameNumber < numFrames; frameNumber++) {
        if (encoderError) {
          console.error("Encoder error detected:", encoderError);
          throw encoderError;
        }
        if (encoderClosed || !videoEncoder) {
          console.error("Encoder closed unexpectedly");
          throw new Error("Encoder was closed unexpectedly");
        }

        try {
          const frameTime = frameNumber / fps;

          // Only seek if we need to move forward
          if (Math.abs(video.currentTime - frameTime) > 0.001) {
            video.currentTime = frameTime;
            await new Promise<void>((resolve) => {
              const handleSeeked = () => {
                video.removeEventListener("seeked", handleSeeked);
                resolve();
              };
              video.addEventListener("seeked", handleSeeked);
            });

            // Add a small delay to ensure frame is fully loaded
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

          // Clear and prepare canvas
          offScreenContext.fillStyle = "#FFC107";
          offScreenContext.fillRect(0, 0, exportWidth, exportHeight);

          // Get zoom state for exact frame time
          const {
            event: activeEvt,
            zoomScale,
            transitionX,
            transitionY,
          } = getActiveEvent(frameTime);

          if (activeEvt) {
            // Calculate scale factors between recorded window size and current size
            const windowScaleX = width / activeEvt.windowWidth;
            const windowScaleY = height / activeEvt.windowHeight;

            // Use interpolated coordinates if available
            const targetX = activeEvt.x;
            const targetY = activeEvt.y;
            const scaledX = (transitionX ?? targetX) * windowScaleX;
            const scaledY = (transitionY ?? targetY) * windowScaleY;

            // Calculate canvas-relative coordinates
            const canvasX = scaledX * (exportWidth / width);
            const canvasY = scaledY * (exportHeight / height);

            offScreenContext.save();
            offScreenContext.translate(canvasX, canvasY);
            offScreenContext.scale(zoomScale, zoomScale);
            offScreenContext.translate(-canvasX, -canvasY);

            // Draw the frame
            offScreenContext.drawImage(
              video,
              padding,
              padding,
              frameWidth,
              frameHeight
            );
            offScreenContext.restore();
          } else {
            offScreenContext.save();
            offScreenContext.beginPath();
            offScreenContext.moveTo(padding + borderRadius, padding);
            offScreenContext.lineTo(
              padding + frameWidth - borderRadius,
              padding
            );
            offScreenContext.quadraticCurveTo(
              padding + frameWidth,
              padding,
              padding + frameWidth,
              padding + borderRadius
            );
            offScreenContext.lineTo(
              padding + frameWidth,
              padding + frameHeight - borderRadius
            );
            offScreenContext.quadraticCurveTo(
              padding + frameWidth,
              padding + frameHeight,
              padding + frameWidth - borderRadius,
              padding + frameHeight
            );
            offScreenContext.lineTo(
              padding + borderRadius,
              padding + frameHeight
            );
            offScreenContext.quadraticCurveTo(
              padding,
              padding + frameHeight,
              padding,
              padding + frameHeight - borderRadius
            );
            offScreenContext.lineTo(padding, padding + borderRadius);
            offScreenContext.quadraticCurveTo(
              padding,
              padding,
              padding + borderRadius,
              padding
            );
            offScreenContext.closePath();

            offScreenContext.shadowColor = "rgba(0, 0, 0, 0.3)";
            offScreenContext.shadowBlur = Math.round(20 * scale);
            offScreenContext.shadowOffsetX = 0;
            offScreenContext.shadowOffsetY = Math.round(4 * scale);

            offScreenContext.fillStyle = "#FFFFFF";
            offScreenContext.fill();

            offScreenContext.shadowColor = "transparent";
            offScreenContext.shadowBlur = 0;
            offScreenContext.shadowOffsetX = 0;
            offScreenContext.shadowOffsetY = 0;

            offScreenContext.clip();
            offScreenContext.drawImage(
              video,
              padding,
              padding,
              frameWidth,
              frameHeight
            );
            offScreenContext.restore();
          }

          if (!encoderClosed && videoEncoder) {
            const frame = new VideoFrame(offScreenCanvas, {
              timestamp: (frameNumber * 1_000_000) / fps,
              duration: 1_000_000 / fps,
            });

            try {
              await videoEncoder.encode(frame);
              frame.close();
            } catch (encodeError) {
              frame.close();
              throw encodeError;
            }
          } else {
            throw new Error("Encoder was closed");
          }

          framesProcessed++;
          if (framesProcessed % 60 === 0) {
            console.log(`Processed ${framesProcessed}/${numFrames} frames`);
            console.log(`Current video time: ${video.currentTime.toFixed(2)}s`);
            setExportProgress((prev) => ({ ...prev, framesProcessed }));
          }
        } catch (frameError) {
          console.error(`Error processing frame ${frameNumber}:`, frameError);
          if (
            frameError instanceof Error &&
            (frameError.message.includes("closed") ||
              frameError.message.includes("NotSupported"))
          ) {
            throw frameError;
          }
          continue;
        }
      }

      if (!encoderClosed && videoEncoder) {
        await videoEncoder.flush();
        muxer.finalize();
        const buffer = muxer.target.buffer;
        downloadBlob(new Blob([buffer], { type: "video/mp4" }));
      } else {
        throw new Error("Encoder was closed before completion");
      }
    } catch (error) {
      console.error("Error during video export:", error);
      throw error;
    } finally {
      if (videoEncoder) {
        try {
          if (videoEncoder.state !== "closed") {
            await videoEncoder.flush();
            videoEncoder.close();
          }
        } catch (e) {
          console.error("Error during encoder cleanup:", e);
        }
      }
      // Restore initial video state
      video.currentTime = initialTime;
      video.playbackRate = initialPlaybackRate;
      setIsExporting(false);
    }
  }

  function downloadBlob(blob: Blob) {
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = "animation.mp4";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Calculate which event is active based on the video time.
  // For a timestamp t, we consider the interval [t-1, t+1].
  // If the current time is within that interval, we apply zoom.
  const getActiveEvent = (
    currentTime: number
  ): {
    event: CustomMouseEvent | null;
    zoomScale: number;
    transitionX?: number;
    transitionY?: number;
  } => {
    // First pass: identify sequences
    const sequences: CustomMouseEvent[][] = [];
    let currentSequence: CustomMouseEvent[] = [];

    // Helper to calculate distance between two events
    const getDistance = (evt1: CustomMouseEvent, evt2: CustomMouseEvent) => {
      const dx = evt1.x - evt2.x;
      const dy = evt1.y - evt2.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Constants for sequence detection
    const MAX_TIME_GAP = 2.5; // 2 seconds
    const MAX_DISTANCE = 300; // 200 pixels, adjust this based on your needs

    for (let i = 0; i < mouseEvents.length; i++) {
      const evt = mouseEvents[i];

      if (currentSequence.length === 0) {
        currentSequence.push(evt);
      } else {
        const lastEvent = currentSequence[currentSequence.length - 1];
        const timeGap = evt.timestamp - lastEvent.timestamp;
        const distance = getDistance(evt, lastEvent);

        if (timeGap <= MAX_TIME_GAP && distance <= MAX_DISTANCE) {
          currentSequence.push(evt);
        } else {
          sequences.push([...currentSequence]);
          currentSequence = [evt];
        }
      }
    }
    if (currentSequence.length > 0) {
      sequences.push(currentSequence);
    }

    // Second pass: find active sequence and event
    for (let i = 0; i < sequences.length; i++) {
      const sequence = sequences[i];
      const firstEvent = sequence[0];
      const lastEvent = sequence[sequence.length - 1];
      const sequenceStartTime = firstEvent.timestamp - 1;
      const sequenceEndTime = lastEvent.timestamp + 1;

      if (
        currentTime >= sequenceStartTime - 0.5 &&
        currentTime <= sequenceEndTime + 0.5
      ) {
        // Find the two closest events for interpolation
        let activeEvent = firstEvent;
        let nextEvent = firstEvent;

        for (let j = 0; j < sequence.length; j++) {
          const evt = sequence[j];
          if (evt.timestamp <= currentTime) {
            activeEvent = evt;
            nextEvent = sequence[Math.min(j + 1, sequence.length - 1)];
          }
        }

        let zoomScale = 2; // Default max zoom
        let transitionX = activeEvent.x;
        let transitionY = activeEvent.y;

        // Calculate position interpolation if we're between two events in a sequence
        if (activeEvent !== nextEvent && sequence.length > 1) {
          const progress =
            (currentTime - activeEvent.timestamp) /
            (nextEvent.timestamp - activeEvent.timestamp);
          transitionX =
            activeEvent.x + (nextEvent.x - activeEvent.x) * progress;
          transitionY =
            activeEvent.y + (nextEvent.y - activeEvent.y) * progress;
        }

        // Handle zoom transitions
        const ZOOM_IN_DURATION = 1.0; // 1 second for zoom in
        const ZOOM_OUT_DURATION = 0.5; // 0.5 seconds for faster zoom out

        // Zoom in
        if (currentTime < sequenceStartTime + 0.5) {
          const progress =
            (currentTime - sequenceStartTime + 0.5) / ZOOM_IN_DURATION;
          zoomScale = 1 + Math.max(0, Math.min(1, progress));
        }
        // Stay zoomed during sequence
        else if (currentTime <= sequenceEndTime - 0.5) {
          zoomScale = 2;
        }
        // Zoom out
        else {
          const timeLeft = sequenceEndTime + 0.5 - currentTime;
          const progress = Math.max(
            0,
            Math.min(1, timeLeft / ZOOM_OUT_DURATION)
          );
          zoomScale = 1 + progress;
        }

        return {
          event: activeEvent,
          zoomScale,
          transitionX,
          transitionY,
        };
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
      const {
        event: activeEvt,
        zoomScale,
        transitionX,
        transitionY,
      } = getActiveEvent(video.currentTime);

      if (activeEvt && canvas && !video.ended) {
        // Get the canvas's bounding rectangle to handle scaling
        const canvasRect = canvas.getBoundingClientRect();

        // Calculate scale factors between recorded window size and current window size
        const windowScaleX = window.innerWidth / activeEvt.windowWidth;
        const windowScaleY = window.innerHeight / activeEvt.windowHeight;

        // Use interpolated coordinates if available
        const targetX = activeEvt.x;
        const targetY = activeEvt.y;
        const scaledX = (transitionX ?? targetX) * windowScaleX;
        const scaledY = (transitionY ?? targetY) * windowScaleY;

        const canvasX =
          (scaledX - canvasRect.left) * (canvas.width / canvasRect.width);
        const canvasY =
          (scaledY - canvasRect.top) * (canvas.height / canvasRect.height);

        // Apply zoom transformation
        context.save();
        context.translate(canvasX, canvasY);
        context.scale(zoomScale, zoomScale);
        context.translate(-canvasX, -canvasY);

        // Draw the video frame
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (error) {
        console.error('Error playing video:', error);
      }
    };

    video.addEventListener('loadeddata', playVideo);
    return () => {
      video.removeEventListener('loadeddata', playVideo);
    };
  }, [videoUrl]);

  async function handleExport() {
    try {
      setIsExporting(true);
      await exportCanvasToVideo();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="relative w-[90%] h-full">
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        style={{ display: "none" }}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(e) => {
          const video = videoRef.current;
          if (!video) return;

          setWidth(video.videoWidth);
          setHeight(video.videoHeight);
        }}
      />
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Export Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 bg-white py-2 cursor-pointer rounded-lg shadow-md transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          <span>{isExporting ? "Exporting..." : "Export"}</span>
        </button>
      </div>

      <VideoControls
        duration={duration}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
      />

      <ExportModal isOpen={isExporting} progress={exportProgress} />
    </div>
  );
}
