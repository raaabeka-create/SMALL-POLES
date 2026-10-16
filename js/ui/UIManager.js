const VENUES = [
  { id: 'accra', name: 'Accra Street Court', desc: 'Concrete pitch • Neighbourhood energy' },
  { id: 'jamestown', name: 'Jamestown Coast', desc: 'Coastal breeze • Packed sidelines' },
  { id: 'kumasi', name: 'Kumasi Community', desc: 'Garden city pride • Tight space' },
];

const COLOURS = [
  { hex: 0x00a86b, css: '#00a86b', name: 'Emerald' },
  { hex: 0x1e90ff, css: '#1e90ff', name: 'Blue' },
  { hex: 0xf5a623, css: '#f5a623', name: 'Gold' },
  { hex: 0x9b59b6, css: '#9b59b6', name: 'Purple' },
  { hex: 0xffffff, css: '#f0f0f0', name: 'White' },
];

export class UIManager {
  constructor() {
    this.selectedVenue = 'accra';
    this.selectedColour = COLOURS[0];
    this.callbacks = {};
    this._cacheDom();
    this._bindButtons();
    this._buildSelectUI();
  }

  _cacheDom() {
    this.screens = {
      loading: document.getElementById('loading-screen'),
      menu: document.getElementById('main-menu'),
      select: document.getElementById('select-screen'),
      result: document.getElementById('result-screen'),
      tutorial: document.getElementById('tutorial'),
    };
    this.hud = document.getElementById('game-hud');
    this.homeScore = document.getElementById('home-score');
    this.awayScore = document.getElementById('away-score');
    this.timer = document.getElementById('match-timer');
    this.staminaFill = document.getElementById('stamina-fill');
    this.goalBanner = document.getElementById('goal-banner');
    this.goalScorer = document.getElementById('goal-scorer');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.mobileControls = document.getElementById('mobile-controls');
    this.loadingFill = document.getElementById('loading-fill');
    this.loadingText = document.getElementById('loading-text');
  }

  _bindButtons() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (this.callbacks[action]) this.callbacks[action]();
      });
    });
  }

  on(action, fn) {
    this.callbacks[action] = fn;
  }

  _buildSelectUI() {
    const grid = document.getElementById('venue-grid');
    grid.innerHTML = '';
    VENUES.forEach(v => {
      const card = document.createElement('div');
      card.className = 'venue-card' + (v.id === this.selectedVenue ? ' selected' : '');
      card.innerHTML = `<strong>${v.name}</strong><span>${v.desc}</span>`;
      card.addEventListener('click', () => {
        this.selectedVenue = v.id;
        grid.querySelectorAll('.venue-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
      grid.appendChild(card);
    });

    const row = document.getElementById('team-colours');
    row.innerHTML = '';
    COLOURS.forEach((c, i) => {
      const sw = document.createElement('div');
      sw.className = 'colour-swatch' + (i === 0 ? ' selected' : '');
      sw.style.background = c.css;
      sw.title = c.name;
      sw.addEventListener('click', () => {
        this.selectedColour = c;
        row.querySelectorAll('.colour-swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
      });
      row.appendChild(sw);
    });
  }

  setLoadingProgress(p, text) {
    if (this.loadingFill) this.loadingFill.style.width = `${Math.round(p * 100)}%`;
    if (this.loadingText && text) this.loadingText.textContent = text;
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => s && s.classList.remove('active'));
    if (this.screens[name]) this.screens[name].classList.add('active');
    this.hud.classList.add('hidden');
    this.pauseOverlay.classList.add('hidden');
  }

  showHUD() {
    Object.values(this.screens).forEach(s => s && s.classList.remove('active'));
    this.hud.classList.remove('hidden');
    if (window.matchMedia('(max-width: 767px), (pointer: coarse)').matches) {
      this.mobileControls.classList.remove('hidden');
    }
  }

  hideHUD() {
    this.hud.classList.add('hidden');
    this.mobileControls.classList.add('hidden');
  }

  updateScore(home, away) {
    this.homeScore.textContent = home;
    this.awayScore.textContent = away;
  }

  updateTimer(str) {
    this.timer.textContent = str;
  }

  updateStamina(v) {
    this.staminaFill.style.width = `${Math.round(v * 100)}%`;
    this.staminaFill.classList.toggle('low', v < 0.25);
  }

  showGoal(team) {
    this.goalBanner.classList.remove('hidden');
    this.goalScorer.textContent = team === 0 ? 'HOME' : 'AWAY';
    setTimeout(() => this.goalBanner.classList.add('hidden'), 2200);
  }

  showPause(show) {
    this.pauseOverlay.classList.toggle('hidden', !show);
  }

  showResult(home, away, stats) {
    this.hideHUD();
    document.getElementById('final-home').textContent = home;
    document.getElementById('final-away').textContent = away;
    const title = document.getElementById('result-title');
    if (home > away) title.textContent = 'Victory!';
    else if (away > home) title.textContent = 'Defeat';
    else title.textContent = 'Draw';

    const grid = document.getElementById('match-stats');
    grid.innerHTML = `
      <div class="stat-item"><span>Home Goals</span>${home}</div>
      <div class="stat-item"><span>Away Goals</span>${away}</div>
      <div class="stat-item"><span>Shots</span>${stats.homeShots + stats.awayShots}</div>
      <div class="stat-item"><span>Duration</span>3:00</div>
    `;
    this.showScreen('result');
  }

  getSelection() {
    return {
      venue: this.selectedVenue,
      colour: this.selectedColour.hex,
    };
  }
}
