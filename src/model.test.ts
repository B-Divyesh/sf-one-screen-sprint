import { describe, expect, it } from 'vitest';
import {
  FIXED_STEP,
  ROUND_SECONDS,
  courseSignature,
  createCourse,
  createGame,
  emptyControls,
  nextRound,
  startRound,
  stepGame,
  type Controls,
  type GameSettings,
} from './model';

const settings: GameSettings = { muted: true, effects: false, assist: false };
const idle: [Controls, Controls] = [emptyControls(), emptyControls()];

function begin(state: ReturnType<typeof createGame>): void {
  startRound(state);
  for (let index = 0; index < 130; index += 1) stepGame(state, idle, settings, FIXED_STEP);
}

describe('deterministic match model', () => {
  it('@claim:fresh-course repeats same-seed geometry and changes geometry for a new match seed', () => {
    const first = createCourse('CLUB-7');
    const repeated = createCourse('CLUB-7');
    const next = createCourse('RING-42');
    expect(first).toEqual(repeated);
    expect(first.platforms).toHaveLength(6);
    expect(first.anchors.length).toBeGreaterThanOrEqual(3);
    expect(courseSignature(next)).not.toBe(courseSignature(first));
  });

  it('@claim:fixed-60hz-simulation advances an active race by one second in sixty simulation updates', () => {
    const game = createGame('CLOCK-60');
    begin(game);
    const initialTime = game.timeLeft;
    for (let tick = 0; tick < 60; tick += 1) stepGame(game, idle, settings);
    expect(game.phase).toBe('playing');
    expect(initialTime - game.timeLeft).toBeCloseTo(1, 10);
  });

  it('ends a best-of-five as soon as one player wins three rounds', () => {
    const game = createGame('TEST-1');
    for (let round = 0; round < 3; round += 1) {
      begin(game);
      game.players[0].x = game.course.finishX;
      stepGame(game, idle, settings);
      if (round < 2) nextRound(game);
    }
    expect(game.phase).toBe('match-over');
    expect(game.matchWinner).toBe(0);
    expect(game.score).toEqual([3, 0]);
    expect(game.round).toBe(3);
  });

  it('@claim:round-limit uses distance at the 75-second boundary and extends an exact tie', () => {
    const distanceGame = createGame('TIME-1');
    begin(distanceGame);
    distanceGame.players[0].x = 400;
    distanceGame.players[1].x = 300;
    distanceGame.timeLeft = FIXED_STEP / 2;
    stepGame(distanceGame, idle, settings);
    expect(distanceGame.phase).toBe('round-over');
    expect(distanceGame.finishReason).toBe('distance');

    const tieGame = createGame('TIME-2');
    begin(tieGame);
    tieGame.players[0].x = 300;
    tieGame.players[1].x = 300;
    tieGame.timeLeft = FIXED_STEP / 2;
    stepGame(tieGame, idle, settings);
    expect(tieGame.phase).toBe('playing');
    expect(tieGame.timeLeft).toBe(10);
  });

  it('starts each round with the full timer and reset player positions', () => {
    const game = createGame('RESET-1');
    begin(game);
    game.players[0].x = game.course.finishX;
    stepGame(game, idle, settings);
    nextRound(game);
    expect(game.timeLeft).toBe(ROUND_SECONDS);
    expect(game.players[0].x).toBe(54);
    expect(game.players[1].x).toBe(96);
    expect(game.phase).toBe('countdown');
  });

  it('@claim:control-actions makes jump, grapple, dash, and fall recovery change play', () => {
    const game = createGame('CONTROL-1');
    begin(game);
    const player = game.players[0];
    const active = { left: false, right: true, up: true, dash: true };
    stepGame(game, [active, emptyControls()], settings);
    expect(player.vx).toBeGreaterThan(400);
    expect(player.vy).toBeLessThan(0);
    expect(player.dashCooldown).toBeGreaterThan(0);
    const anchor = game.course.anchors[0];
    expect(anchor).toBeDefined();
    if (!anchor) return;
    player.x = anchor.x - player.width / 2;
    player.y = anchor.y + 90;
    player.grounded = false;
    stepGame(game, [{ ...active, dash: false }, emptyControls()], settings);
    expect(player.grappling).not.toBeNull();
    player.y = 700;
    stepGame(game, idle, settings);
    expect(player.y).toBe(player.checkpointY);
    expect(player.falls).toBe(1);
  });

  it('@claim:edge-assist jumps automatically near a platform edge without a jump key', () => {
    const assisted = createGame('ASSIST-1');
    const manual = createGame('ASSIST-1');
    begin(assisted);
    begin(manual);

    for (const game of [assisted, manual]) {
      const player = game.players[0];
      const platform = game.course.platforms[0];
      expect(platform).toBeDefined();
      if (!platform) return;
      player.x = platform.x + platform.width - player.width - 20;
      player.y = platform.y - player.height;
      player.previousX = player.x;
      player.previousY = player.y;
      player.vx = 0;
      player.vy = 0;
      player.grounded = true;
    }

    const moveRight = { left: false, right: true, up: false, dash: false };
    stepGame(assisted, [moveRight, emptyControls()], { ...settings, assist: true });
    stepGame(manual, [moveRight, emptyControls()], { ...settings, assist: false });

    expect(assisted.players[0].grounded).toBe(false);
    expect(assisted.players[0].vy).toBeLessThan(0);
    expect(manual.players[0].grounded).toBe(true);
    expect(manual.players[0].vy).toBe(0);
  });
});
