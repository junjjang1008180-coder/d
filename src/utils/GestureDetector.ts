export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface GestureDetectionResult {
  name: string;
  confidence: number;
  details?: {
    pinchDistance: number;
  };
  fingerState?: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
}

export class GestureDetector {
  private history: { x: number; y: number; time: number }[];
  private maxHistory: number;
  private swipeThreshold: number;
  private swipeMinSpeed: number;
  private lastSwipeTime: number;
  private swipeCooldown: number;

  constructor() {
    this.history = [];
    this.maxHistory = 15; // Swipe 감지를 위한 이력 프레임 수
    this.swipeThreshold = 0.12; // 정규화된 좌표 기준 이동 임계값
    this.swipeMinSpeed = 0.015; // 프레임당 최소 이동 속도
    this.lastSwipeTime = 0;
    this.swipeCooldown = 1000; // 스와이프 연속 트리거 방지 (ms)
  }

  // 두 3차원 점 사이의 거리 계산
  private getDistance(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  }

  // 제스처 분석 메인 함수
  public detect(landmarks: Landmark[]): GestureDetectionResult {
    if (!landmarks || landmarks.length < 21) {
      return { name: 'NONE', confidence: 0 };
    }

    // 손의 크기 기준 스케일 계산 (손목 0번에서 중지 기저부 9번까지의 거리)
    const wrist = landmarks[0];
    const middleMCP = landmarks[9];
    const handScale = this.getDistance(wrist, middleMCP);

    if (handScale === 0) return { name: 'NONE', confidence: 0 };

    // 각 손가락 기저부 관절들
    const indexMCP = landmarks[5];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];

    // 손가락 끝(TIP) 관절들
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // 각 손가락이 펴졌는지 여부 판정 (손목에서 끝까지의 거리가 손목에서 기저부까지의 거리보다 일정 비율 이상 긴지 확인)
    const isIndexExtended = this.getDistance(indexTip, wrist) > this.getDistance(indexMCP, wrist) * 1.15;
    const isMiddleExtended = this.getDistance(middleTip, wrist) > this.getDistance(middleMCP, wrist) * 1.15;
    const isRingExtended = this.getDistance(ringTip, wrist) > this.getDistance(ringMCP, wrist) * 1.15;
    const isPinkyExtended = this.getDistance(pinkyTip, wrist) > this.getDistance(pinkyMCP, wrist) * 1.15;

    // 엄지손가락 펴짐 판정 (엄지는 손목 기준이 아니라 중지 기저부 9번 또는 검지 기저부 5번과의 거리를 기준으로 삼음)
    // 접었을 때는 중지/검지 기저부쪽으로 모이므로 거리가 짧아지고, 폈을 때는 멀어짐
    const thumbDistanceToMiddle = this.getDistance(thumbTip, middleMCP) / handScale;
    const isThumbExtended = thumbDistanceToMiddle > 0.65;

    // 꼬집기(Pinch) 판정: 엄지 끝과 검지 끝의 정규화 거리가 매우 가까운 상태
    const pinchDistance = this.getDistance(thumbTip, indexTip) / handScale;
    const isPinching = pinchDistance < 0.28;

    // 스와이프 감지를 위한 이력 데이터 업데이트 (중지 기저부 9번을 손의 대표 위치로 사용)
    this.updateHistory(middleMCP);
    const swipeGesture = this.detectSwipe();
    if (swipeGesture !== 'NONE') {
      return { name: swipeGesture, confidence: 0.9, details: { pinchDistance } };
    }

    // 기본 제스처 판정 우선순위
    
    // 1. 꼬집기 (Pinch) - 드로잉 모드에 우선순위 부여
    if (isPinching) {
      return { name: 'PINCH', confidence: 0.9, details: { pinchDistance } };
    }

    // 2. 주먹 (Fist) - 네 손가락이 모두 접힘
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { name: 'FIST', confidence: 0.95 };
    }

    // 3. 보자기 (Open Palm) - 네 손가락이 모두 펴짐
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return { name: 'OPEN_PALM', confidence: 0.95 };
    }

    // 4. 검지 가리키기 (Pointing) - 검지만 펴지고 중지/약지/새끼는 접힘
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return { name: 'POINTING', confidence: 0.9 };
    }

    // 분류되지 않은 제스처
    return { 
      name: 'NONE', 
      confidence: 0,
      fingerState: {
        thumb: isThumbExtended,
        index: isIndexExtended,
        middle: isMiddleExtended,
        ring: isRingExtended,
        pinky: isPinkyExtended
      }
    };
  }

  // 손 중심 위치 이력 갱신
  private updateHistory(point: Landmark): void {
    this.history.push({ x: point.x, y: point.y, time: Date.now() });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  // 스와이프 제스처 검출
  private detectSwipe(): string {
    const now = Date.now();
    if (now - this.lastSwipeTime < this.swipeCooldown) {
      return 'NONE';
    }

    if (this.history.length < this.maxHistory) {
      return 'NONE';
    }

    const first = this.history[0];
    const last = this.history[this.history.length - 1];
    
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dt = last.time - first.time;

    if (dt === 0) return 'NONE';

    // 수평 방향 움직임 분석
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // X축 이동량이 Y축 이동량보다 훨씬 크고, 설정 임계값을 넘었을 때 스와이프 판단
    if (absDx > this.swipeThreshold && absDx > absDy * 1.5) {
      const avgSpeed = absDx / dt;
      if (avgSpeed > this.swipeMinSpeed) {
        this.lastSwipeTime = now;
        this.history = []; // 검출 후 이력 리셋
        // 카메라는 좌우 반전되어 있으므로 dx 방향 반대로 해석
        // dx > 0: 화면 상 우측 이동 (카메라 기준 우측 -> 실제 사용자에겐 좌측 스와이프)
        // dx < 0: 화면 상 좌측 이동 (카메라 기준 좌측 -> 실제 사용자에겐 우측 스와이프)
        return dx > 0 ? 'SWIPE_LEFT' : 'SWIPE_RIGHT';
      }
    }
    return 'NONE';
  }
}
