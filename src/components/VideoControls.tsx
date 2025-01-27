import React from "react";

interface VideoControlsProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
}) => {
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "0.5rem",
        backgroundColor: "#1a1a1a",
        borderRadius: "0px 0px 8px 8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <button
          onClick={onPlayPause}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div style={{ color: "white", fontSize: "0.875rem" }}>
          {formatTime(currentTime)}
        </div>

        <div
          style={{
            flex: 1,
            height: "4px",
            backgroundColor: "#4a4a4a",
            borderRadius: "2px",
            cursor: "pointer",
            position: "relative",
          }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = x / rect.width;
            onSeek(percentage * duration);
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${(currentTime / duration) * 100}%`,
              backgroundColor: "#fff",
              borderRadius: "2px",
            }}
          />
        </div>

        <div style={{ color: "white", fontSize: "0.875rem" }}>
          {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};
