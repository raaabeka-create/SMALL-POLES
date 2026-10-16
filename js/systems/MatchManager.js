import { Player } from '../entities/Player.js';
import { Ball } from '../entities/Ball.js';

const MATCH_DURATION = 180;

export class MatchManager {
  constructor(sceneManager, input) {
    this.scene = sceneManager;
    this.input = input;
    this.players = [];
    this.ball = null;
    this.pitch = null;

    this.homeScore = 0;
    this.awayScore = 0;
    this.timeLeft = MATCH_DURATION;
    this.running = false;
    this.paused = false;
    this.goalLock = 0;
    this.stats = {
      homeShots: 0, awayShots: 0,
      homePasses: 0, awayPasses: 0,
      homeTackles: 0, awayTackles: 0,
    };

    this.onGoal = null;
    this.onMatchEnd = null;
    this.onScoreUpdate = null;
    this.humanTeam = 0;
    this.teamColour = 0x00a86b;
  }

  start(venueId, teamColour) {
    this.teamColour = teamColour || 0x00a86b;
    this.pitch = this.scene.loadVenue(venueId);
    this.homeScore = 0;
    this.awayScore = 0;
    this.timeLeft = MATCH_DURATION;
    this.running = true;
    this.paused = false;
    this.goalLock = 0;
    this.stats = { homeShots: 0, awayShots: 0, homePasses: 0, awayPasses: 0, homeTackles: 0, awayTackles: 0 };

    this.players.forEach(p => {
      if (p.mesh) this.scene.scene.remove(p.mesh);
    });
    if (this.ball && this.ball.mesh) {
      this.scene.scene.remove(this.ball.mesh);
      this.scene.scene.remove(this.ball.shadow);
    }

    this.ball = new Ball(this.scene.scene);
    this._spawnPlayers();
    this._kickoff();
  }

  _spawnPlayers() {
    this.players = [];
    const homeCol = this.teamColour;
    const awayCol = 0xc41e3a;

    const homePositions = [
      { x: 0, z: 6, num: 10, human: true },
      { x: -4, z: 9, num: 7 },
      { x: 4, z: 9, num: 9 },
    ];
    const awayPositions = [
      { x: 0, z: -6, num: 9 },
      { x: -4, z: -9, num: 8 },
      { x: 4, z: -9, num: 11 },
    ];

    for (const p of homePositions) {
      this.players.push(new Player(this.scene.scene, {
        team: 0, isHuman: p.human, number: p.num,
        colour: homeCol, x: p.x, z: p.z, facing: Math.PI,
      }));
    }
    for (const p of awayPositions) {
      this.players.push(new Player(this.scene.scene, {
        team: 1, isHuman: false, number: p.num,
        colour: awayCol, x: p.x, z: p.z, facing: 0,
      }));
    }
  }

  _kickoff() {
    this.ball.reset(0, 0);
    const homeSpots = [{ x: 0, z: 5 }, { x: -4, z: 8 }, { x: 4, z: 8 }];
    const awaySpots = [{ x: 0, z: -5 }, { x: -4, z: -8 }, { x: 4, z: -8 }];
    let hi = 0, ai = 0;
    for (const p of this.players) {
      if (p.team === 0) {
        p.position.set(homeSpots[hi].x, 0, homeSpots[hi].z);
        p.facing = Math.PI;
        p.velocity.set(0, 0, 0);
        p.hasBall = false;
        hi++;
      } else {
        p.position.set(awaySpots[ai].x, 0, awaySpots[ai].z);
        p.facing = 0;
        p.velocity.set(0, 0, 0);
        p.hasBall = false;
        ai++;
      }
    }
  }

  update(dt) {
    if (!this.running || this.paused) return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.running = false;
      if (this.onMatchEnd) this.onMatchEnd(this.homeScore, this.awayScore, this.stats);
      return;
    }

    this.goalLock = Math.max(0, this.goalLock - dt);

    const homeTeam = this.players.filter(p => p.team === 0);
    const awayTeam = this.players.filter(p => p.team === 1);

    for (const p of this.players) {
      const teammates = p.team === 0 ? homeTeam : awayTeam;
      const opponents = p.team === 0 ? awayTeam : homeTeam;
      p.update(dt, this.input, this.ball, this.pitch, teammates, opponents);
    }

    this.ball.update(dt, this.pitch);

    if (this.goalLock <= 0) {
      const scorer = this.pitch.checkGoal(this.ball);
      if (scorer === 0) {
        this.homeScore++;
        this.goalLock = 3.5;
        if (this.onGoal) this.onGoal(0, this.homeScore, this.awayScore);
        if (this.onScoreUpdate) this.onScoreUpdate(this.homeScore, this.awayScore);
        setTimeout(() => this._kickoff(), 2200);
      } else if (scorer === 1) {
        this.awayScore++;
        this.goalLock = 3.5;
        if (this.onGoal) this.onGoal(1, this.homeScore, this.awayScore);
        if (this.onScoreUpdate) this.onScoreUpdate(this.homeScore, this.awayScore);
        setTimeout(() => this._kickoff(), 2200);
      }
    }

    this.scene.updateCamera(this.ball, this.players, dt);
  }

  togglePause() {
    if (!this.running) return;
    this.paused = !this.paused;
  }

  getHumanStamina() {
    const h = this.players.find(p => p.isHuman);
    return h ? h.stamina : 1;
  }

  getTimeString() {
    const m = Math.floor(this.timeLeft / 60);
    const s = Math.floor(this.timeLeft % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
