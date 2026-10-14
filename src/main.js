/**
 * SMALL POLES — local match prototype
 * Canvas game loop, input handling, lightweight player AI, and match state.
 * No backend credentials or external dependencies are required.
 */

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const introPanel = document.querySelector("#introPanel");
const gameSection = document.querySelector("#gameSection");
const howToPlay = document.querySelector("#howToPlay");
const startButton = document.querySelector("#startMatch");
const pauseButton = document.querySelector("#pauseMatch");
const restartButton = document.querySelector("#restartMatch");
const backButton = document.querySelector("#backToMenu");
const resumeButton = document.querySelector("#resumeMatch");
const playAgainButton = document.querySelector("#playAgain");
const resultMenuButton = document.querySelector("#resultMenu");
const pauseOverlay = document.querySelector("#pauseOverlay");
const resultOverlay = document.querySelector("#resultOverlay");
const homeScoreNode = document.querySelector("#homeScore");
const awayScoreNode = document.querySelector("#awayScore");
const clockNode = document.querySelector("#matchClock");
const matchTitle = document.querySelector("#matchTitle");
const resultHeadline = document.querySelector("#resultHeadline");
const resultSummary = document.querySelector("#resultSummary");
const resultScore = document.querySelector("#resultScore");
const matchHint = document.querySelector("#matchHint");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_RADIUS = 17;
const BALL_RADIUS = 8;
const GOAL_TOP = HEIGHT / 2 - 78;
const GOAL_BOTTOM = HEIGHT / 2 + 78;
const COLORS = {
  grass: "#235b35",
  grassLight: "#2a673d",
  line: "rgba(237, 242, 220, .72)",
  home: "#57d17a",
  homeDark: "#1c743d",
  away: "#ee574b",
  awayDark: "#a82e2b",
  ball: "#f8f6e9",
  ink: "#11160f",
  yellow: "#f2cb39"
};

const state = {
  phase: "menu",
  mode: 1,
  duration: 120,
  timeLeft: 120,
  homeScore: 0,
  awayScore: 0,
  players: [],
  ball: { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 },
  keys: new Set(),
  touch: new Set(),
  lastFrame: 0,
  elapsed: 0,
  lastShot: -10,
  lastCpuShot: -10,
  lastGoal: -10,
  goalFlash: 0,
  lastClockPaint: "",
  lastScorePaint: "",
  resultSavedThisMatch: false
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length < 0.001) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function selectedMode() {
  const selected = document.querySelector('input[name="matchMode"]:checked');
  return selected ? Number(selected.value) : 1;
}

function selectedDuration() {
  const select = document.querySelector("#matchDuration");
  return select ? Number(select.value) : 120;
}

function makePlayer(team, index, count) {
  const home = team === "home";
  const xBase = home ? 230 : WIDTH - 230;
  const offsets = count === 1 ? [0] : count === 2 ? [-66, 66] : [-108, 0, 108];
  const xOffset = count === 1 ? 0 : (index === 0 ? 0 : (index % 2 ? -24 : 24));
  return {
    id: team + "-" + index,
    team,
    index,
    x: xBase + xOffset,
    y: HEIGHT / 2 + offsets[index],
    vx: 0,
    vy: 0,
    facingX: home ? 1 : -1,
    facingY: 0,
    radius: PLAYER_RADIUS,
    speed: index === 0 && home ? 225 : 183,
    isUser: home && index === 0,
    aiThink: Math.random() * 0.25,
    shirtNumber: index + 1
  };
}

function resetMatch(mode, duration) {
  state.mode = mode;
  state.duration = duration;
  state.timeLeft = duration;
  state.homeScore = 0;
  state.awayScore = 0;
  state.elapsed = 0;
  state.lastShot = -10;
  state.lastCpuShot = -10;
  state.lastGoal = -10;
  state.goalFlash = 0;
  state.resultSavedThisMatch = false;
  state.players = [];
  for (let i = 0; i < mode; i += 1) {
    state.players.push(makePlayer("home", i, mode));
    state.players.push(makePlayer("away", i, mode));
  }
  resetPositions();
  state.lastClockPaint = "";
  state.lastScorePaint = "";
  updateHud();
}

function resetPositions() {
  const mode = state.mode;
  const homePlayers = state.players.filter(function (p) { return p.team === "home"; });
  const awayPlayers = state.players.filter(function (p) { return p.team === "away"; });
  const spread = mode === 1 ? [0] : mode === 2 ? [-62, 62] : [-100, 0, 100];

  homePlayers.forEach(function (p, i) {
    p.x = 220 + (i === 0 ? 0 : 35);
    p.y = HEIGHT / 2 + spread[i];
    p.vx = 0;
    p.vy = 0;
    p.facingX = 1;
    p.facingY = 0;
  });
  awayPlayers.forEach(function (p, i) {
    p.x = WIDTH - 220 - (i === 0 ? 0 : 35);
    p.y = HEIGHT / 2 + spread[i];
    p.vx = 0;
    p.vy = 0;
    p.facingX = -1;
    p.facingY = 0;
  });
  state.ball.x = WIDTH / 2;
  state.ball.y = HEIGHT / 2;
  state.ball.vx = 0;
  state.ball.vy = 0;
}

function startMatch() {
  resetMatch(selectedMode(), selectedDuration());
  state.phase = "playing";
  introPanel.hidden = true;
  howToPlay.hidden = true;
  gameSection.hidden = false;
  pauseOverlay.hidden = true;
  resultOverlay.hidden = true;
  pauseButton.textContent = "Ⅱ Pause";
  matchTitle.textContent = state.mode + "v" + state.mode + " STREET MATCH";
  matchHint.textContent = "Move into space. Get close to the ball, then shoot.";
  state.lastFrame = 0;
  requestAnimationFrame(gameLoop);
  gameSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function returnToMenu() {
  state.phase = "menu";
  state.keys.clear();
  state.touch.clear();
  gameSection.hidden = true;
  introPanel.hidden = false;
  howToPlay.hidden = false;
  pauseOverlay.hidden = true;
  resultOverlay.hidden = true;
  introPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  drawPitch();
}

function togglePause() {
  if (state.phase === "playing") {
    state.phase = "paused";
    pauseOverlay.hidden = false;
    pauseButton.textContent = "▶ Resume";
    state.keys.clear();
    state.touch.clear();
  } else if (state.phase === "paused") {
    state.phase = "playing";
    pauseOverlay.hidden = true;
    pauseButton.textContent = "Ⅱ Pause";
    state.lastFrame = 0;
    requestAnimationFrame(gameLoop);
  }
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0");
}

function updateHud() {
  const scoreText = state.homeScore + ":" + state.awayScore;
  if (state.lastScorePaint !== scoreText) {
    homeScoreNode.textContent = String(state.homeScore);
    awayScoreNode.textContent = String(state.awayScore);
    state.lastScorePaint = scoreText;
  }
  const clockText = formatTime(state.timeLeft);
  if (state.lastClockPaint !== clockText) {
    clockNode.textContent = clockText;
    state.lastClockPaint = clockText;
  }
}

function finishMatch() {
  if (state.phase === "finished") return;
  state.phase = "finished";
  state.timeLeft = 0;
  updateHud();
  state.keys.clear();
  state.touch.clear();

  if (state.homeScore > state.awayScore) {
    resultHeadline.textContent = "CAGE OWNED.";
    resultSummary.textContent = "The home side takes the win. Let them hear about it.";
    matchHint.textContent = "Full time — home side wins.";
  } else if (state.homeScore < state.awayScore) {
    resultHeadline.textContent = "NOT THIS TIME.";
    resultSummary.textContent = "The away side got the better of you. One more match?";
    matchHint.textContent = "Full time — away side wins.";
  } else {
    resultHeadline.textContent = "LEVEL PEGGING.";
    resultSummary.textContent = "No winner today. Settle it in a rematch.";
    matchHint.textContent = "Full time — it ends in a draw.";
  }
  resultScore.textContent = state.homeScore + " — " + state.awayScore;
  resultOverlay.hidden = false;
}

function scoreGoal(scoringTeam) {
  if (state.elapsed - state.lastGoal < 1.1) return;
  state.lastGoal = state.elapsed;
  state.goalFlash = 0.65;
  if (scoringTeam === "home") {
    state.homeScore += 1;
    matchHint.textContent = "GOAL! The home side finds the net.";
  } else {
    state.awayScore += 1;
    matchHint.textContent = "Goal for the away side. Get it back.";
  }
  updateHud();
  resetPositions();
}

function getUserDirection() {
  let x = 0;
  let y = 0;
  if (state.keys.has("ArrowLeft") || state.keys.has("KeyA") || state.touch.has("left")) x -= 1;
  if (state.keys.has("ArrowRight") || state.keys.has("KeyD") || state.touch.has("right")) x += 1;
  if (state.keys.has("ArrowUp") || state.keys.has("KeyW") || state.touch.has("up")) y -= 1;
  if (state.keys.has("ArrowDown") || state.keys.has("KeyS") || state.touch.has("down")) y += 1;
  return normalize(x, y);
}

function userShoot() {
  if (state.phase !== "playing" || state.elapsed - state.lastShot < 0.28) return;
  const player = state.players.find(function (p) { return p.isUser; });
  if (!player || distance(player, state.ball) > 56) {
    matchHint.textContent = "Get closer to the ball before shooting.";
    return;
  }
  let direction = getUserDirection();
  if (Math.hypot(direction.x, direction.y) < 0.1) {
    direction = normalize(WIDTH - 12 - state.ball.x, HEIGHT / 2 - state.ball.y);
    if (direction.x < 0.2) direction = { x: 1, y: 0 };
  }
  state.ball.vx = direction.x * 510 + player.vx * 0.45;
  state.ball.vy = direction.y * 510 + player.vy * 0.45;
  state.lastShot = state.elapsed;
  player.facingX = direction.x;
  player.facingY = direction.y;
  matchHint.textContent = "Shot away! Follow the ball.";
}

function moveUser(player, dt) {
  const direction = getUserDirection();
  const sprinting = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") || state.touch.has("sprint");
  const maxSpeed = player.speed * (sprinting ? 1.32 : 1);
  const acceleration = 950;
  player.vx += direction.x * acceleration * dt;
  player.vy += direction.y * acceleration * dt;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > maxSpeed) {
    player.vx = player.vx / speed * maxSpeed;
    player.vy = player.vy / speed * maxSpeed;
  }
  if (direction.x !== 0 || direction.y !== 0) {
    player.facingX = direction.x;
    player.facingY = direction.y;
  }
}

function nearestBallPlayer(team, excludeUser) {
  let chosen = null;
  let best = Infinity;
  state.players.forEach(function (p) {
    if (p.team !== team || (excludeUser && p.isUser)) return;
    const d = distance(p, state.ball);
    if (d < best) {
      best = d;
      chosen = p;
    }
  });
  return chosen;
}

function moveAI(player, dt) {
  const isHome = player.team === "home";
  const targetGoalX = isHome ? WIDTH - 16 : 16;
  const homeChaser = nearestBallPlayer("home", true);
  const awayChaser = nearestBallPlayer("away", false);
  let targetX = player.x;
  let targetY = player.y;
  const chaser = isHome ? homeChaser : awayChaser;
  const isChaser = chaser && chaser.id === player.id;
  const ballNear = distance(player, state.ball) < 260;

  if (isChaser || (isHome && ballNear && !player.isUser)) {
    targetX = state.ball.x + (isHome ? -15 : 15);
    targetY = state.ball.y;
  } else if (distance(player, state.ball) < 95) {
    targetX = state.ball.x;
    targetY = state.ball.y;
  } else {
    const lane = state.mode === 1 ? 0 : (player.index - (state.mode - 1) / 2) * 70;
    targetX = isHome ? clamp(state.ball.x - 100 - player.index * 18, 100, WIDTH / 2 - 70)
                     : clamp(state.ball.x + 100 + player.index * 18, WIDTH / 2 + 70, WIDTH - 100);
    targetY = clamp(state.ball.y + lane, 85, HEIGHT - 85);
    if (isHome && player.index > 0) targetX = Math.min(targetX, WIDTH * 0.43);
    if (!isHome && player.index > 0) targetX = Math.max(targetX, WIDTH * 0.57);
  }

  const direction = normalize(targetX - player.x, targetY - player.y);
  const speed = player.speed * (isChaser ? 1.02 : 0.82);
  player.vx += direction.x * 620 * dt;
  player.vy += direction.y * 620 * dt;
  const currentSpeed = Math.hypot(player.vx, player.vy);
  if (currentSpeed > speed) {
    player.vx = player.vx / currentSpeed * speed;
    player.vy = player.vy / currentSpeed * speed;
  }
  if (Math.hypot(direction.x, direction.y) > 0.1) {
    player.facingX = direction.x;
    player.facingY = direction.y;
  }

  if (!isHome && distance(player, state.ball) < 43 && state.elapsed - state.lastCpuShot > 0.85) {
    const shotDirection = normalize(targetGoalX - state.ball.x, HEIGHT / 2 - state.ball.y);
    state.ball.vx = shotDirection.x * 365 + player.vx * 0.25;
    state.ball.vy = shotDirection.y * 365 + player.vy * 0.25;
    state.lastCpuShot = state.elapsed;
  }
}

function updatePlayers(dt) {
  state.players.forEach(function (p) {
    if (p.isUser) moveUser(p, dt);
    else moveAI(p, dt);

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.0009, dt);
    p.vy *= Math.pow(0.0009, dt);
    p.x = clamp(p.x, 24, WIDTH - 24);
    p.y = clamp(p.y, 25, HEIGHT - 25);
  });

  for (let i = 0; i < state.players.length; i += 1) {
    for (let j = i + 1; j < state.players.length; j += 1) {
      const a = state.players[i];
      const b = state.players[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = a.radius + b.radius - 2;
      if (d > 0 && d < minD) {
        const push = (minD - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

function updateBall(dt) {
  const ball = state.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.vx *= Math.pow(0.19, dt);
  ball.vy *= Math.pow(0.19, dt);

  if (ball.y < BALL_RADIUS + 12) {
    ball.y = BALL_RADIUS + 12;
    ball.vy = Math.abs(ball.vy) * 0.78;
  }
  if (ball.y > HEIGHT - BALL_RADIUS - 12) {
    ball.y = HEIGHT - BALL_RADIUS - 12;
    ball.vy = -Math.abs(ball.vy) * 0.78;
  }

  if (ball.x < BALL_RADIUS + 10 || ball.x > WIDTH - BALL_RADIUS - 10) {
    const inGoal = ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM;
    if (inGoal) {
      scoreGoal(ball.x > WIDTH / 2 ? "home" : "away");
      return;
    }
    if (ball.x < BALL_RADIUS + 10) {
      ball.x = BALL_RADIUS + 10;
      ball.vx = Math.abs(ball.vx) * 0.8;
    } else {
      ball.x = WIDTH - BALL_RADIUS - 10;
      ball.vx = -Math.abs(ball.vx) * 0.8;
    }
  }

  state.players.forEach(function (p) {
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    const d = Math.hypot(dx, dy);
    const minD = p.radius + BALL_RADIUS;
    if (d > 0 && d < minD) {
      const nx = dx / d;
      const ny = dy / d;
      ball.x = p.x + nx * (minD + 1);
      ball.y = p.y + ny * (minD + 1);
      const impact = Math.max(110, Math.hypot(p.vx, p.vy) * 0.8);
      ball.vx += nx * impact + p.vx * 0.34;
      ball.vy += ny * impact + p.vy * 0.34;
      const ballSpeed = Math.hypot(ball.vx, ball.vy);
      if (ballSpeed > 560) {
        ball.vx = ball.vx / ballSpeed * 560;
        ball.vy = ball.vy / ballSpeed * 560;
      }
    }
  });
}

function updateGame(dt) {
  state.elapsed += dt;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  state.goalFlash = Math.max(0, state.goalFlash - dt);
  updatePlayers(dt);
  updateBall(dt);
  updateHud();
  if (state.timeLeft <= 0) finishMatch();
}

function drawPitch() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const stripeWidth = WIDTH / 10;
  for (let i = 0; i < 10; i += 1) {
    if (i % 2 === 0) {
      ctx.fillStyle = COLORS.grassLight;
      ctx.fillRect(i * stripeWidth, 0, stripeWidth, HEIGHT);
    }
  }

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, WIDTH - 48, HEIGHT - 48);
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2, 24);
  ctx.lineTo(WIDTH / 2, HEIGHT - 24);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, 78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.line;
  ctx.fill();

  const boxTop = HEIGHT / 2 - 125;
  const boxHeight = 250;
  ctx.strokeRect(24, boxTop, 105, boxHeight);
  ctx.strokeRect(WIDTH - 129, boxTop, 105, boxHeight);
  ctx.strokeRect(24, HEIGHT / 2 - 70, 42, 140);
  ctx.strokeRect(WIDTH - 66, HEIGHT / 2 - 70, 42, 140);

  ctx.fillStyle = "rgba(9, 15, 9, .35)";
  ctx.fillRect(0, GOAL_TOP, 22, GOAL_BOTTOM - GOAL_TOP);
  ctx.fillRect(WIDTH - 22, GOAL_TOP, 22, GOAL_BOTTOM - GOAL_TOP);
  ctx.strokeStyle = "rgba(255,255,255,.6)";
  ctx.lineWidth = 2;
  for (let y = GOAL_TOP + 8; y < GOAL_BOTTOM; y += 14) {
    ctx.beginPath();
    ctx.moveTo(3, y);
    ctx.lineTo(20, y);
    ctx.moveTo(WIDTH - 20, y);
    ctx.lineTo(WIDTH - 3, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(9, 15, 9, .24)";
  ctx.fillRect(24, 24, WIDTH - 48, 3);
  ctx.fillRect(24, HEIGHT - 27, WIDTH - 48, 3);
  ctx.font = "900 12px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.textAlign = "center";
  ctx.fillText("SMALL POLES · ACCRA CAGE", WIDTH / 2, 48);

  if (state.goalFlash > 0) {
    ctx.fillStyle = "rgba(242, 203, 57, " + (state.goalFlash * 0.18) + ")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawPlayer(p) {
  const home = p.team === "home";
  const jersey = home ? COLORS.home : COLORS.away;
  const dark = home ? COLORS.homeDark : COLORS.awayDark;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.24)";
  ctx.beginPath();
  ctx.ellipse(p.x + 2, p.y + 8, 17, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (p.isUser) {
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 23, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = jersey;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius - 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(p.x - p.facingY * 5, p.y + p.facingX * 5);
  ctx.lineTo(p.x + p.facingX * 11, p.y + p.facingY * 11);
  ctx.stroke();

  ctx.fillStyle = "#10140e";
  ctx.font = "900 10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(p.shirtNumber), p.x, p.y + 1);
  ctx.restore();
}

function drawBall() {
  const ball = state.ball;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.3)";
  ctx.beginPath();
  ctx.ellipse(ball.x + 2, ball.y + 5, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.ball;
  ctx.strokeStyle = "#1c241a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#222b20";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render() {
  drawPitch();
  state.players.forEach(drawPlayer);
  drawBall();
}

function gameLoop(timestamp) {
  if (state.phase !== "playing") return;
  if (!state.lastFrame) state.lastFrame = timestamp;
  const dt = clamp((timestamp - state.lastFrame) / 1000, 0, 0.032);
  state.lastFrame = timestamp;
  updateGame(dt);
  render();
  if (state.phase === "playing") requestAnimationFrame(gameLoop);
}

function handleKeyDown(event) {
  const blocked = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
  if (blocked.includes(event.code)) event.preventDefault();
  if (event.code === "Escape" && (state.phase === "playing" || state.phase === "paused")) {
    togglePause();
    return;
  }
  if (event.code === "Space" && !event.repeat) {
    userShoot();
    state.keys.add(event.code);
    return;
  }
  state.keys.add(event.code);
}

function handleKeyUp(event) {
  state.keys.delete(event.code);
}

function bindTouchControls() {
  document.querySelectorAll("[data-control]").forEach(function (button) {
    const control = button.dataset.control;
    const activate = function (event) {
      event.preventDefault();
      state.touch.add(control);
      button.classList.add("is-active");
      if (control === "shoot") userShoot();
      if (button.setPointerCapture && event.pointerId !== undefined) {
        try { button.setPointerCapture(event.pointerId); } catch (error) { /* capture is optional */ }
      }
    };
    const deactivate = function (event) {
      if (event) event.preventDefault();
      state.touch.delete(control);
      button.classList.remove("is-active");
    };
    button.addEventListener("pointerdown", activate);
    button.addEventListener("pointerup", deactivate);
    button.addEventListener("pointercancel", deactivate);
    button.addEventListener("lostpointercapture", deactivate);
    button.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  });
}

startButton.addEventListener("click", startMatch);
pauseButton.addEventListener("click", togglePause);
resumeButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", function () {
  const wasRunning = state.phase === "playing";
  resetMatch(state.mode, state.duration);
  state.phase = "playing";
  pauseOverlay.hidden = true;
  resultOverlay.hidden = true;
  pauseButton.textContent = "Ⅱ Pause";
  state.lastFrame = 0;
  if (!wasRunning) requestAnimationFrame(gameLoop);
});
backButton.addEventListener("click", returnToMenu);
playAgainButton.addEventListener("click", startMatch);
resultMenuButton.addEventListener("click", returnToMenu);
window.addEventListener("keydown", handleKeyDown, { passive: false });
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("blur", function () {
  state.keys.clear();
  state.touch.clear();
  if (state.phase === "playing") togglePause();
});
document.addEventListener("visibilitychange", function () {
  if (document.hidden && state.phase === "playing") togglePause();
});
bindTouchControls();
drawPitch();
