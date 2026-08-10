import React, { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  statusMessage?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  statusMessage = 'MediaPipe 머신러닝 모델을 불러오는 중...'
}) => {
  const [shouldRender, setShouldRender] = useState(isLoading);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!isLoading) {
      // fade out 효과
      setOpacity(0);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500); // style.css의 transition 0.5s에 맞춤
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setOpacity(1);
    }
  }, [isLoading]);

  if (!shouldRender) return null;

  return (
    <div
      className="overlay"
      style={{
        opacity: opacity,
        transition: 'opacity 0.5s ease',
        pointerEvents: isLoading ? 'all' : 'none'
      }}
    >
      <div className="loader-container">
        <div className="spinner"></div>
        <h1 className="orbitron neon-text">AETHER_GESTURE</h1>
        <p className="status-msg">{statusMessage}</p>
      </div>
    </div>
  );
};
