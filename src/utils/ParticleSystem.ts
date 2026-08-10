export interface HandData {
  isDetected: boolean;
  gesture: string;
  pointer: { x: number; y: number };
  palmCenter: { x: number; y: number };
}

export type ParticleTheme = 'cosmic' | 'neon' | 'aurora';

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public maxLife: number;
  public life: number;
  public theme: ParticleTheme;
  public size: number;
  public color: string;
  public friction: number;
  public shape?: 'square' | 'cross';

  constructor(x: number, y: number, theme: ParticleTheme, velocityScale = 1) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 8 * velocityScale;
    this.vy = (Math.random() - 0.5) * 8 * velocityScale;
    
    this.maxLife = 60 + Math.random() * 40; // 생존 프레임 수
    this.life = this.maxLife;
    this.theme = theme;
    
    // 테마별 초기화
    if (theme === 'cosmic') {
      this.size = Math.random() * 3 + 1;
      this.color = this.getRandomCosmicColor();
      this.friction = 0.98;
    } else if (theme === 'neon') {
      this.size = Math.random() * 5 + 2;
      this.color = this.getRandomNeonColor();
      this.friction = 0.95;
      // 네온 스타일은 십자 또는 사각형으로 그리기 위해 형태 속성 추가
      this.shape = Math.random() > 0.5 ? 'square' : 'cross';
    } else { // aurora
      this.size = Math.random() * 15 + 10;
      this.color = this.getRandomAuroraColor();
      this.friction = 0.97;
      this.vx = (Math.random() - 0.5) * 4 * velocityScale;
      this.vy = (Math.random() - 0.5) * 4 * velocityScale;
    }
  }

  private getRandomCosmicColor(): string {
    const colors = [
      'rgba(0, 240, 255, ',   // neon blue
      'rgba(189, 0, 255, ',   // neon purple
      'rgba(255, 255, 255, ', // white
      'rgba(0, 100, 255, '    // deep blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getRandomNeonColor(): string {
    const colors = [
      'rgba(57, 255, 20, ',   // neon green
      'rgba(255, 0, 127, ',   // pink
      'rgba(255, 240, 0, ',   // yellow
      'rgba(0, 240, 255, '    // blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private getRandomAuroraColor(): string {
    const colors = [
      'rgba(0, 255, 204, ',   // teal
      'rgba(75, 0, 130, ',    // indigo
      'rgba(173, 255, 47, ',   // greenyellow
      'rgba(0, 191, 255, '    // deepskyblue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public update(externalAccX = 0, externalAccY = 0): void {
    // 외부 가속도 반영 (주먹의 흡입력 또는 보자기의 척력)
    this.vx += externalAccX;
    this.vy += externalAccY;

    // 마찰력 적용
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 위치 업데이트
    this.x += this.vx;
    this.y += this.vy;

    // 수명 단축
    this.life--;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const alpha = this.life / this.maxLife;
    ctx.save();

    if (this.theme === 'cosmic') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color + alpha + ')';
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.color + '0.8)';
      ctx.fill();
    } else if (this.theme === 'neon') {
      ctx.strokeStyle = this.color + alpha + ')';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.color + '0.8)';
      
      if (this.shape === 'square') {
        ctx.strokeRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
      } else { // cross
        ctx.beginPath();
        ctx.moveTo(this.x - this.size, this.y);
        ctx.lineTo(this.x + this.size, this.y);
        ctx.moveTo(this.x, this.y - this.size);
        ctx.lineTo(this.x, this.y + this.size);
        ctx.stroke();
      }
    } else { // aurora - 부드럽고 몽환적인 연출
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      gradient.addColorStop(0, this.color + alpha * 0.4 + ')');
      gradient.addColorStop(0.5, this.color + alpha * 0.15 + ')');
      gradient.addColorStop(1, this.color + '0)');
      
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    ctx.restore();
  }
}

export interface DrawingPath {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[];
  private drawPaths: DrawingPath[]; // 에어 드로잉 경로 저장 배열
  private currentDrawingPath: DrawingPath | null;
  private theme: ParticleTheme;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context 2D를 가져올 수 없습니다.');
    }
    this.ctx = context;
    this.particles = [];
    this.drawPaths = [];
    this.currentDrawingPath = null;
    this.theme = 'cosmic'; // 기본 테마
    this.resize();

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  public setTheme(theme: ParticleTheme): void {
    this.theme = theme;
  }

  // 에어 드로잉 캔버스 초기화
  public clearDrawCanvas(): void {
    this.drawPaths = [];
    this.currentDrawingPath = null;
  }

  // 드로잉 중인 경로 추가/업데이트
  private addDrawPoint(x: number, y: number): void {
    const drawingColors = {
      cosmic: '#bd00ff', // neon purple
      neon: '#39ff14',   // neon green
      aurora: '#00f0ff'  // neon blue
    };

    const color = drawingColors[this.theme] || '#ffffff';

    if (!this.currentDrawingPath) {
      this.currentDrawingPath = {
        points: [{ x, y }],
        color: color,
        width: this.theme === 'aurora' ? 8 : 4
      };
      this.drawPaths.push(this.currentDrawingPath);
    } else {
      // 너무 촘촘하게 추가되지 않도록 마지막 포인트와의 거리 체크
      const lastPoint = this.currentDrawingPath.points[this.currentDrawingPath.points.length - 1];
      const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
      if (dist > 3) {
        this.currentDrawingPath.points.push({ x, y });
      }
    }
  }

  // 드로잉 중단 (꼬집기를 해제했을 때 새로운 획을 긋기 위함)
  private endDrawPath(): void {
    this.currentDrawingPath = null;
  }

  // 매 프레임 업데이트 및 렌더링
  public updateAndRender(handData: HandData | null): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 잔상 효과를 위해 화면을 아주 살짝 지우며 덧칠
    ctx.fillStyle = 'rgba(5, 6, 11, 0.2)';
    ctx.fillRect(0, 0, width, height);

    // 1. 에어 드로잉 그리기 (파티클 아래 레이어로 렌더링)
    this.renderDrawingPaths();

    // 손가락 위치에 따른 파티클 생성 및 외력 처리
    const extAccX = 0;
    const extAccY = 0;

    if (handData && handData.isDetected) {
      const pointer = handData.pointer;
      const palm = handData.palmCenter;
      const gesture = handData.gesture;

      // 화면 크기에 맞게 좌표 역정규화 (카메라 X 좌표 반전)
      const px = (1 - pointer.x) * width;
      const py = pointer.y * height;
      const palmx = (1 - palm.x) * width;
      const palmy = palm.y * height;

      // 제스처가 POINTING, PINCH 또는 OPEN_PALM일 때 포인터 주변에 파티클 스폰
      if (gesture === 'POINTING') {
        // 검지 끝에서 지속적으로 스파크 파티클 분출
        for (let i = 0; i < 4; i++) {
          this.particles.push(new Particle(px, py, this.theme, 0.7));
        }
      } else if (gesture === 'PINCH') {
        // 드로잉 시 소량의 스파크 생성
        for (let i = 0; i < 2; i++) {
          this.particles.push(new Particle(px, py, this.theme, 0.4));
        }
        // 에어 드로잉 경로에 포인트 추가
        this.addDrawPoint(px, py);
      } else {
        // Pinch 제스처가 아닌 경우 그리기 획 중단
        this.endDrawPath();
      }

      if (gesture !== 'PINCH' && gesture !== 'POINTING' && gesture !== 'NONE') {
        // 다른 제스처일 때는 손가락 위치 말고 손바닥 위치 근처에 부드럽게 파티클을 스폰해 힘의 흐름을 보여줌
        if (Math.random() < 0.3) {
          this.particles.push(new Particle(palmx + (Math.random()-0.5)*100, palmy + (Math.random()-0.5)*100, this.theme, 0.3));
        }
      }

      // 제스처 모드별 외력 가속도 연산
      if (gesture === 'FIST') {
        // 주먹: 블랙홀 흡입 (파티클들이 손바닥 중심으로 끌려옴)
        this.particles.forEach(p => {
          const dx = palmx - p.x;
          const dy = palmy - p.y;
          const dist = Math.max(Math.hypot(dx, dy), 30);
          if (dist < 600) {
            const force = (600 - dist) / 3500; // 거리가 가까울수록 당기는 힘 세짐
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        });
      } else if (gesture === 'OPEN_PALM') {
        // 보자기: 바람 효과 (파티클들이 손바닥 중심에서 사방으로 튕겨 나감)
        this.particles.forEach(p => {
          const dx = p.x - palmx;
          const dy = p.y - palmy;
          const dist = Math.max(Math.hypot(dx, dy), 10);
          if (dist < 400) {
            const force = (400 - dist) / 1200; // 밀쳐내는 힘
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        });
      }
    } else {
      // 손 감지되지 않았을 때 드로잉 경로 마무리
      this.endDrawPath();
    }

    // 2. 파티클 업데이트 및 렌더링
    this.particles = this.particles.filter(p => {
      p.update(extAccX, extAccY);
      p.draw(ctx);
      return p.life > 0;
    });

    // 배경 노이즈 연출 (잔잔하게 우주 먼지 느낌의 파티클 유지)
    if (this.particles.length < 40 && Math.random() < 0.15) {
      this.particles.push(new Particle(
        Math.random() * width,
        Math.random() * height,
        this.theme,
        0.1
      ));
    }
  }

  // 에어 드로잉 획 렌더링
  private renderDrawingPaths(): void {
    const ctx = this.ctx;
    ctx.save();
    
    this.drawPaths.forEach(path => {
      if (path.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      // 베지에 곡선(Quadratic Curve)으로 부드럽게 이어 그리기
      let i;
      for (i = 1; i < path.points.length - 1; i++) {
        const xc = (path.points[i].x + path.points[i + 1].x) / 2;
        const yc = (path.points[i].y + path.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(path.points[i].x, path.points[i].y, xc, yc);
      }
      // 마지막 세그먼트 연결
      ctx.lineTo(path.points[i].x, path.points[i].y);

      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 에어 드로잉에 네온 빛 네온 효과 주기
      ctx.shadowBlur = 12;
      ctx.shadowColor = path.color;
      
      ctx.stroke();
    });

    ctx.restore();
  }
}
