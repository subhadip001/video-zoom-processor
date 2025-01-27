export interface CustomMouseEvent {
  element: {
    tagName: string;
    text: string;
    id?: string;
  };
  tabId: number;
  tabUrl: string;
  timestamp: number;
  type: string;
  x: number;
  y: number;
}

export interface VideoState {
  currentTime: number;
  duration: number;
  playing: boolean;
  zoom: {
    active: boolean;
    x: number;
    y: number;
    scale: number;
  };
}

export interface ExportOptions {
  resolution: "1080p" | "720p";
  maintainAspectRatio: boolean;
}

export interface ZoomState {
  active: boolean;
  x: number;
  y: number;
  scale: number;
}

export interface VideoState {
  playing: boolean;
  currentTime: number;
  duration: number;
  zoom: ZoomState;
}
