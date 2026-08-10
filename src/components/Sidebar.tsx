import React from 'react';
import type { ParticleTheme } from '../utils/ParticleSystem';

interface SidebarProps {
  fps: number;
  handsCount: number;
  activeGesture: string;
  showWebcam: boolean;
  setShowWebcam: (show: boolean) => void;
  isSkeletonVisible: boolean;
  setIsSkeletonVisible: (visible: boolean) => void;
  activeTheme: ParticleTheme;
  setActiveTheme: (theme: ParticleTheme) => void;
  onClearCanvas: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  fps,
  handsCount,
  activeGesture,
  showWebcam,
  setShowWebcam,
  isSkeletonVisible,
  setIsSkeletonVisible,
  activeTheme,
  setActiveTheme,
  onClearCanvas
}) => {
  const getGestureClass = (gesture: string) => {
    switch (gesture) {
      case 'FIST':
        return 'neon-text-red';
      case 'OPEN_PALM':
        return 'neon-text-green';
      case 'PINCH':
        return 'neon-text-purple';
      case 'POINTING':
        return 'neon-text-blue';
      default:
        return '';
    }
  };

  return (
    <aside className="sidebar glass">
      <div className="brand">
        <h2 className="orbitron neon-text-blue">AETHER OS</h2>
        <span className="version">v1.0.0-beta</span>
      </div>

      {/* 시스템 모니터 */}
      <div className="panel">
        <h3 className="panel-title orbitron">SYSTEM STATUS</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">FPS</span>
            <span id="stat-fps" className="value numeric neon-text-green">
              {fps.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="status-item">
            <span className="label">HANDS</span>
            <span id="stat-hands" className="value numeric">
              {handsCount}
            </span>
          </div>
          <div className="status-item full-width">
            <span className="label">GESTURE</span>
            <span id="stat-gesture" className={`value orbitron ${getGestureClass(activeGesture)}`}>
              {activeGesture === 'NONE' ? 'DETECTING...' : activeGesture}
            </span>
          </div>
        </div>
      </div>

      {/* 가상 UI 슬라이더 / 손동작 가이드 */}
      <div className="panel instructions-panel">
        <h3 className="panel-title orbitron">GESTURE MANUAL</h3>
        <ul className="manual-list">
          <li>
            <span className="gesture-icon">✊</span>
            <div>
              <strong>Fist (주먹)</strong>
              <p>파티클 중력 흡수 (Blackhole Pull)</p>
            </div>
          </li>
          <li>
            <span className="gesture-icon">🖐️</span>
            <div>
              <strong>Open Palm (보자기)</strong>
              <p>파티클 척력 밀어내기 (Repell Wind)</p>
            </div>
          </li>
          <li>
            <span className="gesture-icon">👌</span>
            <div>
              <strong>Pinch (꼬집기)</strong>
              <p>공중 캔버스 그리기 (Air Draw)</p>
            </div>
          </li>
          <li>
            <span className="gesture-icon">👆</span>
            <div>
              <strong>Point (가리키기)</strong>
              <p>타겟 이동 / 가상 UI 조작</p>
            </div>
          </li>
        </ul>
      </div>

      {/* 설정 패널 */}
      <div className="panel settings-panel">
        <h3 className="panel-title orbitron">CONTROL PANEL</h3>
        
        <div className="setting-row">
          <label htmlFor="toggle-webcam">캠 화면 오버레이</label>
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="toggle-webcam"
              checked={showWebcam}
              onChange={(e) => setShowWebcam(e.target.checked)}
            />
            <span className="slider"></span>
          </div>
        </div>

        <div className="setting-row">
          <label htmlFor="toggle-skeleton">골격 랜드마크 표시</label>
          <div className="toggle-switch">
            <input
              type="checkbox"
              id="toggle-skeleton"
              checked={isSkeletonVisible}
              onChange={(e) => setIsSkeletonVisible(e.target.checked)}
            />
            <span className="slider"></span>
          </div>
        </div>

        <div className="setting-row">
          <label>파티클 테마</label>
          <div className="button-group">
            <button
              className={`btn theme-btn ${activeTheme === 'cosmic' ? 'active' : ''}`}
              onClick={() => setActiveTheme('cosmic')}
            >
              Cosmic
            </button>
            <button
              className={`btn theme-btn ${activeTheme === 'neon' ? 'active' : ''}`}
              onClick={() => setActiveTheme('neon')}
            >
              Neon
            </button>
            <button
              className={`btn theme-btn ${activeTheme === 'aurora' ? 'active' : ''}`}
              onClick={() => setActiveTheme('aurora')}
            >
              Aurora
            </button>
          </div>
        </div>

        <div className="setting-row button-row">
          <button
            id="btn-clear-canvas"
            className="btn btn-warning full-width orbitron"
            onClick={onClearCanvas}
          >
            CLEAR AIR CANVAS
          </button>
        </div>
      </div>
    </aside>
  );
};
