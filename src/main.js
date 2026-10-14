/**
 * SMALL POLES — Ghanaian neighbourhood football prototype
 * Canvas game loop, touch/keyboard controls, lightweight AI, and match state.
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
const actionLabel = document.querySelector("#actionLabel");
const actionHint = document.querySelector("#actionHint");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PLAYER_RADIUS = 17;
const BALL_RADIUS = 8;
const WALL = 24;
const POLE_HEIGHT = 62;
const POLE_TOP = HEIGHT / 2 - POLE_HEIGHT / 2;
const POLE_BOTTOM = HEIGHT / 2 + POLE_HEIGHT / 2;
const COLORS = {
  dirt: "#9b7046",
  dirtLight: "#ad8154",
  dirtDark: "#775338",
  wall: "#6e3a2f",
  brick: "#a94c3e",
  brickLight: "#c56a50",
  mortar: "#d1a58a",
  line: "rgba(247, 225, 192, .54)",
  home: "#57d17a",
  homeDark: "#1c743d",
  away: "#ee574b",
  awayDark: "#a82e2b",
  ball: "#f8f6e9",
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
  lastPass: -10,
  lastCpuShot: -10,
  lastCpuAction: -10,
  lastTackle: -10,
  possessionId: null,
  passTargetId: null,
  pressProgress: 0,
  lastGoal: -10,
  goalFlash: 0,
  celebrationFlash: 0,
  lastClockPaint: "",
  lastScorePaint: ""
};

const litter = [
  { x: 112, y: 103, kind: "paper", angle: -0.3 },
  { x: 176, y: 484, kind: "bottle", angle: 0.6 },
  { x: 315, y: 76, kind: "paper", angle: 0.5 },
  { x: 390, y: 525, kind: "can", angle: -0.2 },
  { x: 586, y: 111, kind: "can", angle: 0.3 },
  { x: 712, y: 495, kind: "paper", angle: -0.7 },
  { x: 824, y: 157, kind: "bottle", angle: 0.1 },
  { x: 903, y: 450, kind: "paper", angle: 0.4 },
  { x: 502, y: 82, kind: "paper", angle: -0.2 },
  { x: 668, y: 550, kind: "can", angle: 0.8 },
  { x: 76, y: 335, kind: "can", angle: 0.2 },
  { x: 940, y: 300, kind: "paper", angle: -0.4 }
];

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
  const offsets = count === 1 ? [0] : count === 2 ? [-66, 66] : [-108, 0, 108];
  return {
    id: team + "-" + index,
    team,
    index,
    x: home ? 230 : WIDTH - 230,
    y: HEIGHT / 2 + offsets[index],
    vx: 0,
    vy: 0,
    facingX: home ? 1 : -1,
    facingY: 0,
    radius: PLAYER_RADIUS,
    speed: index === 0 && home ? 225 : 183,
    isUser: home && index === 0,
    shirtNumber: index + 1,
    celebrate: 0,
    tackleCooldown: 0,
    aiActionCooldown: 0
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
  state.lastPass = -10;
  state.lastCpuShot = -10;
  state.lastCpuAction = -10;
  state.lastTackle = -10;
  state.possessionId = null;
  state.passTargetId = null;
  state.pressProgress = 0;
  state.lastGoal = -10;
  state.goalFlash = 0;
  state.celebrationFlash = 0;
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
 const spread=state.mode===1?[0]:state.mode===2?[-62,62]:[-100,0,100];
 state.players.forEach(function(p){const offset=spread[p.index];p.x=p.team==="home"?220+(p.index===0?0:35):WIDTH-220-(p.index===0?0:35);p.y=HEIGHT/2+offset;p.vx=0;p.vy=0;p.facingX=p.team==="home"?1:-1;p.facingY=0;p.celebrate=0;p.tackleCooldown=0;p.aiActionCooldown=0;});
 state.ball.x=WIDTH/2;state.ball.y=HEIGHT/2;state.ball.vx=0;state.ball.vy=0;
 state.possessionId="home-0";state.passTargetId=null;state.pressProgress=0;attachBallToCarrier();
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
  matchTitle.textContent = state.mode + "v" + state.mode + " SMALL POLES";
  matchHint.textContent = "You start with the ball. Arrows move · S pass/press · A shoot · D shove · hold E to sprint.";
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
  render();
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
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
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
    resultHeadline.textContent = "POLES HIT. STREET KING.";
    resultSummary.textContent = "You found the brick when it mattered. Let the neighbourhood hear about it.";
    matchHint.textContent = "Full time — your side takes the bragging rights.";
  } else if (state.homeScore < state.awayScore) {
    resultHeadline.textContent = "THE OTHER SIDE GOT YOU.";
    resultSummary.textContent = "They found their target more often. Run it back and settle it properly.";
    matchHint.textContent = "Full time — the away side wins.";
  } else {
    resultHeadline.textContent = "NO BRAGGING RIGHTS YET.";
    resultSummary.textContent = "Level pegging. One more run should settle the argument.";
    matchHint.textContent = "Full time — it ends level.";
  }
  resultScore.textContent = state.homeScore + " — " + state.awayScore;
  resultOverlay.hidden = false;
}

function scoreGoal(scoringTeam) {
  if (state.elapsed - state.lastGoal < 0.85) return;
  state.lastGoal = state.elapsed;
  state.goalFlash = 0.95;
  state.celebrationFlash = 1.1;
  state.players.forEach(function (p) {
    if (p.team === scoringTeam) p.celebrate = 1.3;
  });
  if (scoringTeam === "home") {
    state.homeScore += 1;
    matchHint.textContent = "POLES! You hit the marked brick. The whole court knows.";
  } else {
    state.awayScore += 1;
    matchHint.textContent = "They hit the pole. Get the ball back and answer.";
  }
  updateHud();
  resetPositions();
}


function getUserDirection(){let x=0,y=0;if(state.keys.has("ArrowLeft")||state.touch.has("left"))x-=1;if(state.keys.has("ArrowRight")||state.touch.has("right"))x+=1;if(state.keys.has("ArrowUp")||state.touch.has("up"))y-=1;if(state.keys.has("ArrowDown")||state.touch.has("down"))y+=1;return normalize(x,y);}

function getFacing(player) {
  const direction = getUserDirection();
  if (Math.hypot(direction.x, direction.y) > 0.1) return direction;
  return normalize(player.facingX, player.facingY);
}


function userShoot(){
 if(state.phase!=="playing"||state.elapsed-state.lastShot<0.28)return;
 const player=state.players.find(function(p){return p.isUser;});
 if(!player||state.possessionId!==player.id){matchHint.textContent="Win the ball first, then press A to shoot.";return;}
 attachBallToCarrier();const inputDirection=getUserDirection();let direction;
 if(Math.hypot(inputDirection.x,inputDirection.y)>0.1)direction=normalize(Math.max(0.28,inputDirection.x+0.52),inputDirection.y*0.9);
 else direction=normalize(WIDTH-WALL-state.ball.x,HEIGHT/2-state.ball.y);
 state.possessionId=null;state.passTargetId=null;state.ball.vx=direction.x*590+player.vx*0.48;state.ball.vy=direction.y*590+player.vy*0.48;
 state.lastShot=state.elapsed;player.facingX=direction.x;player.facingY=direction.y;matchHint.textContent="Shot fired. Use the angle to bend it toward the marked brick.";
}


function userPass(){
 if(state.phase!=="playing"||state.elapsed-state.lastPass<0.24)return;
 const player=state.players.find(function(p){return p.isUser;});
 if(!player||state.possessionId!==player.id){matchHint.textContent="You are defending — hold S to press and win the ball.";return;}
 const teammate=state.players.filter(function(p){return p.team==="home"&&!p.isUser;}).sort(function(a,b){
  const scoreA=distance(a,state.ball)+Math.max(0,player.x-a.x)*0.45,scoreB=distance(b,state.ball)+Math.max(0,player.x-b.x)*0.45;return scoreA-scoreB;
 })[0];
 attachBallToCarrier();let direction;
 if(teammate){direction=normalize(teammate.x+teammate.vx*0.22-state.ball.x,teammate.y+teammate.vy*0.22-state.ball.y);state.passTargetId=teammate.id;matchHint.textContent="Pass played. Your teammate will control it unless a defender intercepts.";}
 else{direction=normalize(WIDTH-WALL-state.ball.x,HEIGHT/2-state.ball.y);state.passTargetId=null;matchHint.textContent="No teammate in 1v1 — quick pass into space.";}
 state.possessionId=null;const passSpeed=teammate?clamp(distance(player,teammate)*1.15,300,430):330;
 state.ball.vx=direction.x*passSpeed+player.vx*0.25;state.ball.vy=direction.y*passSpeed+player.vy*0.25;state.lastPass=state.elapsed;player.facingX=direction.x;player.facingY=direction.y;
}

function userCelebrate() {
  if (state.phase !== "playing") return;
  const player = state.players.find(function (p) { return p.isUser; });
  if (!player) return;
  player.celebrate = 1.2;
  state.celebrationFlash = 0.55;
  matchHint.textContent = "Big talk! Now hit the pole.";
}


function moveUser(player,dt){
 const direction=getUserDirection();const sprinting=state.keys.has("KeyE")||state.keys.has("ShiftLeft")||state.keys.has("ShiftRight")||state.touch.has("sprint");
 const hasBall=state.possessionId===player.id,maxSpeed=player.speed*(sprinting?(hasBall?1.3:1.62):1),acceleration=sprinting?1180:950;
 player.vx+=direction.x*acceleration*dt;player.vy+=direction.y*acceleration*dt;const speed=Math.hypot(player.vx,player.vy);
 if(speed>maxSpeed){player.vx=player.vx/speed*maxSpeed;player.vy=player.vy/speed*maxSpeed;}
 if(direction.x!==0||direction.y!==0){player.facingX=direction.x;player.facingY=direction.y;}
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


function moveAI(player,dt){
 const isHome=player.team==="home",hasPossession=state.possessionId===player.id,carrier=getPlayerById(state.possessionId),ballTarget=carrier||state.ball,targetPoleX=isHome?WIDTH-WALL:WALL;
 let targetX=player.x,targetY=player.y;
 if(hasPossession){targetX=targetPoleX+(isHome?-165:165);targetY=clamp(HEIGHT/2+(HEIGHT/2-player.y)*0.18,95,HEIGHT-95);}
 else if(carrier&&carrier.team!==player.team){
  const shouldChase=isHome?(!player.isUser&&distance(player,ballTarget)<300):distance(player,ballTarget)<340;
  if(shouldChase){targetX=ballTarget.x+(isHome?-22:22);targetY=ballTarget.y;}
  else{const lane=state.mode===1?0:(player.index-(state.mode-1)/2)*76;targetX=isHome?clamp(ballTarget.x-110,75,WIDTH/2-65):clamp(ballTarget.x+110,WIDTH/2+65,WIDTH-75);targetY=clamp(ballTarget.y+lane,70,HEIGHT-70);}
 }else if(carrier&&carrier.team===player.team){
  const lane=state.mode===1?0:(player.index-(state.mode-1)/2)*88;targetX=isHome?clamp(ballTarget.x+80,100,WIDTH-100):clamp(ballTarget.x-80,100,WIDTH-100);targetY=clamp(ballTarget.y+lane,70,HEIGHT-70);
 }else{
  const chaser=nearestBallPlayer(player.team,false);
  if(chaser&&chaser.id===player.id){targetX=state.ball.x+(isHome?-18:18);targetY=state.ball.y;}
  else{const lane=state.mode===1?0:(player.index-(state.mode-1)/2)*75;targetX=isHome?clamp(state.ball.x-100,80,WIDTH/2-65):clamp(state.ball.x+100,WIDTH/2+65,WIDTH-80);targetY=clamp(state.ball.y+lane,70,HEIGHT-70);}
 }
 const direction=normalize(targetX-player.x,targetY-player.y),speed=player.speed*(hasPossession?0.9:0.95);
 player.vx+=direction.x*650*dt;player.vy+=direction.y*650*dt;const currentSpeed=Math.hypot(player.vx,player.vy);
 if(currentSpeed>speed){player.vx=player.vx/currentSpeed*speed;player.vy=player.vy/currentSpeed*speed;}
 if(Math.hypot(direction.x,direction.y)>0.1){player.facingX=direction.x;player.facingY=direction.y;}
}


function updatePlayers(dt){
 state.players.forEach(function(p){if(p.celebrate>0)p.celebrate=Math.max(0,p.celebrate-dt);p.tackleCooldown=Math.max(0,(p.tackleCooldown||0)-dt);if(p.isUser)moveUser(p,dt);else moveAI(p,dt);
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(0.0009,dt);p.vy*=Math.pow(0.0009,dt);p.x=clamp(p.x,WALL+PLAYER_RADIUS,WIDTH-WALL-PLAYER_RADIUS);p.y=clamp(p.y,WALL+PLAYER_RADIUS,HEIGHT-WALL-PLAYER_RADIUS);
 });
 for(let i=0;i<state.players.length;i+=1)for(let j=i+1;j<state.players.length;j+=1){
  const a=state.players[i],b=state.players[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),minD=a.radius+b.radius-2;
  if(d>0&&d<minD){const push=(minD-d)/2,nx=dx/d,ny=dy/d;a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;
   if(state.possessionId===a.id&&b.team!==a.team&&b.isUser&&state.keys.has("KeyS"))attemptSteal(b,a,0.7);
   else if(state.possessionId===b.id&&a.team!==b.team&&a.isUser&&state.keys.has("KeyS"))attemptSteal(a,b,0.7);
  }
 }
}


function getPlayerById(id){return state.players.find(function(p){return p.id===id;})||null;}
function attachBallToCarrier(){
 const carrier=getPlayerById(state.possessionId);if(!carrier){state.possessionId=null;return;}
 const facing=normalize(carrier.facingX,carrier.facingY),direction=Math.hypot(facing.x,facing.y)>0.1?facing:{x:carrier.team==="home"?1:-1,y:0},offset=carrier.radius+BALL_RADIUS+2;
 state.ball.x=clamp(carrier.x+direction.x*offset,WALL+BALL_RADIUS,WIDTH-WALL-BALL_RADIUS);state.ball.y=clamp(carrier.y+direction.y*offset,WALL+BALL_RADIUS,HEIGHT-WALL-BALL_RADIUS);
 state.ball.vx=carrier.vx*0.92;state.ball.vy=carrier.vy*0.92;
}
function acquireBall(player,message){
 state.possessionId=player.id;state.passTargetId=null;state.pressProgress=0;
 player.facingX=player.team==="home"?Math.max(0.35,player.facingX):Math.min(-0.35,player.facingX);if(message)matchHint.textContent=message;attachBallToCarrier();
}
function attemptSteal(defender,carrier,strength){
 if(!defender||!carrier||defender.team===carrier.team||state.possessionId!==carrier.id)return false;
 if(state.elapsed-state.lastTackle<0.45||distance(defender,carrier)>56)return false;
 state.lastTackle=state.elapsed;defender.tackleCooldown=0.7;const toward=normalize(carrier.x-defender.x,carrier.y-defender.y);
 carrier.vx+=toward.x*125;carrier.vy+=toward.y*125;defender.vx-=toward.x*70;defender.vy-=toward.y*70;
 const successChance=clamp(strength-distance(defender,carrier)/150+(defender.vx*toward.x+defender.vy*toward.y)/500,0.18,0.88);
 if(Math.random()<successChance){acquireBall(defender,defender.isUser?"Clean tackle! You won possession.":"The ball has been stolen. Press back!");return true;}
 matchHint.textContent=defender.isUser?"Shoulder challenge — stay close and press again.":"The carrier shrugged off the challenge.";return false;
}
function updatePressing(dt){
 const user=state.players.find(function(p){return p.isUser;}),carrier=getPlayerById(state.possessionId),pressing=state.keys.has("KeyS")||state.touch.has("press");
 if(!user||!carrier||carrier.team===user.team||!pressing){state.pressProgress=Math.max(0,state.pressProgress-dt*1.7);return;}
 const d=distance(user,carrier);if(d<=76){state.pressProgress+=dt*(d<43?1.5:0.8);if(state.pressProgress>=0.95){state.pressProgress=0;attemptSteal(user,carrier,d<43?0.84:0.62);}}
 else state.pressProgress=Math.max(0,state.pressProgress-dt*2.2);
}
function updateAIActions(){
 const carrier=getPlayerById(state.possessionId);if(!carrier||carrier.isUser||state.elapsed-state.lastCpuAction<0.8)return;
 const targetX=carrier.team==="home"?WIDTH-WALL:WALL,toPole=distance(carrier,{x:targetX,y:HEIGHT/2}),opponent=nearestBallPlayer(carrier.team==="home"?"away":"home",false),underPressure=opponent&&distance(opponent,carrier)<58;
 const teammates=state.players.filter(function(p){return p.team===carrier.team&&p.id!==carrier.id;}).sort(function(a,b){return distance(a,carrier)-distance(b,carrier);});
 if(toPole<345||(carrier.team==="away"&&toPole<430&&!underPressure)){
  attachBallToCarrier();const direction=normalize(targetX-state.ball.x,HEIGHT/2-state.ball.y);state.possessionId=null;state.passTargetId=null;state.ball.vx=direction.x*510+carrier.vx*0.35;state.ball.vy=direction.y*510+carrier.vy*0.35;state.lastCpuShot=state.elapsed;state.lastCpuAction=state.elapsed;matchHint.textContent=carrier.team==="away"?"Opponent shoots for the pole!":"Your teammate takes the shot!";
 }else if(teammates.length&&(underPressure||state.elapsed-state.lastCpuAction>2.2)){
  attachBallToCarrier();const target=teammates[0],direction=normalize(target.x+target.vx*0.2-state.ball.x,target.y+target.vy*0.2-state.ball.y);state.possessionId=null;state.passTargetId=target.id;state.ball.vx=direction.x*350+carrier.vx*0.2;state.ball.vy=direction.y*350+carrier.vy*0.2;state.lastCpuAction=state.elapsed;
 }
}
function updateBall(dt){
 const ball=state.ball;if(state.possessionId){attachBallToCarrier();return;}
 ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.vx*=Math.pow(0.19,dt);ball.vy*=Math.pow(0.19,dt);
 if(ball.y<WALL+BALL_RADIUS){ball.y=WALL+BALL_RADIUS;ball.vy=Math.abs(ball.vy)*0.78;}
 if(ball.y>HEIGHT-WALL-BALL_RADIUS){ball.y=HEIGHT-WALL-BALL_RADIUS;ball.vy=-Math.abs(ball.vy)*0.78;}
 if(ball.x<WALL+BALL_RADIUS||ball.x>WIDTH-WALL-BALL_RADIUS){
  const onPole=ball.y>=POLE_TOP-BALL_RADIUS&&ball.y<=POLE_BOTTOM+BALL_RADIUS,hitRight=ball.x>WIDTH/2;
  if(onPole){scoreGoal(hitRight?"home":"away");return;}
  if(ball.x<WALL+BALL_RADIUS){ball.x=WALL+BALL_RADIUS;ball.vx=Math.abs(ball.vx)*0.82;}else{ball.x=WIDTH-WALL-BALL_RADIUS;ball.vx=-Math.abs(ball.vx)*0.82;}
 }
 const speed=Math.hypot(ball.vx,ball.vy);let winner=null,bestDistance=Infinity;
 state.players.forEach(function(p){const d=distance(p,ball),catchRadius=p.radius+BALL_RADIUS+(state.passTargetId===p.id?8:0),canControl=d<=catchRadius&&(speed<365||d<15||state.passTargetId===p.id);if(canControl&&d<bestDistance){bestDistance=d;winner=p;}});
 if(winner){const message=state.passTargetId?(winner.id===state.passTargetId?"Pass completed — teammate has control.":(winner.team==="home"?"You recovered the loose ball.":"Pass intercepted! Win it back.")):(winner.isUser?"Ball recovered. Your move.":(winner.team==="home"?"Your teammate controls the ball.":"Opponent takes possession."));acquireBall(winner,message);return;}
 if(state.passTargetId&&speed<80)state.passTargetId=null;
}


function updateGame(dt){
 state.elapsed+=dt;state.timeLeft=Math.max(0,state.timeLeft-dt);state.goalFlash=Math.max(0,state.goalFlash-dt);state.celebrationFlash=Math.max(0,state.celebrationFlash-dt);
 updatePlayers(dt);updatePressing(dt);updateAIActions();updateBall(dt);updateHud();if(state.timeLeft<=0)finishMatch();
}

function drawBrickWall() {
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 0, WIDTH, WALL);
  ctx.fillRect(0, HEIGHT - WALL, WIDTH, WALL);
  ctx.fillRect(0, 0, WALL, HEIGHT);
  ctx.fillRect(WIDTH - WALL, 0, WALL, HEIGHT);

  ctx.lineWidth = 1;
  ctx.strokeStyle = COLORS.mortar;

  // Brick courses on the top and bottom walls only.
  for (let x = -22; x < WIDTH + 22; x += 22) {
    const topOffset = Math.floor((x + 22) / 22) % 2 ? 0 : 10;
    ctx.strokeRect(x + topOffset, 2, 22, 10);
    ctx.strokeRect(x, 12, 22, 10);
    ctx.strokeRect(x + topOffset, HEIGHT - 22, 22, 10);
    ctx.strokeRect(x, HEIGHT - 12, 22, 10);
  }

  // Narrow brick courses on the left and right end walls.
  for (let y = -22; y < HEIGHT + 22; y += 22) {
    const sideOffset = Math.floor((y + 22) / 22) % 2 ? 0 : 10;
    ctx.strokeRect(2, y + sideOffset, 10, 22);
    ctx.strokeRect(12, y, 10, 22);
    ctx.strokeRect(WIDTH - 22, y + sideOffset, 10, 22);
    ctx.strokeRect(WIDTH - 12, y, 10, 22);
  }

  ctx.fillStyle = "#4a3028";
  ctx.fillRect(0, 0, WIDTH, 3);
  ctx.fillRect(0, HEIGHT - 3, WIDTH, 3);
}

function drawPole(x, isRight) {
  const poleX = isRight ? WIDTH - WALL - 3 : 3;
  const poleWidth = WALL;
  const poleY = POLE_TOP;
  const poleHeight = POLE_HEIGHT;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.38)";
  ctx.fillRect(poleX + 2, poleY + 3, poleWidth, poleHeight);
  ctx.fillStyle = "#c7b39a";
  ctx.fillRect(poleX, poleY, poleWidth, poleHeight);
  ctx.fillStyle = "#a94c3e";
  ctx.fillRect(poleX + 2, poleY + 2, poleWidth - 4, poleHeight - 4);
  ctx.strokeStyle = "#e9c4a7";
  ctx.lineWidth = 2;
  ctx.strokeRect(poleX + 2, poleY + 2, poleWidth - 4, poleHeight - 4);
  ctx.strokeStyle = "rgba(75,35,27,.75)";
  ctx.lineWidth = 1;
  for (let y = poleY + 12; y < poleY + poleHeight - 4; y += 12) {
    ctx.beginPath();
    ctx.moveTo(poleX + 3, y);
    ctx.lineTo(poleX + poleWidth - 3, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#f2cb39";
  ctx.font = "900 9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HIT", poleX + poleWidth / 2, poleY + poleHeight / 2);
  ctx.restore();
}

function drawGraffiti() {
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.translate(82, 74);
  ctx.rotate(-0.08);
  ctx.fillStyle = "#263c2b";
  ctx.font = "1000 25px system-ui, sans-serif";
  ctx.fillText("TEMA", 0, 0);
  ctx.strokeStyle = "#e3bb47";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-2, 7);
  ctx.lineTo(66, 7);
  ctx.stroke();

  ctx.translate(770, 390);
  ctx.rotate(0.07);
  ctx.fillStyle = "#8f392f";
  ctx.font = "1000 22px system-ui, sans-serif";
  ctx.fillText("NO DULLING", 0, 0);
  ctx.strokeStyle = "#e8d7bd";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(8, -30, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.48;
  ctx.fillStyle = "#e8d6a7";
  ctx.font = "900 10px system-ui, sans-serif";
  ctx.fillText("HOME OF THE BALLERS", 36, 48);
  ctx.fillText("ONE TOUCH. ONE POLE.", WIDTH - 182, HEIGHT - 43);
  ctx.restore();
}

function drawLitter() {
  litter.forEach(function (item) {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    if (item.kind === "bottle") {
      ctx.fillStyle = "#4d6652";
      ctx.fillRect(-3, -8, 6, 15);
      ctx.fillStyle = "#a3b09a";
      ctx.fillRect(-2, -10, 4, 3);
    } else if (item.kind === "can") {
      ctx.fillStyle = "#b9b4a2";
      ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = "#6f7868";
      ctx.fillRect(-4, -2, 8, 1);
    } else {
      ctx.fillStyle = "#d4cbb6";
      ctx.beginPath();
      ctx.moveTo(-7, -3);
      ctx.lineTo(5, -5);
      ctx.lineTo(7, 3);
      ctx.lineTo(-2, 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
}

function drawPitch() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = COLORS.dirt;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < 180; i += 1) {
    const x = (i * 137 + 29) % WIDTH;
    const y = (i * 83 + 17) % HEIGHT;
    const size = i % 4 === 0 ? 3 : 1.5;
    ctx.fillStyle = i % 3 === 0 ? "rgba(75,48,28,.22)" : "rgba(232,197,148,.22)";
    ctx.beginPath();
    ctx.ellipse(x, y, size * 1.8, size, (i % 5) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(71,45,25,.12)";
  ctx.fillRect(WALL, WALL, WIDTH - WALL * 2, HEIGHT - WALL * 2);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(WALL + 14, WALL + 14, WIDTH - 2 * (WALL + 14), HEIGHT - 2 * (WALL + 14));
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2, WALL + 14);
  ctx.lineTo(WIDTH / 2, HEIGHT - WALL - 14);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, 72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = COLORS.line;
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  drawLitter();
  drawGraffiti();
  drawBrickWall();
  drawPole(0, false);
  drawPole(WIDTH - WALL, true);

  ctx.fillStyle = "rgba(29,24,18,.66)";
  ctx.fillRect(WIDTH / 2 - 108, 34, 216, 23);
  ctx.fillStyle = "#f4e7cf";
  ctx.font = "900 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SMALL POLES · NEIGHBOURHOOD COURT", WIDTH / 2, 46);

  if (state.goalFlash > 0) {
    ctx.fillStyle = "rgba(242,203,57," + (state.goalFlash * 0.25) + ")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  if (state.celebrationFlash > 0) {
    ctx.fillStyle = "rgba(255,255,255," + (state.celebrationFlash * 0.08) + ")";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawPlayer(p) {
  const home = p.team === "home";
  const jersey = home ? COLORS.home : COLORS.away;
  const dark = home ? COLORS.homeDark : COLORS.awayDark;

  ctx.save();
  ctx.fillStyle = "rgba(40,25,15,.28)";
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

  if (p.celebrate > 0) {
    const bob = Math.sin(state.elapsed * 18) * 4;
    ctx.fillStyle = "#f2cb39";
    ctx.font = "1000 24px system-ui, sans-serif";
    ctx.fillText("✦", p.x, p.y - 31 - bob);
    ctx.font = "900 11px system-ui, sans-serif";
    ctx.fillText("YƐƐS!", p.x, p.y - 46 - bob);
    ctx.strokeStyle = "#f2cb39";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x - 10, p.y - 20);
    ctx.lineTo(p.x - 16, p.y - 30 - bob);
    ctx.moveTo(p.x + 10, p.y - 20);
    ctx.lineTo(p.x + 16, p.y - 30 - bob);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall() {
  const ball = state.ball;
  ctx.save();
  ctx.fillStyle = "rgba(40,25,15,.35)";
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


function handleKeyDown(event){
 const blocked=["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"];if(blocked.includes(event.code))event.preventDefault();
 if(event.code==="Escape"&&(state.phase==="playing"||state.phase==="paused")){togglePause();return;}
 if(event.code==="KeyA"&&!event.repeat){userShoot();return;}
 if(event.code==="KeyS"){const user=state.players.find(function(p){return p.isUser;});if(state.possessionId===(user&&user.id)){if(!event.repeat)userPass();}else state.keys.add("KeyS");return;}
 if(event.code==="KeyD"&&!event.repeat){userShove();return;}
 if(event.code==="KeyC"&&!event.repeat){userCelebrate();return;}
 state.keys.add(event.code);
}

function handleKeyUp(event){state.keys.delete(event.code);}


function userShove(){
 if(state.phase!=="playing")return;const user=state.players.find(function(p){return p.isUser;});
 if(!user||state.possessionId===user.id){matchHint.textContent="Shove is a defensive move — use it when the other side has the ball.";return;}
 const carrier=getPlayerById(state.possessionId);if(!carrier||carrier.team===user.team||distance(user,carrier)>72){matchHint.textContent="Get close to the ball carrier before shoving.";return;}attemptSteal(user,carrier,0.9);
}
function bindTouchControls(){
 document.querySelectorAll("[data-control]").forEach(function(button){const control=button.dataset.control;
  const activate=function(event){event.preventDefault();if(state.phase!=="playing")return;
   if(control==="shoot")userShoot();
   else if(control==="action"){const user=state.players.find(function(p){return p.isUser;});if(state.possessionId===(user&&user.id))userPass();else state.touch.add("press");}
   else if(control==="shove")userShove();else if(control==="celebrate")userCelebrate();else state.touch.add(control);
   button.classList.add("is-active");if(button.setPointerCapture&&event.pointerId!==undefined){try{button.setPointerCapture(event.pointerId);}catch(error){}}
  };
  const deactivate=function(event){if(event)event.preventDefault();state.touch.delete(control);if(control==="action")state.touch.delete("press");button.classList.remove("is-active");};
  button.addEventListener("pointerdown",activate);button.addEventListener("pointerup",deactivate);button.addEventListener("pointercancel",deactivate);button.addEventListener("lostpointercapture",deactivate);button.addEventListener("contextmenu",function(event){event.preventDefault();});
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
render();
