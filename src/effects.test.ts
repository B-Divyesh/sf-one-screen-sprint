import { describe, expect, it } from 'vitest';
import { movementEffectFrame } from './effects';
import { createGame } from './model';

describe('movement effects', () => {
  it('@claim:movement-effects adds directional paper flecks and shake only when movement effects are allowed', () => {
    const player = createGame('EFFECT-1').players[0];
    player.x = 240;
    player.vx = 455;
    player.dashTime = 0.1;

    const active = movementEffectFrame([player], true, false, 120);
    expect(Math.abs(active.shakeX)).toBeGreaterThan(0);
    expect(active.flecks).toHaveLength(5);
    expect(active.flecks.every((fleck) => fleck.x < player.x && fleck.playerId === 0)).toBe(true);

    expect(movementEffectFrame([player], false, false, 120)).toEqual({ shakeX: 0, flecks: [] });
    expect(movementEffectFrame([player], true, true, 120)).toEqual({ shakeX: 0, flecks: [] });
  });
});
