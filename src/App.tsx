import { useState } from "react";
import { VideoPlayer } from "./components/VideoPlayer";
import { CustomMouseEvent } from "./types/types";
import "./styles/components.css";
import CanvasVideoPlayer from "./components/Canvas";

function App() {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [mouseEvents, setMouseEvents] = useState<CustomMouseEvent[]>([]);

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const handleJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const events = JSON.parse(event.target?.result as string);
          setMouseEvents(events);
        } catch (error) {
          console.error("Error loading JSON file:", error);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="app-container">
      {!videoUrl && (
        <div className="input-grid">
          <label htmlFor="jsonInput" className="input-card">
            <input
              id="jsonInput"
              type="file"
              accept=".json"
              onChange={handleJsonFile}
              className="hidden"
            />
            <div className="card-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h2 className="card-title">Load JSON File</h2>
            <p className="card-description">
              Supports automatic and follow-cursor zooms
            </p>
          </label>

          <label htmlFor="videoInput" className="input-card">
            <input
              id="videoInput"
              type="file"
              accept="video/*"
              onChange={handleVideoFile}
              className="hidden"
            />
            <div className="card-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h2 className="card-title">Load a video file</h2>
            <p className="card-description">
              Supports automatic and follow-cursor zooms
            </p>
          </label>
        </div>
      )}

      {videoUrl && (
        // <VideoPlayer videoUrl={videoUrl} mouseEvents={mouseEvents} />
        <CanvasVideoPlayer videoUrl={videoUrl} mouseEvents={mouseEvents} />
      )}
    </div>
  );
}

export default App;
