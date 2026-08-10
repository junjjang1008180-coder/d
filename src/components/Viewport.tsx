import React, { useEffect, useRef, useState } from 'react';
import type { ParticleTheme } from '../utils/ParticleSystem';
import { VirtualButton } from './VirtualButton';

interface ViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  debugCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  cursorRingRef: React.RefObject<HTMLDivElement | null>;
  showWebcam: boolean;
  sharedPointerRef: React.RefObject<{ x: number; y: number; isDetected: boolean }>;
  setActiveTheme: (theme: ParticleTheme) => void;
  onClearCanvas: () => void;
}

export const Viewport: React.FC<ViewportProps> = ({
  videoRef,
  canvasRef,
  debugCanvasRef,
  cursorRef,
  cursorRingRef,
  showWebcam,
  sharedPointerRef,
  setActiveTheme,
  onClearCanvas
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // 뷰포트 영역의 사이즈를 실시간으로 추적 (가상 버튼 배치용)
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // 약간의 딜레이 뒤 다시 한번 재측정 (애니메이션 등 프레임 꼬임 방지)
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  return (
    <main ref={containerRef} className="viewport">
      {/* 파티클이 그려질 캔버스 */}
      <canvas id="interactive-canvas" ref={canvasRef}></canvas>

      {/* 웹캠 비디오 및 골격이 그려질 디버그 캔버스 */}
      <div className={`webcam-container ${showWebcam ? '' : 'hidden'}`}>
        <video ref={videoRef} id="webcam" autoPlay playsInline muted></video>
        {/* 골격 랜드마크를 그리는 보조 캔버스 */}
        <canvas ref={debugCanvasRef} id="debug-canvas"></canvas>
      </div>

      {/* 가상 UI 오버레이: Floating Buttons */}
      <div className="virtual-ui-overlay">
        {viewportSize.width > 0 && (
          <>
            <VirtualButton
              id="cosmic"
              label="COSMIC THEME"
              actionValue="cosmic"
              xRatio={0.28}
              yRatio={0.1}
              width={140}
              height={50}
              callback={(val) => setActiveTheme(val as ParticleTheme)}
              sharedPointerRef={sharedPointerRef}
              viewportSize={viewportSize}
            />
            <VirtualButton
              id="neon"
              label="NEON THEME"
              actionValue="neon"
              xRatio={0.44}
              yRatio={0.1}
              width={140}
              height={50}
              callback={(val) => setActiveTheme(val as ParticleTheme)}
              sharedPointerRef={sharedPointerRef}
              viewportSize={viewportSize}
            />
            <VirtualButton
              id="aurora"
              label="AURORA THEME"
              actionValue="aurora"
              xRatio={0.60}
              yRatio={0.1}
              width={140}
              height={50}
              callback={(val) => setActiveTheme(val as ParticleTheme)}
              sharedPointerRef={sharedPointerRef}
              viewportSize={viewportSize}
            />
            <VirtualButton
              id="clear"
              label="RESET CANVAS"
              actionValue="clear"
              xRatio={0.76}
              yRatio={0.1}
              width={140}
              height={50}
              callback={onClearCanvas}
              sharedPointerRef={sharedPointerRef}
              viewportSize={viewportSize}
            />
          </>
        )}
      </div>

      {/* 에어 마우스 커서 */}
      <div id="gesture-cursor" ref={cursorRef}>
        <div className="cursor-ring" ref={cursorRingRef}></div>
        <div className="cursor-dot"></div>
      </div>
    </main>
  );
};
