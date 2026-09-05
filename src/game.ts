import { RaceAudio } from './audio';
import { movementEffectFrame, type PaperFleck } from './effects';
import {
  FIXED_STEP,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  emptyControls,
  nextRound,
  pauseGame,
  resumeGame,
  startRound,
  stepGame,
  type Controls,
  type GameSettings,
  type GameState,
  type Player,
} from './model';

const COLORS = {
  paper: '#FFF8E9',
  ink: '#152D2F',
  muted: '#526566',
  coral: '#D94A3D',
  blue: '#176B87',
  lime: '#B8D638',
  warning: '#A85A00',
};

export interface GameControllerOptions {
  canvas: HTMLCanvasElement;
  state: GameState;
  settings: GameSettings;
  onChange: (state: GameState, urgent?: boolean) => void;
  onFps: (fps: number) => void;
}

type ControlName = keyof Controls;

export class GameController {
  state: GameState;
  settings: GameSettings;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly onChange: GameControllerOptions['onChange'];
  private readonly onFps: GameControllerOptions['onFps'];
  private readonly controls: [Controls, Controls] = [emptyControls(), emptyControls()];
  private readonly audio = new RaceAudio();
  private frame = 0;
  private lastTime = 0;
  private accumulator = 0;
  private lastReport = 0;
  private framesSinceReport = 0;
  private lastPersist = 0;
  private previousPhase: GameState['phase'];
  private resizeObserver: ResizeObserver;
  private destroyed = false;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(options: GameControllerOptions) {
    this.canvas = options.canvas;
    const context = this.canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
    this.context = context;
    this.state = options.state;
    this.settings = options.settings;
    this.onChange = options.onChange;
    this.onFps = options.onFps;
    this.previousPhase = this.state.phase;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    this.resize();
    this.bindInput();
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('blur', this.handleBlur);
    this.frame = requestAnimationFrame(this.loop);
  }

  private bindInput(): void {
    this.canvas.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('keyup', this.handleKeyUp);
  }

  private mapKey(code: string): [0 | 1, ControlName] | null {
    const keys: Record<string, [0 | 1, ControlName]> = {
      KeyA: [0, 'left'],
      KeyD: [0, 'right'],
      KeyW: [0, 'up'],
      KeyS: [0, 'dash'],
      ArrowLeft: [1, 'left'],
      ArrowRight: [1, 'right'],
      ArrowUp: [1, 'up'],
      ArrowDown: [1, 'dash'],
    };
    return keys[code] ?? null;
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      event.preventDefault();
      this.togglePause();
      return;
    }
    const mapping = this.mapKey(event.code);
    if (!mapping) return;
    event.preventDefault();
    this.controls[mapping[0]][mapping[1]] = true;
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const mapping = this.mapKey(event.code);
    if (!mapping) return;
    event.preventDefault();
    this.controls[mapping[0]][mapping[1]] = false;
  };

  private handleVisibility = (): void => {
    if (document.hidden) this.pause();
  };

  private handleBlur = (): void => {
    this.pause();
  };

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  private loop = (time: number): void => {
    if (this.destroyed) return;
    if (!this.lastTime) this.lastTime = time;
    const elapsed = Math.min(0.1, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.accumulator += elapsed;

    while (this.accumulator >= FIXED_STEP) {
      stepGame(this.state, this.controls, this.settings, FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    this.render(this.accumulator / FIXED_STEP, time);
    this.framesSinceReport += 1;
    if (time - this.lastReport >= 1000) {
      const seconds = Math.max(0.001, (time - this.lastReport) / 1000);
      this.onFps(Math.round(this.framesSinceReport / seconds));
      this.framesSinceReport = 0;
      this.lastReport = time;
    }

    if (this.state.phase !== this.previousPhase) {
      if (this.state.phase === 'playing') this.audio.tone('start', this.settings.muted);
      if (this.state.phase === 'round-over') this.audio.tone('round', this.settings.muted);
      if (this.state.phase === 'match-over') this.audio.tone('match', this.settings.muted);
      this.previousPhase = this.state.phase;
      this.onChange(this.state, true);
    } else if (time - this.lastPersist > 500) {
      this.lastPersist = time;
      this.onChange(this.state);
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private render(alpha: number, time: number): void {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    const offsetX = (width - WORLD_WIDTH * scale) / 2;
    const offsetY = (height - WORLD_HEIGHT * scale) / 2;
    const effects = movementEffectFrame(
      this.state.players,
      this.settings.effects,
      this.reducedMotion.matches,
      time,
    );
    this.context.setTransform(scale, 0, 0, scale, offsetX + effects.shakeX * scale, offsetY);
    this.context.fillStyle = COLORS.paper;
    this.context.fillRect(-5, 0, WORLD_WIDTH + 10, WORLD_HEIGHT);

    this.drawRegistrationMarks();
    this.drawHazards();
    this.drawCourse();
    this.drawPaperFlecks(effects.flecks);
    this.state.players.forEach((player) => this.drawPlayer(player, alpha));
    this.drawCanvasStatus();
  }

  private drawPaperFlecks(flecks: PaperFleck[]): void {
    flecks.forEach((fleck) => {
      this.context.save();
      this.context.translate(fleck.x, fleck.y);
      this.context.rotate(fleck.rotation);
      this.context.globalAlpha = fleck.opacity;
      this.context.fillStyle = fleck.playerId === 0 ? COLORS.coral : COLORS.blue;
      this.context.fillRect(-fleck.width / 2, -fleck.height / 2, fleck.width, fleck.height);
      this.context.restore();
    });
  }

  private drawRegistrationMarks(): void {
    this.context.globalAlpha = 0.13;
    this.context.fillStyle = COLORS.ink;
    for (let x = 24; x < WORLD_WIDTH; x += 83) {
      const y = 72 + ((x * 17) % 250);
      this.context.fillRect(x, y, 2, 2);
    }
    this.context.globalAlpha = 1;
    this.context.fillStyle = '#E9D9BB';
    this.context.fillRect(0, 488, WORLD_WIDTH, 52);
  }

  private drawHazards(): void {
    this.context.fillStyle = COLORS.warning;
    for (let x = 180; x < 815; x += 24) {
      this.context.beginPath();
      this.context.moveTo(x, 518);
      this.context.lineTo(x + 12, 492);
      this.context.lineTo(x + 24, 518);
      this.context.fill();
    }
    this.context.fillStyle = COLORS.ink;
    this.context.font = '700 14px Verdana, sans-serif';
    this.context.fillText('FALL = RESET', 397, 532);
  }

  private drawCourse(): void {
    this.state.course.platforms.forEach((platform, index) => {
      this.context.fillStyle = index % 2 === 0 ? COLORS.coral : COLORS.blue;
      this.context.fillRect(platform.x + 5, platform.y + 6, platform.width, platform.height);
      this.context.fillStyle = COLORS.ink;
      this.context.fillRect(platform.x, platform.y, platform.width, platform.height);
      this.context.fillStyle = COLORS.lime;
      this.context.fillRect(platform.x + 8, platform.y, Math.min(42, platform.width - 16), 5);
    });

    this.state.course.anchors.forEach((anchor) => {
      this.context.strokeStyle = COLORS.ink;
      this.context.lineWidth = 7;
      this.context.beginPath();
      this.context.arc(anchor.x, anchor.y, 15, 0, Math.PI * 2);
      this.context.stroke();
      this.context.strokeStyle = COLORS.lime;
      this.context.lineWidth = 4;
      this.context.beginPath();
      this.context.arc(anchor.x + 3, anchor.y - 2, 15, 0, Math.PI * 2);
      this.context.stroke();
    });

    const finishPlatform = this.state.course.platforms.at(-1);
    if (finishPlatform) {
      const top = finishPlatform.y - 104;
      this.context.fillStyle = COLORS.ink;
      this.context.fillRect(this.state.course.finishX, top, 7, 104);
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 3; column += 1) {
          this.context.fillStyle = (row + column) % 2 === 0 ? COLORS.paper : COLORS.ink;
          this.context.fillRect(this.state.course.finishX + 7 + column * 12, top + row * 12, 12, 12);
        }
      }
    }
  }

  private drawPlayer(player: Player, alpha: number): void {
    const x = player.previousX + (player.x - player.previousX) * alpha;
    const y = player.previousY + (player.y - player.previousY) * alpha;
    const color = player.id === 0 ? COLORS.coral : COLORS.blue;
    if (player.grappling !== null) {
      const anchor = this.state.course.anchors[player.grappling];
      if (anchor) {
        this.context.strokeStyle = color;
        this.context.lineWidth = 4;
        this.context.beginPath();
        this.context.moveTo(x + player.width / 2, y + 8);
        this.context.lineTo(anchor.x, anchor.y);
        this.context.stroke();
      }
    }
    this.context.fillStyle = COLORS.ink;
    this.context.fillRect(x + 4, y + 4, player.width, player.height);
    this.context.fillStyle = color;
    this.context.fillRect(x, y, player.width, player.height);
    this.context.fillStyle = COLORS.paper;
    this.context.font = '700 13px Verdana, sans-serif';
    this.context.textAlign = 'center';
    this.context.fillText(`P${player.id + 1}`, x + player.width / 2, y + 24);
    this.context.textAlign = 'start';
    if (player.dashTime > 0) {
      this.context.fillStyle = COLORS.lime;
      this.context.fillRect(x - Math.sign(player.vx || 1) * 18, y + 14, 15, 7);
    }
  }

  private drawCanvasStatus(): void {
    this.context.fillStyle = COLORS.ink;
    this.context.font = '700 15px ui-monospace, monospace';
    this.context.fillText(this.state.demo ? 'SAMPLE · CLUB-7' : `COURSE · ${this.state.seed}`, 22, 30);
    if (this.state.phase === 'countdown') {
      this.context.fillStyle = COLORS.ink;
      this.context.font = '900 74px Arial Black, sans-serif';
      this.context.textAlign = 'center';
      this.context.fillText(String(Math.max(1, Math.ceil(this.state.countdown))), WORLD_WIDTH / 2, 190);
      this.context.textAlign = 'start';
    }
  }

  start(): void {
    this.audio.enable();
    if (this.state.phase === 'paused') resumeGame(this.state);
    else startRound(this.state);
    this.canvas.focus();
    this.onChange(this.state, true);
  }

  advance(): void {
    this.audio.enable();
    nextRound(this.state);
    this.canvas.focus();
    this.onChange(this.state, true);
  }

  pause(): void {
    pauseGame(this.state);
    this.onChange(this.state, true);
  }

  togglePause(): void {
    if (this.state.phase === 'paused') {
      this.audio.enable();
      resumeGame(this.state);
      this.canvas.focus();
    } else {
      pauseGame(this.state);
    }
    this.onChange(this.state, true);
  }

  setSettings(settings: GameSettings): void {
    this.settings = settings;
  }

  setTouch(player: 0 | 1, control: ControlName, pressed: boolean): void {
    this.controls[player][control] = pressed;
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('blur', this.handleBlur);
    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('keyup', this.handleKeyUp);
    this.audio.close();
  }
}
