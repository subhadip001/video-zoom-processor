// src/utils/zoomEffects.ts
import { CustomMouseEvent, ZoomState } from "../types/types";

export const DEFAULT_ZOOM_DURATION = 2; // seconds
export const DEFAULT_ZOOM_SCALE = 1.5;

export const calculateZoomState = (
  currentTime: number,
  mouseEvents: CustomMouseEvent[],
  containerWidth: number,
  containerHeight: number
): ZoomState => {
  // Find events that affect the current time
  const relevantEvent = mouseEvents.find((event) => {
    const startTime = Math.round(event.timestamp);
    const endTime = Math.round(event.timestamp + DEFAULT_ZOOM_DURATION);
    return currentTime >= startTime && currentTime <= endTime;
  });

  if (!relevantEvent) {
    return {
      active: false,
      x: 0,
      y: 0,
      scale: 1,
    };
  }

  // Calculate progress through the zoom effect (0 to 1)
  const progress = Math.min(
    1,
    (currentTime - Math.round(relevantEvent.timestamp)) / DEFAULT_ZOOM_DURATION
  );

  // Convert absolute coordinates to percentages
  const x = (relevantEvent.x / containerWidth) * 100;
  const y = (relevantEvent.y / containerHeight) * 100;

  // Apply immediate zoom instead of easing
  const scale = DEFAULT_ZOOM_SCALE;

  return {
    active: true,
    x,
    y,
    scale,
  };
};
