import React, { useEffect, useRef } from 'react';

interface VirtualButtonProps {
  id: string;
  label: string;
  actionValue: string;
  xRatio: number; // 0.0 ~ 1.0
  yRatio: number; // 0.0 ~ 1.0
  width: number; // px
  height: number; // px
  callback: (val: string) => void;
  sharedPointerRef: React.RefObject<{ x: number; y: number; isDetected: boolean }>;
  viewportSize: { width: number; height: number };
}

export const VirtualButton: React.FC<VirtualButtonProps> = ({
  id,
  label,
  actionValue,
  xRatio,
  yRatio,
  width,
  height,
  callback,
  sharedPointerRef,
  viewportSize
}) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // 내부 상태를 ref로 관리하여 React 리렌더링을 방지
  const stateRef = useRef({
    progress: 0,
    cooldown: 0,
    lastTime: Date.now(),
    isHovered: false
  });

  // 버튼 위치 계산
  const left = xRatio * viewportSize.width - width / 2;
  const top = yRatio * viewportSize.height - height / 2;

  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      const now = Date.now();
      const dt = now - stateRef.current.lastTime;
      stateRef.current.lastTime = now;

      const btnEl = buttonRef.current;
      const progressEl = progressBarRef.current;
      if (!btnEl || !progressEl) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      // 1. 쿨다운 처리
      if (stateRef.current.cooldown > 0) {
        stateRef.current.cooldown -= dt;
        btnEl.classList.add('cooldown');
        btnEl.style.borderColor = 'rgba(255, 255, 255, 0.05)';
        btnEl.style.opacity = '0.5';
        stateRef.current.progress = 0;
        progressEl.style.width = '0%';
        animationFrameId = requestAnimationFrame(loop);
        return;
      } else {
        btnEl.classList.remove('cooldown');
        btnEl.style.opacity = '1';
      }

      // 2. 오버랩 판정
      const pointer = sharedPointerRef.current;
      let isOverlapping = false;

      if (pointer && pointer.isDetected) {
        const rect = btnEl.getBoundingClientRect();
        // 카메라 이미지가 좌우 반전되어 출력되고 포인터 좌표는 (1 - normalizedX) 형태로 이미 보정되어 전달됨
        // 따라서 클라이언트 DOM의 getBoundingClientRect() 절대 위치와 포인터 좌표를 직접 대조 가능
        const px = pointer.x;
        const py = pointer.y;

        if (
          px >= rect.left &&
          px <= rect.right &&
          py >= rect.top &&
          py <= rect.bottom
        ) {
          isOverlapping = true;
        }
      }

      // 3. 상태 업데이트 및 피드백 적용
      if (isOverlapping) {
        stateRef.current.isHovered = true;
        btnEl.classList.add('hovered');
        btnEl.style.borderColor = 'var(--neon-blue)';
        btnEl.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.4), inset 0 0 15px rgba(0, 240, 255, 0.2)';

        // 1초(1000ms) 유지 시 클릭 트리거
        stateRef.current.progress += (dt / 1000) * 100;
        if (stateRef.current.progress >= 100) {
          stateRef.current.progress = 100;
          
          // 클릭 트리거 실행
          callback(actionValue);
          stateRef.current.progress = 0;
          stateRef.current.cooldown = 1500; // 1.5초 쿨다운

          // 시각적 터치 이펙트 (순간적인 발광 효과)
          btnEl.style.borderColor = 'var(--neon-green)';
          btnEl.style.boxShadow = '0 0 30px var(--neon-green)';
          progressEl.style.background = 'var(--neon-green)';

          // 햅틱을 묘사하는 scale 진동 애니메이션
          btnEl.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(0.92)' },
            { transform: 'scale(1.05)' },
            { transform: 'scale(1)' }
          ], { duration: 250 });

          setTimeout(() => {
            if (progressBarRef.current) {
              progressBarRef.current.style.background = 'var(--neon-blue)';
            }
          }, 500);
        }
      } else {
        stateRef.current.isHovered = false;
        btnEl.classList.remove('hovered');
        btnEl.style.borderColor = 'rgba(0, 240, 255, 0.3)';
        btnEl.style.boxShadow = 'inset 0 0 10px rgba(0, 240, 255, 0.1)';

        // 겹치지 않으면 프로그레스가 서서히 감소 (300ms 기준 소멸)
        stateRef.current.progress = Math.max(0, stateRef.current.progress - (dt / 300) * 100);
      }

      // 프로그레스 바 UI 갱신
      progressEl.style.width = `${stateRef.current.progress}%`;

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [callback, actionValue, sharedPointerRef]);

  return (
    <div
      ref={buttonRef}
      id={`vbtn-${id}`}
      className="virtual-btn-element orbitron"
      style={{
        position: 'absolute',
        width: `${width}px`,
        height: `${height}px`,
        left: `${left}px`,
        top: `${top}px`,
        pointerEvents: 'none' // 클릭 연산은 수동 오버랩 검사로 처리하므로 DOM 클릭 이벤트는 통과시킴
      }}
    >
      <div className="vbtn-glow-border"></div>
      <span className="vbtn-label">{label}</span>
      <div
        className="vbtn-progress-container"
        style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '4px',
          background: 'rgba(255, 255, 255, 0.1)'
        }}
      >
        <div
          ref={progressBarRef}
          className="vbtn-progress-bar"
          style={{
            width: '0%',
            height: '100%',
            background: 'var(--neon-blue)',
            boxShadow: '0 0 8px var(--neon-blue)',
            transition: 'width 0.1s linear'
          }}
        ></div>
      </div>
    </div>
  );
};
