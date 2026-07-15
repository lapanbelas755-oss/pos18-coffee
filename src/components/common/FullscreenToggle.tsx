import React, { useState, useEffect } from 'react';

export default function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <button
      onClick={toggleFullscreen}
      className="fixed bottom-4 right-4 z-[9999] bg-slate-800/60 backdrop-blur-sm text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-900 transition-all hover:scale-110 active:scale-95"
      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    >
      <span className="material-symbols-outlined text-[24px]">
        {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
      </span>
    </button>
  );
}
