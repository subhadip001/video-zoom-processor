// src/utils/videoProcessor.ts
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export interface ProcessVideoOptions {
  resolution: "1080p" | "720p";
  maintainAspectRatio: boolean;
}

export class VideoProcessor {
  private static instance: VideoProcessor;
  private ffmpeg: FFmpeg;
  private loaded: boolean = false;

  private constructor() {
    this.ffmpeg = new FFmpeg();
  }

  static getInstance(): VideoProcessor {
    if (!VideoProcessor.instance) {
      VideoProcessor.instance = new VideoProcessor();
    }
    return VideoProcessor.instance;
  }

  async load() {
    if (!this.loaded) {
      await this.ffmpeg.load();
      this.loaded = true;
    }
  }

  async processVideo(
    videoFile: File,
    options: ProcessVideoOptions
  ): Promise<Blob> {
    if (!this.loaded) {
      await this.load();
    }

    const inputFileName = "input.webm";
    const outputFileName = "output.webm";

    // Write input file
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

    const width = options.resolution === "1080p" ? 1920 : 1280;
    const height = options.resolution === "1080p" ? 1080 : 720;

    // Process video
    await this.ffmpeg.exec([
      "-i",
      inputFileName,
      "-vf",
      `scale=${width}:${height}${
        options.maintainAspectRatio
          ? ":force_original_aspect_ratio=decrease"
          : ""
      }`,
      "-c:v",
      "libvpx-vp9",
      "-crf",
      "30",
      "-b:v",
      "0",
      outputFileName,
    ]);

    // Read output file
    const data = await this.ffmpeg.readFile(outputFileName);
    return new Blob([data], { type: "video/webm" });
  }

  onProgress(callback: (progress: number) => void) {
    this.ffmpeg.on("progress", (progress) => {
      callback(progress.progress * 100);
    });
  }

  onLog(callback: (message: string) => void) {
    this.ffmpeg.on("log", ({ message }) => {
      callback(message);
    });
  }
}
