// src/hooks/useVideoProcessor.ts
import { useState, useEffect, useCallback } from "react";
import { VideoProcessor, ProcessVideoOptions } from "../utils/videoProcessor";

export const useVideoProcessor = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const processor = VideoProcessor.getInstance();

    const init = async () => {
      try {
        await processor.load();
        setIsLoaded(true);
      } catch (err) {
        setError("Failed to load FFmpeg");
        console.error(err);
      }
    };

    init();

    processor.onProgress((p) => {
      setProgress(p);
    });

    processor.onLog((message) => {
      console.log("FFmpeg:", message);
    });
  }, []);

  const processVideo = useCallback(
    async (file: File, options: ProcessVideoOptions): Promise<Blob | null> => {
      setProcessing(true);
      setError(null);
      setProgress(0);

      try {
        const processor = VideoProcessor.getInstance();
        const result = await processor.processVideo(file, options);
        return result;
      } catch (err) {
        setError("Error processing video");
        console.error(err);
        return null;
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  return {
    isLoaded,
    processing,
    progress,
    error,
    processVideo,
  };
};
