/**
 * SMALL POLES — Entry point
 */
import { SceneManager } from './engine/SceneManager.js';
import { MatchManager } from './systems/MatchManager.js';
import { InputManager } from './utils/input.js';
import { UIManager } from './ui/UIManager.js';

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ui = new UIManager();
    this.input = new InputManager();
    this.scene = null;
    this.match = null;
    this.lastTime = 0;
    this.raf = null;
    this.state = 'boot';
  }

  async init() {
    this.ui.setLoadingProgress(0.1, 'Loading engine...');
    await this._delay(200);
    this.scene = new SceneManager(this.canvas);
    this.ui.setLoadingProgress(0.5, 'Building scene...');
    await this._delay(150);
    this.match = new MatchManager(this.scene, this.input);
    this._wireCallbacks();
    this.ui.setLoadingProgress(0.85, 'Almost ready...');
    await this._delay(200);
    this.ui.setLoadingProgress(1, 'Ready!');
    await this._delay(300);

    const seen = localStorage.getItem('sp_tutorial');
    if (!seen) {
      this.ui.showScreen('tutorial');
      this.ui.on('skip-tutorial', () => {
        localStorage.setItem('sp_tutorial', '1');
        this.ui.showScreen('menu');
        this.state = 'menu';
      });
    } else {
      this.ui.showScreen('menu');
      this.state = 'menu';
    }
    this._loop(0);
  }

  _wireCallbacks() {
    this.ui.on('quick-match', () => { this.ui.showScreen('select'); this.state = 'select'; });
    this.ui.on('street-tour', () => { this.ui.showScreen('select'); this.state = 'select'; });
    this.ui.on('training', () => { this.ui.showScreen('select'); this.state = 'select'; });
    this.ui.on('settings', () => {
      alert('Controls:\nWASD Move | Shift Sprint\nJ/E Pass | K/Space Shoot | L/F Tackle | Esc Pause');
    });
    this.ui.on('back-menu', () => {
      this.ui.showScreen('menu');
      this.state = 'menu';
      this.match.running = false;
    });
    this.ui.on('start-match', () => this._startMatch());
    this.ui.on('resume', () => {
      this.match.paused = false;
      this.ui.showPause(false);
      this.state = 'playing';
    });
    this.ui.on('restart', () => this._startMatch());
    this.ui.on('pause-match', () => {
      if (this.state === 'playing') {
        this.match.togglePause();
        this.ui.showPause(true);
        this.state = 'paused';
      }
    });
    this.ui.on('quit-menu', () => {
      this.match.running = false;
      this.match.paused = false;
      this.ui.showPause(false);
      this.ui.hideHUD();
      this.ui.showScreen('menu');
      this.state = 'menu';
    });
    this.ui.on('rematch', () => this._startMatch());

    this.match.onGoal = (team) => {
      this.ui.showGoal(team);
      this.ui.updateScore(this.match.homeScore, this.match.awayScore);
    };
    this.match.onScoreUpdate = (h, a) => this.ui.updateScore(h, a);
    this.match.onMatchEnd = (h, a, stats) => {
      this.state = 'result';
      this.ui.showResult(h, a, stats);
    };
  }

  _startMatch() {
    const { venue, colour } = this.ui.getSelection();
    this.match.start(venue, colour);
    this.ui.showHUD();
    this.ui.updateScore(0, 0);
    this.ui.showPause(false);
    this.state = 'playing';
  }

  _loop(time) {
    this.raf = requestAnimationFrame((t) => this._loop(t));
    const dt = Math.min(0.05, (time - this.lastTime) / 1000) || 0.016;
    this.lastTime = time;
    this.input.update(dt);

    if (this.state === 'playing') {
      if (this.input.consumePause()) {
        this.match.togglePause();
        this.ui.showPause(this.match.paused);
        this.state = this.match.paused ? 'paused' : 'playing';
      }
      this.match.update(dt);
      this.ui.updateTimer(this.match.getTimeString());
      this.ui.updateStamina(this.match.getHumanStamina());
    } else if (this.state === 'paused') {
      if (this.input.consumePause()) {
        this.match.paused = false;
        this.ui.showPause(false);
        this.state = 'playing';
      }
    }

    if (this.scene) this.scene.render();
  }

  _delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
}

const game = new Game();
game.init().catch(err => {
  console.error('Failed to start SMALL POLES:', err);
  document.getElementById('loading-text').textContent = 'Error loading game. Check console.';
});
