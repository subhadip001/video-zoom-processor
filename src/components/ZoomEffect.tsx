// src/components/ZoomEffect.tsx
import React from "react";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import { ZoomState } from "../types/types";

interface ZoomEffectProps {
  zoom: ZoomState;
}

const ZoomIndicator = styled(motion.div)`
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 2px solid rgba(255, 0, 0, 0.8);
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 0 10px rgba(255, 0, 0, 0.3);
  backdrop-filter: blur(2px);
`;

export const ZoomEffect: React.FC<ZoomEffectProps> = ({ zoom }) => {
  if (!zoom.active) return null;

  return (
    <ZoomIndicator
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ 
        duration: 0.3,
        ease: "easeInOut"
      }}
      style={{
        left: `${zoom.x}%`,
        top: `${zoom.y}%`,
        transform: `translate(-50%, -50%) scale(${zoom.scale})`,
      }}
    />
  );
};
