import './style.css';
import { GameController } from './game';
import { createGame, type GameSettings, type GameState } from './model';
import {
  clearNamespace,
  loadGame,
  loadSettings,
  saveGame,
  saveSettings,
} from './storage';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('App root is missing.');
const app: HTMLDivElement = appRoot;

let controller: GameController | null = null;
let focusHeadingAfterRender = false;

interface DemoHistoryState {
  demoSnapshot?: {
    game: string | null;
    settings: string | null;
  };
}

const routeMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'One Screen Sprint — Race on one keyboard',
    description: 'Race a friend through a 75-second obstacle course on one keyboard. First to three round wins takes the match.',
  },
  '/demo': {
    title: 'Demo — One Screen Sprint',
    description: 'Play a fixed sample match without changing your saved match or settings.',
  },
  '/privacy': {
    title: 'Privacy — One Screen Sprint',
    description: 'How One Screen Sprint stores match progress and settings in your browser.',
  },
  '/terms': {
    title: 'Terms — One Screen Sprint',
    description: 'The terms for playing the free One Screen Sprint browser game.',
  },
};

function isDemoRoute(): boolean {
  return location.pathname === '/demo' || new URLSearchParams(location.search).get('demo') === '1';
}

function saveDemoSnapshot(): void {
  if (!isDemoRoute()) return;
  const previous = (history.state ?? {}) as DemoHistoryState;
  history.replaceState({
    ...previous,
    demoSnapshot: {
      game: localStorage.getItem('demo:one-screen-sprint:game'),
      settings: localStorage.getItem('demo:one-screen-sprint:settings'),
    },
  }, '', `${location.pathname}${location.search}${location.hash}`);
}

function restoreDemoSnapshotAfterReload(): void {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  const snapshot = (history.state as DemoHistoryState | null)?.demoSnapshot;
  if (navigation?.type !== 'reload' || !snapshot) return;
  if (snapshot.game) localStorage.setItem('demo:one-screen-sprint:game', snapshot.game);
  if (snapshot.settings) localStorage.setItem('demo:one-screen-sprint:settings', snapshot.settings);
}

function shell(content: string, demo = false): string {
  return `
    <a class="skip-link" href="#main">Skip to game and page content</a>
    ${demo ? `
      <aside class="demo-banner" aria-label="Demo controls">
        <strong>Demo — sample data, nothing is saved</strong>
        <span>Weekend rematch · course CLUB-7</span>
        <button type="button" data-action="reset-demo">Reset demo</button>
        <a href="/" data-link data-action="start-real">Start for real</a>
      </aside>` : ''}
    <header class="site-header">
      <a class="wordmark" href="/" data-link aria-label="One Screen Sprint home">
        <span class="wordmark-number">2</span><span>One Screen Sprint</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/demo" data-link>Demo</a>
        <a href="/#how-it-works" data-link>How it works</a>
        <a href="/privacy" data-link>Privacy</a>
      </nav>
    </header>
    <main id="main">${content}</main>
    <footer class="site-footer">
      <p>Race a friend on one keyboard in rounds under 75 seconds.</p>
      <nav aria-label="Footer navigation">
        <a href="/privacy" data-link>Privacy</a>
        <a href="/terms" data-link>Terms</a>
        <a href="https://sociobot.in" rel="external">Built by Param Factory <span class="visually-hidden">(external site)</span></a>
      </nav>
      <p>Version 1.0.0 · Supporting image generated for this game.</p>
    </footer>
    <div class="route-announcer visually-hidden" aria-live="polite"></div>
  `;
}

function gamePage(demo: boolean): string {
  return shell(`
    <section class="hero" aria-labelledby="page-heading">
      <div class="hero-copy">
        <p class="eyebrow">Two players · one keyboard · first to three wins</p>
        <h1 id="page-heading" tabindex="-1">Race a friend on one keyboard</h1>
        <p class="audience">For two people together who want a short competitive game with readable controls and a new course each match.</p>
        <div class="hero-actions">
          ${demo
            ? '<button class="primary-action" type="button" data-action="start-sample">Start sample round</button><span>Continue the 1–1 sample match.</span>'
            : '<a class="primary-action" href="/demo" data-link>Try it with sample data</a><span>Loads a fixed 1–1 rematch.</span>'}
        </div>
        <ul class="plain-facts" aria-label="Game facts">
          <li>Two local players. No account or online opponent.</li>
          <li>75 seconds per round. First to three wins.</li>
          <li>Free. No ads. Works offline after the first visit.</li>
        </ul>
      </div>
      <section class="game-shell" aria-labelledby="game-heading">
        <div class="game-topline">
          <div>
            <p class="game-label" id="game-heading">${demo ? 'Weekend rematch · sample' : 'Local match'}</p>
            <p class="course-label" id="course-label">Course</p>
          </div>
          <div class="game-actions">
            <button type="button" data-action="pause">Pause</button>
            <button type="button" data-action="settings">Settings</button>
          </div>
        </div>
        <div class="scoreboard" aria-label="Match score">
          <p class="player-score player-one"><span>P1</span><strong id="score-one">0</strong><small>A D · W jump/grapple · S dash</small></p>
          <p class="round-clock"><span id="round-label">Round 1</span><strong id="time-left">75</strong><small>seconds</small></p>
          <p class="player-score player-two"><span>P2</span><strong id="score-two">0</strong><small>← → · ↑ jump/grapple · ↓ dash</small></p>
        </div>
        <div class="race-progress" aria-label="Course progress">
          <label>P1 <progress id="progress-one" max="100" value="5">5%</progress></label>
          <label>P2 <progress id="progress-two" max="100" value="10">10%</progress></label>
        </div>
        <div class="canvas-stage">
          <canvas id="race-canvas" width="960" height="540" tabindex="0" role="img" aria-label="Two-player obstacle race course" aria-describedby="game-summary controls-help">
            A one-screen obstacle course. Player one is coral and player two is blue. Reach the flag first.
          </canvas>
          <div class="game-overlay" id="game-overlay"></div>
        </div>
        <p id="game-summary" class="game-summary">The match is ready. Both players start at the left and race to the flag on the right.</p>
        <p id="game-announcement" class="visually-hidden" aria-live="polite"></p>
        <div class="touch-controls" aria-label="On-screen game controls">
          ${touchGroup(0, 'P1')}
          ${touchGroup(1, 'P2')}
        </div>
        <div class="game-foot">
          <p id="controls-help"><strong>Goal:</strong> Reach the checked flag first. Falling returns you to your last platform. Press Esc to pause.</p>
          <p><span id="fps-meter">— fps</span> · Fixed 60 Hz simulation</p>
        </div>
      </section>
    </section>
    <section class="how" id="how-it-works" aria-labelledby="how-heading">
      <div>
        <p class="section-number">01</p>
        <h2 id="how-heading">How to play</h2>
      </div>
      <ol>
        <li><strong>Share the keyboard.</strong> Player one uses WASD. Player two uses the arrow keys.</li>
        <li><strong>Cross the course.</strong> Jump, hold up near a ring to grapple, and press down to dash.</li>
        <li><strong>Win three rounds.</strong> A round ends at the flag or after 75 seconds. A new match makes a new course.</li>
      </ol>
    </section>
    <section class="boundaries" aria-labelledby="boundaries-heading">
      <div>
        <p class="section-number">02</p>
        <h2 id="boundaries-heading">What this game does not do</h2>
      </div>
      <div class="boundary-copy">
        <p>There is no online matchmaking, chat, account, advertising, payment, or public score table.</p>
        <p>Match progress and settings stay in this browser. Demo progress uses separate sample storage and is removed when you leave it.</p>
        <a href="/privacy" data-link>Read the privacy details</a>
      </div>
    </section>
    <dialog id="settings-dialog" aria-labelledby="settings-heading">
      <form method="dialog">
        <h2 id="settings-heading">Game settings</h2>
        <p>Changes apply to this browser.</p>
        <label class="setting-row"><input type="checkbox" name="muted" /> <span><strong>Mute sound</strong><small>Stops the short game tones.</small></span></label>
        <label class="setting-row"><input type="checkbox" name="effects" /> <span><strong>Movement effects</strong><small>Turns small shake and paper flecks on or off.</small></span></label>
        <label class="setting-row"><input type="checkbox" name="assist" /> <span><strong>Edge assist</strong><small>Jumps automatically near a platform edge.</small></span></label>
        <div class="dialog-actions">
          <button type="submit" value="cancel">Cancel</button>
          <button class="primary-action" type="submit" value="save">Save settings</button>
        </div>
      </form>
    </dialog>
  `, demo);
}

function touchGroup(player: 0 | 1, label: string): string {
  return `
    <div class="touch-group">
      <strong>${label}</strong>
      <button type="button" data-player="${player}" data-control="left" aria-label="${label} move left">←</button>
      <button type="button" data-player="${player}" data-control="right" aria-label="${label} move right">→</button>
      <button type="button" data-player="${player}" data-control="up" aria-label="${label} jump or grapple">↑</button>
      <button type="button" data-player="${player}" data-control="dash" aria-label="${label} dash">Dash</button>
    </div>`;
}

function privacyPage(): string {
  return shell(`
    <article class="text-page">
      <p class="eyebrow">Privacy</p>
      <h1 id="page-heading" tabindex="-1">See what this game stores</h1>
      <p class="lede">One Screen Sprint needs no account and sends no game or identity data to a server.</p>
      <h2>Data in this browser</h2>
      <p>The game saves the current match, mute choice, effects choice, and edge assist choice in local storage. This keeps a paused match available after a reload.</p>
      <h2>Demo data</h2>
      <p>The demo uses storage keys that begin with <code>demo:one-screen-sprint:</code>. It never reads or changes saved match data outside that namespace.</p>
      <h2>Network requests</h2>
      <p>The game loads its own files from this site. It has no analytics, advertising, account, or third-party game service.</p>
      <h2>Remove saved data</h2>
      <p>Use this button to remove the real match and settings stored by this site. Your demo data is separate.</p>
      <button class="danger-action" type="button" data-action="clear-real-data">Clear saved game</button>
      <p id="clear-status" role="status"></p>
      <h2>Privacy questions</h2>
      <p>Email <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a> with “One Screen Sprint” in the subject.</p>
    </article>
  `);
}

function termsPage(): string {
  return shell(`
    <article class="text-page">
      <p class="eyebrow">Terms</p>
      <h1 id="page-heading" tabindex="-1">Play the game fairly and safely</h1>
      <p class="lede">One Screen Sprint is a free local browser game for two people using one screen.</p>
      <h2>Use</h2>
      <p>You may play and share the game. Do not use it to break the site, disrupt other services, or violate applicable law.</p>
      <h2>Availability</h2>
      <p>The game is provided as available. Features may change, and saved browser data can be removed by browser controls.</p>
      <h2>Safety</h2>
      <p>Take breaks and stop if movement causes discomfort. Turn off Movement effects in Settings or use your device’s reduced-motion setting.</p>
      <h2>Contact</h2>
      <p>Email <a href="mailto:support@sociobot.in">support@sociobot.in</a> with questions about these terms.</p>
    </article>
  `);
}

function notFoundPage(): string {
  return shell(`
    <section class="not-found">
      <p class="section-number">404</p>
      <h1 id="page-heading" tabindex="-1">Find the race from the start</h1>
      <p>This address does not match a page in One Screen Sprint.</p>
      <a class="primary-action" href="/" data-link>Return to the game</a>
    </section>
  `);
}

function setRouteMeta(path: string): void {
  const meta = routeMeta[path] ?? {
    title: 'Page not found — One Screen Sprint',
    description: 'Return to the One Screen Sprint local two-player browser game.',
  };
  document.title = meta.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', meta.description);
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `https://one-screen-sprint.sociobot.in${path === '/' ? '/' : path}`;
}

function randomSeed(): string {
  const words = ['DASH', 'RING', 'FLAG', 'JUMP', 'RACE', 'INK'];
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  const first = values[0] ?? 0;
  const second = values[1] ?? 0;
  return `${words[first % words.length]}-${String(second % 100).padStart(2, '0')}`;
}

function summaryFor(state: GameState): string {
  const phaseText: Record<GameState['phase'], string> = {
    ready: 'The round is ready.',
    countdown: 'The round is counting down.',
    playing: 'The race is active.',
    paused: 'The match is paused.',
    'round-over': `Player ${(state.roundWinner ?? 0) + 1} won round ${state.round}.`,
    'match-over': `Player ${(state.matchWinner ?? 0) + 1} won the match ${state.score[0]} to ${state.score[1]}.`,
  };
  return `${phaseText[state.phase]} Player one has ${state.score[0]} rounds. Player two has ${state.score[1]} rounds. ${Math.ceil(state.timeLeft)} seconds remain.`;
}

function overlayFor(state: GameState): string {
  if (state.phase === 'playing') return '';
  if (state.phase === 'countdown') return '<div class="overlay-panel"><p>Get ready</p></div>';
  if (state.phase === 'paused') return '<div class="overlay-panel"><h2>Match paused</h2><button class="primary-action" type="button" data-action="resume">Resume match</button></div>';
  if (state.phase === 'round-over') {
    return `<div class="overlay-panel"><h2>Player ${(state.roundWinner ?? 0) + 1} wins round ${state.round}</h2><p>${state.finishReason === 'gate' ? 'Reached the flag first.' : 'Was farther ahead at time.'}</p><button class="primary-action" type="button" data-action="next-round">Start next round</button></div>`;
  }
  if (state.phase === 'match-over') {
    return `<div class="overlay-panel end-panel"><p class="result-label">Match complete</p><h2>Player ${(state.matchWinner ?? 0) + 1} wins ${state.score[0]}–${state.score[1]}</h2><p>${state.round} rounds played on ${state.seed}.</p><div><button class="primary-action" type="button" data-action="new-course">Race another course</button><button type="button" data-action="replay-course">Replay this course</button></div></div>`;
  }
  return `<div class="overlay-panel"><h2>${state.demo ? 'Continue the sample match' : 'Start the best-of-five'}</h2><p>Focus moves to the course. Use both sides of the keyboard.</p><button class="primary-action" type="button" data-action="start-round">${state.demo ? 'Start sample round' : 'Start match'}</button></div>`;
}

function mountGame(demo: boolean): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#race-canvas');
  const gameShell = document.querySelector<HTMLElement>('.game-shell');
  if (!canvas || !gameShell) return;
  let state = loadGame(demo) ?? createGame(demo ? 'CLUB-7' : randomSeed(), demo);
  let settings = loadSettings(demo);

  const updateUi = (nextState: GameState, urgent = false): void => {
    state = nextState;
    saveGame(demo, state);
    if (demo) saveDemoSnapshot();
    const scoreOne = document.querySelector('#score-one');
    const scoreTwo = document.querySelector('#score-two');
    const roundLabel = document.querySelector('#round-label');
    const timeLeft = document.querySelector('#time-left');
    const courseLabel = document.querySelector('#course-label');
    const progressOne = document.querySelector<HTMLProgressElement>('#progress-one');
    const progressTwo = document.querySelector<HTMLProgressElement>('#progress-two');
    const overlay = document.querySelector<HTMLDivElement>('#game-overlay');
    const summary = document.querySelector('#game-summary');
    if (scoreOne) scoreOne.textContent = String(state.score[0]);
    if (scoreTwo) scoreTwo.textContent = String(state.score[1]);
    if (roundLabel) roundLabel.textContent = `Round ${state.round} of 5`;
    if (timeLeft) timeLeft.textContent = String(Math.ceil(state.timeLeft));
    if (courseLabel) courseLabel.textContent = `Course ${state.seed}`;
    if (progressOne) progressOne.value = Math.round((state.players[0].x / state.course.finishX) * 100);
    if (progressTwo) progressTwo.value = Math.round((state.players[1].x / state.course.finishX) * 100);
    if (summary) summary.textContent = summaryFor(state);
    if (overlay) {
      overlay.innerHTML = overlayFor(state);
      overlay.hidden = state.phase === 'playing';
    }
    if (urgent) {
      const announcement = document.querySelector('#game-announcement');
      if (announcement) announcement.textContent = summaryFor(state);
    }
  };

  controller = new GameController({
    canvas,
    state,
    settings,
    onChange: updateUi,
    onFps: (fps) => {
      const meter = document.querySelector('#fps-meter');
      if (meter) meter.textContent = `${fps} fps`;
    },
  });
  updateUi(state);

  gameShell.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    const action = target?.dataset.action;
    if (!action) return;
    if (action === 'start-round' || action === 'resume' || action === 'start-sample') controller?.start();
    if (action === 'next-round') controller?.advance();
    if (action === 'pause') controller?.togglePause();
    if (action === 'settings') openSettings(settings, demo, (next) => {
      settings = next;
      controller?.setSettings(next);
    });
    if (action === 'new-course') {
      const next = createGame(demo ? `CLUB-${Math.floor(Math.random() * 89) + 10}` : randomSeed(), false);
      next.demo = demo;
      saveGame(demo, next);
      if (demo) saveDemoSnapshot();
      renderRoute();
    }
    if (action === 'replay-course') {
      const replay = createGame(state.seed, false);
      replay.demo = demo;
      saveGame(demo, replay);
      if (demo) saveDemoSnapshot();
      renderRoute();
    }
  });

  document.querySelector('[data-action="start-sample"]')?.addEventListener('click', () => controller?.start());

  document.querySelectorAll<HTMLButtonElement>('[data-player][data-control]').forEach((button) => {
    const player = button.dataset.player === '1' ? 1 : 0;
    const control = button.dataset.control as 'left' | 'right' | 'up' | 'dash';
    const press = (event: PointerEvent): void => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      controller?.setTouch(player, control, true);
    };
    const release = (): void => controller?.setTouch(player, control, false);
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
  });
}

function openSettings(current: GameSettings, demo: boolean, onSave: (settings: GameSettings) => void): void {
  const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog');
  if (!dialog) return;
  const form = dialog.querySelector<HTMLFormElement>('form');
  controller?.pause();
  const muted = dialog.querySelector<HTMLInputElement>('input[name="muted"]');
  const effects = dialog.querySelector<HTMLInputElement>('input[name="effects"]');
  const assist = dialog.querySelector<HTMLInputElement>('input[name="assist"]');
  if (!form || !muted || !effects || !assist) return;
  muted.checked = current.muted;
  effects.checked = current.effects;
  assist.checked = current.assist;
  dialog.showModal();
  form.addEventListener('submit', (event) => {
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value !== 'save' || !dialog.isConnected || demo !== isDemoRoute()) return;
    const next = { muted: muted.checked, effects: effects.checked, assist: assist.checked };
    saveSettings(demo, next);
    if (demo) saveDemoSnapshot();
    onSave(next);
    const announcement = document.querySelector('#game-announcement');
    if (announcement) announcement.textContent = 'Settings saved.';
  }, { once: true });
}

function bindGlobalActions(): void {
  document.querySelector('[data-action="reset-demo"]')?.addEventListener('click', () => {
    clearNamespace(true);
    renderRoute();
  });
  document.querySelector('[data-action="start-real"]')?.addEventListener('click', () => {
    clearNamespace(true);
  });
  document.querySelector('[data-action="clear-real-data"]')?.addEventListener('click', () => {
    if (!window.confirm('Clear the saved real match and all real game settings from this browser?')) return;
    clearNamespace(false);
    const status = document.querySelector('#clear-status');
    if (status) status.textContent = 'Saved match and settings removed.';
  });
}

function renderRoute(): void {
  controller?.destroy();
  controller = null;
  const path = location.pathname.replace(/\/$/, '') || '/';
  const demo = isDemoRoute();
  if (demo) restoreDemoSnapshotAfterReload();
  else clearNamespace(true);
  setRouteMeta(demo ? '/demo' : path);
  if (path === '/' || path === '/demo') app.innerHTML = gamePage(demo);
  else if (path === '/privacy') app.innerHTML = privacyPage();
  else if (path === '/terms') app.innerHTML = termsPage();
  else app.innerHTML = notFoundPage();
  bindGlobalActions();
  if (path === '/' || path === '/demo') mountGame(demo);
  if (focusHeadingAfterRender) {
    const heading = document.querySelector<HTMLElement>('h1');
    heading?.focus();
    const announcer = document.querySelector('.route-announcer');
    if (announcer && heading) announcer.textContent = heading.textContent;
    focusHeadingAfterRender = false;
  }
  if (location.hash) requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView());
}

document.addEventListener('click', (event) => {
  const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[data-link]');
  if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  if (isDemoRoute() && url.pathname !== '/demo') clearNamespace(true);
  history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  focusHeadingAfterRender = true;
  renderRoute();
});

window.addEventListener('popstate', () => {
  focusHeadingAfterRender = true;
  renderRoute();
});

window.addEventListener('pagehide', () => {
  if (!isDemoRoute()) return;
  saveDemoSnapshot();
  clearNamespace(true);
});

window.addEventListener('pageshow', (event) => {
  if (!event.persisted || !isDemoRoute()) return;
  clearNamespace(true);
  renderRoute();
});

renderRoute();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The game still works online if the browser blocks service workers.
    });
  });
}
