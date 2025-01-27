import React from 'react';

interface ExportModalProps {
  isOpen: boolean;
  progress: {
    framesProcessed: number;
    totalFrames: number;
  };
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, progress }) => {
  if (!isOpen) return null;

  const percentage = Math.round((progress.framesProcessed / progress.totalFrames) * 100) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Exporting Video</h3>
        <div className="mb-4">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-600 text-center">
            {progress.framesProcessed} / {progress.totalFrames} frames processed ({percentage}%)
          </div>
        </div>
        <p className="text-sm text-gray-500 text-center">
          Please wait while your video is being exported...
        </p>
      </div>
    </div>
  );
};

export default ExportModal;
