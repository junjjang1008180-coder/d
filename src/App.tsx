import { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Viewport } from './components/Viewport';
import { LoadingOverlay } from './components/LoadingOverlay';
import { GestureDetector } from './utils/GestureDetector';
import { ParticleSystem } from './utils/ParticleSystem';
import type { ParticleTheme, HandData } from './utils/ParticleSystem';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],         // 엄지
  [0, 5], [5, 6], [6, 7], [7, 8],         // 검지
  [5, 9], [9, 10], [10, 11], [11, 12],    // 중지
  [9, 13], [13, 14], [14, 15], [15, 16],  // 약지
  [13, 17], [17, 18], [18, 19], [19, 20], // 새끼
  [0, 17]                                 // 손바닥 밑둥 연결
];

function App() {
  // UI 상태 변수
  const [fps, setFps] = useState(0);
  const [handsCount, setHandsCount] = useState(0);
  const [activeGesture, setActiveGesture] = useState('NONE');
  const [showWebcam, setShowWebcam] = useState(true);
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(true);
  const [activeTheme, setActiveTheme] = useState<ParticleTheme>('cosmic');
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('MediaPipe 머신러닝 모델을 불러오는 중...');

  // DOM 엘리먼트 참조 Ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debugCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const cursorRingRef = useRef<HTMLDivElement | null>(null);

  // 초경량 전역 좌표 공유 Ref (리액트 리렌더링 없이 매 프레임 가상 버튼들과 데이터 연동)
  const sharedPointerRef = useRef({ x: 0, y: 0, isDetected: false });

  // 유틸리티 클래스 Ref (각 손마다 별도 GestureDetector 인스턴스를 할당하여 스와이프 이력을 독립적으로 유지)
  const detectorRefs = useRef<GestureDetector[]>([new GestureDetector(), new GestureDetector()]);
  const particleSystemRef = useRef<ParticleSystem | null>(null);

  // 양손 특수 이펙트 상태 표시 데이터
  const [dualEffect, setDualEffect] = useState<string>('NONE');

  // 실시간 트래킹 프레임 이력 및 계산용 변수
  const currentHandResultsRef = useRef<any>(null);
  const fpsCalcRef = useRef({
    lastTime: performance.now(),
    frameCount: 0
  });

  // 테마 변경 시 파티클 시스템에 연동
  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setTheme(activeTheme);
    }
  }, [activeTheme]);

  // 에어 캔버스 전체 리셋 핸들러
  const handleClearCanvas = () => {
    if (particleSystemRef.current) {
      particleSystemRef.current.clearDrawCanvas();
    }
  };

  useEffect(() => {
    // 1. 유틸리티 및 파티클 시스템 인스턴스 초기화
    if (!canvasRef.current) return;
    detectorRefs.current = [new GestureDetector(), new GestureDetector()];
    particleSystemRef.current = new ParticleSystem(canvasRef.current);

    const detectors = detectorRefs.current;
    const particles = particleSystemRef.current;

    // 2. MediaPipe 가동 준비
    if (!window.Hands || !window.Camera) {
      setStatusMessage('MediaPipe 라이브러리를 로드하지 못했습니다. index.html 설정을 확인해주세요.');
      return;
    }

    const hands = new window.Hands({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2, // 양손 트래킹 활성화
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    // 스켈레톤 드로잉 헬퍼 (양손 모두 지원)
    const drawSkeleton = (results: any) => {
      const canvas = debugCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

      results.multiHandLandmarks.forEach((landmarks: any, handIndex: number) => {
        // 첫 번째 손: 청색, 두 번째 손: 노란색
        const lineColor = handIndex === 0 ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 165, 0, 0.6)';
        const shadowColor = handIndex === 0 ? '#00f0ff' : '#ffa500';
        const dotTipColor = handIndex === 0 ? '#bd00ff' : '#ff4500';
        const dotColor = handIndex === 0 ? '#39ff14' : '#ffd700';

        // 1. 관절 연결선 그리기
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 4;
        ctx.shadowColor = shadowColor;

        HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
          const start = landmarks[startIdx];
          const end = landmarks[endIdx];
          ctx.beginPath();
          ctx.moveTo(start.x * width, start.y * height);
          ctx.lineTo(end.x * width, end.y * height);
          ctx.stroke();
        });

        // 2. 관절 마디 포인트 그리기
        ctx.shadowBlur = 0;
        landmarks.forEach((lm: any, idx: number) => {
          ctx.beginPath();
          ctx.arc(lm.x * width, lm.y * height, 4, 0, Math.PI * 2);
          if ([4, 8, 12, 16, 20].includes(idx)) {
            ctx.fillStyle = dotTipColor;
            ctx.arc(lm.x * width, lm.y * height, 2, 0, Math.PI * 2);
          } else {
            ctx.fillStyle = dotColor;
          }
          ctx.fill();
        });
      });
    };

    // 손가락 에어 마우스 커서 위치 및 링 이펙트 업데이트 (Direct DOM 조작)
    const updateCursorUI = (handData: HandData, canvasWidth: number, canvasHeight: number) => {
      const cursor = cursorRef.current;
      const ring = cursorRingRef.current;
      if (!cursor || !ring) return;

      // 카메라가 미러링되어 있으므로 X 좌표 반전
      const cx = (1 - handData.pointer.x) * canvasWidth;
      const cy = handData.pointer.y * canvasHeight;

      cursor.style.left = `${cx}px`;
      cursor.style.top = `${cy}px`;

      // 가상 버튼 클릭 감지용 좌표를 브라우저 viewport 좌표로 변환하여 shared pointer에 업데이트
      // 뷰포트 내 절대 좌표 = canvas rect 기준 상대좌표 + window offset
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        sharedPointerRef.current.x = canvasRect.left + cx;
        sharedPointerRef.current.y = canvasRect.top + cy;
        sharedPointerRef.current.isDetected = true;
      }

      // 커서 스타일 및 링 이펙트 변화
      if (handData.gesture === 'POINTING' || handData.gesture === 'PINCH' || handData.gesture === 'ERASE') {
        cursor.style.opacity = '1';
        if (handData.gesture === 'PINCH') {
          ring.style.borderColor = 'var(--neon-purple)';
          ring.style.transform = 'scale(0.7)';
          ring.style.boxShadow = '0 0 10px var(--neon-purple)';
        } else if (handData.gesture === 'ERASE') {
          ring.style.borderColor = 'var(--neon-red)';
          ring.style.transform = 'scale(1.2)';
          ring.style.boxShadow = '0 0 12px var(--neon-red)';
        } else {
          ring.style.borderColor = 'var(--neon-blue)';
          ring.style.transform = 'scale(1.0)';
          ring.style.boxShadow = 'var(--glow-shadow)';
        }
      } else {
        cursor.style.opacity = '0.4';
      }
    };

    // MediaPipe 결과 콜백
    hands.onResults((results: any) => {
      // 1. 최초 로드 완료 시
      setIsModelLoaded(true);

      currentHandResultsRef.current = results;

      // 2. 손 개수 업데이트
      const numHands = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;
      setHandsCount(numHands);

      // 3. 골격 그리기
      if (isSkeletonVisible && numHands > 0) {
        drawSkeleton(results);
      } else {
        const canvas = debugCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    });

    // 3. 카메라 시작
    let camera: any = null;
    if (videoRef.current) {
      camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      camera.start()
        .then(() => {
          console.log('카메라 실행 성공');
        })
        .catch((err: any) => {
          console.error('카메라 권한 오류 또는 시작 실패:', err);
          setStatusMessage('웹캠을 실행할 수 없습니다. 카메라 권한을 허용해 주세요.');
        });
    }

    // 4. 리사이즈 싱크 헬퍼
    const syncCanvasSizes = () => {
      const canvas = debugCanvasRef.current;
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
      if (canvasRef.current) {
        particles.resize();
      }
    };
    syncCanvasSizes();
    window.addEventListener('resize', syncCanvasSizes);

    // 5. 60FPS 애니메이션 루프
    let animationFrameId: number;

    const renderLoop = () => {
      // FPS 계산
      const now = performance.now();
      fpsCalcRef.current.frameCount++;
      if (now > fpsCalcRef.current.lastTime + 1000) {
        const calculatedFps = Math.round(
          (fpsCalcRef.current.frameCount * 1000) / (now - fpsCalcRef.current.lastTime)
        );
        setFps(calculatedFps);
        fpsCalcRef.current.frameCount = 0;
        fpsCalcRef.current.lastTime = now;
      }

      // 손 정보 가공 (두 손 모두 처리)
      let handData: HandData = {
        isDetected: false,
        gesture: 'NONE',
        pointer: { x: 0, y: 0 },
        palmCenter: { x: 0, y: 0 }
      };
      let secondHandData: HandData | null = null;

      const results = currentHandResultsRef.current;
      const canvas = canvasRef.current;
      const numDetected = results?.multiHandLandmarks?.length ?? 0;

      if (canvas && results && numDetected > 0) {
        // 첫 번째 손
        const landmarks0 = results.multiHandLandmarks[0];
        const detection0 = detectors[0].detect(landmarks0);
        handData = {
          isDetected: true,
          gesture: detection0.name,
          pointer: landmarks0[8],
          palmCenter: landmarks0[9]
        };

        setActiveGesture(detection0.name);

        if (detection0.name === 'ERASE') {
          particles.clearDrawCanvas();
        }

        updateCursorUI(handData, canvas.width, canvas.height);

        // 두 번째 손 처리
        if (numDetected > 1) {
          const landmarks1 = results.multiHandLandmarks[1];
          const detection1 = detectors[1].detect(landmarks1);
          secondHandData = {
            isDetected: true,
            gesture: detection1.name,
            pointer: landmarks1[8],
            palmCenter: landmarks1[9]
          };

          // 양손 특수 이펙트 상태 표시
          const g0 = detection0.name;
          const g1 = detection1.name;
          if (g0 === 'FIST' && g1 === 'FIST') {
            setDualEffect('ENERGY_BEAM');
          } else if (g0 === 'OPEN_PALM' && g1 === 'OPEN_PALM') {
            setDualEffect('BIG_BANG');
          } else if (g0 === 'POINTING' && g1 === 'POINTING') {
            setDualEffect('VORTEX');
          } else {
            setDualEffect('NONE');
          }
        } else {
          setDualEffect('NONE');
        }
      } else {
        setActiveGesture('NONE');
        setDualEffect('NONE');
        sharedPointerRef.current.isDetected = false;
        if (cursorRef.current) {
          cursorRef.current.style.opacity = '0';
        }
      }

      // 파티클 물리 갱신 및 렌더링 (양손 데이터 반영)
      particles.updateAndRender(handData, secondHandData);

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    // 6. 리소스 해제(Cleanup) 루틴
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', syncCanvasSizes);
      if (camera) {
        camera.stop();
      }
      hands.close();
      particles.destroy();
    };
  }, [isSkeletonVisible]);

  return (
    <div className="app-container">
      {/* Sci-Fi 로딩 오버레이 */}
      <LoadingOverlay isLoading={!isModelLoaded} statusMessage={statusMessage} />

      {/* 제어판 & 상태 패널 사이드바 */}


      {/* 메인 뷰포트 (인터랙션 스크린) */}
      <Viewport
        videoRef={videoRef}
        canvasRef={canvasRef}
        debugCanvasRef={debugCanvasRef}
        cursorRef={cursorRef}
        cursorRingRef={cursorRingRef}
        showWebcam={showWebcam}
        sharedPointerRef={sharedPointerRef}
        setActiveTheme={setActiveTheme}
        onClearCanvas={handleClearCanvas}
      />
    </div>
  );
}

export default App;
