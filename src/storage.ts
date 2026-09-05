import type { GameSettings, GameState } from './model';

const REAL_PREFIX = 'one-screen-sprint:';
const DEMO_PREFIX = 'demo:one-screen-sprint:';

export const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  effects: true,
  assist: false,
};

function prefix(demo: boolean): string {
  return demo ? DEMO_PREFIX : REAL_PREFIX;
}

export function loadSettings(demo: boolean): GameSettings {
  try {
    const raw = localStorage.getItem(`${prefix(demo)}settings`);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const value = JSON.parse(raw) as Partial<GameSettings>;
    return {
      muted: typeof value.muted === 'boolean' ? value.muted : DEFAULT_SETTINGS.muted,
      effects: typeof value.effects === 'boolean' ? value.effects : DEFAULT_SETTINGS.effects,
      assist: typeof value.assist === 'boolean' ? value.assist : DEFAULT_SETTINGS.assist,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(demo: boolean, settings: GameSettings): void {
  localStorage.setItem(`${prefix(demo)}settings`, JSON.stringify(settings));
}

export function loadGame(demo: boolean): GameState | null {
  try {
    const raw = localStorage.getItem(`${prefix(demo)}game`);
    if (!raw) return null;
    const value = JSON.parse(raw) as GameState;
    if (
      typeof value.seed !== 'string' ||
      !Array.isArray(value.players) ||
      value.players.length !== 2 ||
      !Array.isArray(value.score) ||
      !value.course?.platforms
    ) return null;
    if (value.phase === 'playing' || value.phase === 'countdown') {
      value.previousPhase = value.phase;
      value.phase = 'paused';
    }
    return value;
  } catch {
    return null;
  }
}

export function saveGame(demo: boolean, state: GameState): void {
  localStorage.setItem(`${prefix(demo)}game`, JSON.stringify(state));
}

export function clearGame(demo: boolean): void {
  localStorage.removeItem(`${prefix(demo)}game`);
}

export function clearNamespace(demo: boolean): void {
  const selectedPrefix = prefix(demo);
  Object.keys(localStorage)
    .filter((key) => key.startsWith(selectedPrefix))
    .forEach((key) => localStorage.removeItem(key));
}

export function namespaceKeys(): { real: string[]; demo: string[] } {
  const keys = Object.keys(localStorage);
  return {
    real: keys.filter((key) => key.startsWith(REAL_PREFIX)),
    demo: keys.filter((key) => key.startsWith(DEMO_PREFIX)),
  };
}
