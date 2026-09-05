import type { Player } from './model';

export interface PaperFleck {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  playerId: Player['id'];
}

export interface MovementEffectFrame {
  shakeX: number;
  flecks: PaperFleck[];
}

type EffectPlayer = Pick<Player, 'id' | 'x' | 'y' | 'width' | 'height' | 'vx' | 'dashTime'>;

export function movementEffectFrame(
  players: readonly EffectPlayer[],
  enabled: boolean,
  reducedMotion: boolean,
  timeMs: number,
): MovementEffectFrame {
  const dashing = players.filter((player) => player.dashTime > 0);
  if (!enabled || reducedMotion || dashing.length === 0) return { shakeX: 0, flecks: [] };

  const flecks = dashing.flatMap((player) => {
    const direction = Math.sign(player.vx) || 1;
    const tail = direction > 0 ? player.x - 5 : player.x + player.width + 5;
    const phase = (timeMs / 13) % 11;
    return Array.from({ length: 5 }, (_, index): PaperFleck => {
      const distance = 5 + phase + index * 7;
      return {
        x: tail - direction * distance,
        y: player.y + player.height * 0.35 + ((index * 11 + player.id * 7) % 21) - 10,
        width: 5 + (index % 2) * 3,
        height: 3 + ((index + 1) % 2) * 2,
        rotation: direction * (index - 2) * 0.13,
        opacity: 0.82 - index * 0.11,
        playerId: player.id,
      };
    });
  });

  return {
    shakeX: Math.sin(timeMs * 0.18) * 2.5,
    flecks,
  };
}
