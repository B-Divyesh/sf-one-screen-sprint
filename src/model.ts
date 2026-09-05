export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;
export const ROUND_SECONDS = 75;
export const FIXED_STEP = 1 / 60;

export type PlayerId = 0 | 1;
export type Phase = 'ready' | 'countdown' | 'playing' | 'paused' | 'round-over' | 'match-over';

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Anchor {
  x: number;
  y: number;
}

export interface Course {
  platforms: Platform[];
  anchors: Anchor[];
  finishX: number;
}

export interface Controls {
  left: boolean;
  right: boolean;
  up: boolean;
  dash: boolean;
}

export interface Player {
  id: PlayerId;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  upHeld: boolean;
  dashCooldown: number;
  dashTime: number;
  checkpointX: number;
  checkpointY: number;
  grappling: number | null;
  falls: number;
}

export interface GameSettings {
  muted: boolean;
  effects: boolean;
  assist: boolean;
}

export interface GameState {
  seed: string;
  course: Course;
  players: [Player, Player];
  score: [number, number];
  round: number;
  timeLeft: number;
  countdown: number;
  phase: Phase;
  previousPhase: Phase;
  roundWinner: PlayerId | null;
  matchWinner: PlayerId | null;
  finishReason: 'gate' | 'distance' | null;
  demo: boolean;
}

function xmur3(text: string): number {
  let hash = 1779033703 ^ text.length;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return (hash ^ (hash >>> 16)) >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCourse(seed: string): Course {
  const random = mulberry32(xmur3(seed));
  const positions = [0, 205, 365, 525, 675, 815];
  const widths = [180, 128, 132, 118, 114, 145];
  const platforms = positions.map((x, index): Platform => {
    if (index === 0) return { x, y: 454, width: widths[index] ?? 180, height: 24 };
    if (index === positions.length - 1) {
      return { x, y: 400 - Math.floor(random() * 38), width: widths[index] ?? 145, height: 24 };
    }
    const base = index % 2 === 0 ? 385 : 425;
    return {
      x: x + Math.floor(random() * 12),
      y: base - Math.floor(random() * 54),
      width: (widths[index] ?? 120) + Math.floor(random() * 20),
      height: 24,
    };
  });
  const anchors = platforms.slice(1, -1).map((platform, index) => ({
    x: platform.x + platform.width * (index % 2 === 0 ? 0.76 : 0.42),
    y: Math.max(108, platform.y - 122 - Math.floor(random() * 35)),
  }));
  return { platforms, anchors, finishX: 914 };
}

function createPlayer(id: PlayerId): Player {
  const x = 54 + id * 42;
  const y = 414;
  return {
    id,
    x,
    y,
    previousX: x,
    previousY: y,
    vx: 0,
    vy: 0,
    width: 26,
    height: 38,
    grounded: true,
    upHeld: false,
    dashCooldown: 0,
    dashTime: 0,
    checkpointX: x,
    checkpointY: y,
    grappling: null,
    falls: 0,
  };
}

export function createGame(seed: string, demo = false): GameState {
  return {
    seed,
    course: createCourse(seed),
    players: [createPlayer(0), createPlayer(1)],
    score: demo ? [1, 1] : [0, 0],
    round: demo ? 3 : 1,
    timeLeft: ROUND_SECONDS,
    countdown: 0,
    phase: 'ready',
    previousPhase: 'ready',
    roundWinner: null,
    matchWinner: null,
    finishReason: null,
    demo,
  };
}

export function startRound(state: GameState): void {
  if (state.phase !== 'ready' && state.phase !== 'round-over') return;
  state.players = [createPlayer(0), createPlayer(1)];
  state.timeLeft = ROUND_SECONDS;
  state.countdown = 2.15;
  state.roundWinner = null;
  state.finishReason = null;
  state.phase = 'countdown';
}

export function pauseGame(state: GameState): void {
  if (state.phase === 'playing' || state.phase === 'countdown') {
    state.previousPhase = state.phase;
    state.phase = 'paused';
  }
}

export function resumeGame(state: GameState): void {
  if (state.phase === 'paused') state.phase = state.previousPhase === 'countdown' ? 'countdown' : 'playing';
}

export function nextRound(state: GameState): void {
  if (state.phase !== 'round-over') return;
  state.round += 1;
  state.phase = 'ready';
  startRound(state);
}

function chooseAnchor(player: Player, course: Course): number | null {
  let result: number | null = null;
  let nearest = 205;
  course.anchors.forEach((anchor, index) => {
    const distance = Math.hypot(anchor.x - (player.x + player.width / 2), anchor.y - player.y);
    if (distance < nearest && anchor.y < player.y + 8) {
      result = index;
      nearest = distance;
    }
  });
  return result;
}

function platformUnder(player: Player, course: Course): Platform | undefined {
  const foot = player.x + player.width / 2;
  return course.platforms.find((platform) => (
    foot >= platform.x && foot <= platform.x + platform.width &&
    Math.abs(player.y + player.height - platform.y) < 4
  ));
}

function respawn(player: Player): void {
  player.x = player.checkpointX;
  player.y = player.checkpointY;
  player.previousX = player.x;
  player.previousY = player.y;
  player.vx = 0;
  player.vy = 0;
  player.grappling = null;
  player.falls += 1;
}

function updatePlayer(player: Player, controls: Controls, course: Course, settings: GameSettings, dt: number): void {
  player.previousX = player.x;
  player.previousY = player.y;
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);

  const direction = Number(controls.right) - Number(controls.left);
  const targetVelocity = direction * (settings.assist ? 280 : 245);
  const acceleration = player.grounded ? 1900 : 1050;
  const velocityDifference = targetVelocity - player.vx;
  player.vx += Math.max(-acceleration * dt, Math.min(acceleration * dt, velocityDifference));

  const support = player.grounded ? platformUnder(player, course) : undefined;
  const nearRightEdge = support && direction > 0 && support.x + support.width - (player.x + player.width) < 34;
  const nearLeftEdge = support && direction < 0 && player.x - support.x < 34;
  const shouldAssistJump = settings.assist && Boolean(nearRightEdge || nearLeftEdge);

  if ((controls.up && !player.upHeld && player.grounded) || shouldAssistJump) {
    player.vy = -565;
    player.grounded = false;
  }

  if (controls.up && !player.grounded) {
    player.grappling = chooseAnchor(player, course);
  } else {
    player.grappling = null;
  }

  if (player.grappling !== null) {
    const anchor = course.anchors[player.grappling];
    if (anchor) {
      const centerX = player.x + player.width / 2;
      const centerY = player.y + player.height / 2;
      const dx = anchor.x - centerX;
      const dy = anchor.y - centerY;
      const length = Math.max(1, Math.hypot(dx, dy));
      player.vx += (dx / length) * 720 * dt;
      player.vy += (dy / length) * 610 * dt;
    }
  }

  if (controls.dash && player.dashCooldown <= 0) {
    const dashDirection = direction || (player.vx < 0 ? -1 : 1);
    player.vx = dashDirection * 455;
    player.vy *= 0.35;
    player.dashCooldown = 0.9;
    player.dashTime = 0.13;
  }

  player.upHeld = controls.up;
  player.vy += (player.grappling === null ? 1510 : 760) * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.width, player.x));

  const oldBottom = player.previousY + player.height;
  const newBottom = player.y + player.height;
  player.grounded = false;
  if (player.vy >= 0) {
    const landing = course.platforms.find((platform) => (
      player.x + player.width > platform.x + 2 &&
      player.x < platform.x + platform.width - 2 &&
      oldBottom <= platform.y + 5 &&
      newBottom >= platform.y
    ));
    if (landing) {
      player.y = landing.y - player.height;
      player.vy = 0;
      player.grounded = true;
      player.grappling = null;
      player.checkpointX = Math.max(landing.x + 12, Math.min(player.x, landing.x + landing.width - player.width - 12));
      player.checkpointY = landing.y - player.height;
    }
  }

  if (player.y > WORLD_HEIGHT + 24) respawn(player);
}

function finishRound(state: GameState, winner: PlayerId, reason: 'gate' | 'distance'): void {
  if (state.phase !== 'playing') return;
  state.roundWinner = winner;
  state.score[winner] += 1;
  state.finishReason = reason;
  if (state.score[winner] >= 3) {
    state.matchWinner = winner;
    state.phase = 'match-over';
  } else {
    state.phase = 'round-over';
  }
}

export function stepGame(
  state: GameState,
  controls: [Controls, Controls],
  settings: GameSettings,
  dt = FIXED_STEP,
): void {
  if (state.phase === 'countdown') {
    state.countdown = Math.max(0, state.countdown - dt);
    if (state.countdown === 0) state.phase = 'playing';
    return;
  }
  if (state.phase !== 'playing') return;

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  updatePlayer(state.players[0], controls[0], state.course, settings, dt);
  updatePlayer(state.players[1], controls[1], state.course, settings, dt);

  const finishers = state.players.filter((player) => player.x + player.width >= state.course.finishX);
  if (finishers.length > 0) {
    const winner = finishers.sort((a, b) => b.x - a.x)[0];
    if (winner) finishRound(state, winner.id, 'gate');
    return;
  }

  if (state.timeLeft === 0) {
    const [first, second] = state.players;
    if (first.x === second.x) {
      state.timeLeft = 10;
      return;
    }
    finishRound(state, first.x > second.x ? 0 : 1, 'distance');
  }
}

export function courseSignature(course: Course): string {
  return course.platforms.map((platform) => `${platform.x}:${platform.y}:${platform.width}`).join('|');
}

export function emptyControls(): Controls {
  return { left: false, right: false, up: false, dash: false };
}
