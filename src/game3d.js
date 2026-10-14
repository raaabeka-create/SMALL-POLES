import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { addNeighborhood } from "./neighborhood.js";

/*
 * SMALL POLES 3D — procedural Three.js street-football prototype.
 * The scene is generated from geometry and canvas textures; no model downloads
 * or backend credentials are required. Three.js itself is loaded from a CDN.
 */
const $ = (selector) => document.querySelector(selector);
const ui = {
  intro: $("#introPanel"), game: $("#gameSection"), canvas: $("#gameCanvas"),
  start: $("#startMatch"), pause: $("#pauseMatch"), resume: $("#resumeMatch"),
  restart: $("#restartMatch"), back: $("#backToMenu"), playAgain: $("#playAgain"),
  resultMenu: $("#resultMenu"), pauseOverlay: $("#pauseOverlay"), resultOverlay: $("#resultOverlay"),
  matchTitle: $("#matchTitle"), homeScore: $("#homeScore"), awayScore: $("#awayScore"),
  clock: $("#matchClock"), resultHeadline: $("#resultHeadline"), resultSummary: $("#resultSummary"),
  resultScore: $("#resultScore"), hint: $("#matchHint"), actionLabel: $("#actionLabel"),
  actionHint: $("#actionHint"), pitchFrame: $("#pitchFrame"), careerLevel: $("#careerLevel"),
  careerRecord: $("#careerRecord"), careerGoals: $("#careerGoals"), careerXP: $("#careerXP")
};
const THREE_CDN_NOTE = "3D graphics need an internet connection to load Three.js the first time.";
const COURT = { width: 22, length: 30, wallHeight: 3.2, halfW: 11, halfL: 15 };
const state = {
  mode: 1, duration: 120, remaining: 120, homeScore: 0, awayScore: 0,
  running: false, paused: false, ended: false, lastTime: 0, careerSaved: false, matchGoals: 0,
  keys: new Set(), touch: new Set(), players: [], ball: null,
  carrier: null, shotCooldown: 0, hintCooldown: 0, elapsed: 0
};
let scene, camera, renderer, clock, courtGroup, ballMesh, ballShadow, targetMeshes = [], activeVenue = null;
let homeTarget, awayTarget, ambient, sun, cameraTarget = new THREE.Vector3();
const held = new Set();

const CAREER_KEY = "small-poles-street-tour-v1";
function loadCareer() {
  const empty = { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, xp: 0 };
  try { return { ...empty, ...JSON.parse(localStorage.getItem(CAREER_KEY) || "{}") }; }
  catch { return empty; }
}
function paintCareer() {
  const c = loadCareer();
  const level = Math.floor(c.xp / 250) + 1;
  if (ui.careerLevel) ui.careerLevel.textContent = "LEVEL " + String(level).padStart(2, "0");
  if (ui.careerRecord) ui.careerRecord.textContent = c.wins + "W · " + c.draws + "D · " + c.losses + "L";
  if (ui.careerGoals) ui.careerGoals.textContent = String(c.goals);
  if (ui.careerXP) ui.careerXP.textContent = c.xp + " XP";
}
function saveCareerResult() {
  if (state.careerSaved) return;
  state.careerSaved = true;
  const c = loadCareer();
  c.matches++;
  if (state.homeScore > state.awayScore) c.wins++;
  else if (state.homeScore === state.awayScore) c.draws++;
  else c.losses++;
  c.goals += state.matchGoals;
  c.xp += 25 + state.matchGoals * 10 + (state.homeScore > state.awayScore ? 50 : state.homeScore === state.awayScore ? 25 : 10);
  try { localStorage.setItem(CAREER_KEY, JSON.stringify(c)); } catch {}
  paintCareer();
}
function mat(color, roughness = 0.86, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function box(parent, size, material, position, rotation) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function makeTexture(draw, width = 1024, height = 512) {
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const c = canvas.getContext("2d"); draw(c, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}
function wallTexture() {
  return makeTexture((c, w, h) => {
    c.fillStyle = "#873d2c"; c.fillRect(0, 0, w, h);
    const bh = 38, bw = 92;
    for (let y = 0; y < h; y += bh) {
      c.fillStyle = "rgba(33,19,14,.45)"; c.fillRect(0, y, w, 5);
      const offset = (Math.floor(y / bh) % 2) * -bw / 2;
      for (let x = offset; x < w; x += bw) {
        c.fillStyle = ["#a95037", "#98442f", "#b25b3e", "#7d3829"][(Math.floor(x / bw) + Math.floor(y / bh)) % 4];
        c.fillRect(x + 4, y + 4, bw - 8, bh - 8);
        c.fillStyle = "rgba(245,163,115,.13)"; c.fillRect(x + 6, y + 5, bw - 12, 3);
      }
    }
    c.fillStyle = "rgba(20,20,15,.55)"; c.fillRect(0, h - 26, w, 26);
    // Neighbourhood wall art, painted directly onto the brick texture.
    c.save(); c.translate(w * .12, h * .54); c.rotate(-.06);
    c.font = "900 70px sans-serif"; c.lineWidth = 13; c.strokeStyle = "#17271f";
    c.strokeText("NO PITCH? NO PROBLEM.", 0, 0); c.fillStyle = "#f1ca3c";
    c.fillText("NO PITCH? NO PROBLEM.", 0, 0); c.restore();
    c.save(); c.translate(w * .72, h * .25); c.rotate(.07);
    c.font = "900 42px sans-serif"; c.fillStyle = "#5dbd78"; c.fillText("GHANA", 0, 0);
    c.font = "bold 22px sans-serif"; c.fillStyle = "#f7eee0"; c.fillText("STREET RULES", 0, 34); c.restore();
    // Simple painted football and Ghana-colour strokes.
    c.fillStyle = "#e23b32"; c.fillRect(w * .49, h * .65, 180, 12);
    c.fillStyle = "#f2cc3b"; c.fillRect(w * .49, h * .65 + 14, 180, 12);
    c.fillStyle = "#319759"; c.fillRect(w * .49, h * .65 + 28, 180, 12);
    c.globalAlpha = .35;
    for (let i = 0; i < 700; i++) {
      c.fillStyle = i % 2 ? "#f5d7a3" : "#281e17";
      c.fillRect(Math.random() * w, Math.random() * h, Math.random() * 5 + 1, 2);
    }
  });
}
function dirtTexture() {
  return makeTexture((c, w, h) => {
    c.fillStyle = "#9b7047"; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9500; i++) {
      c.fillStyle = ["rgba(46,35,25,.13)", "rgba(232,194,132,.18)", "rgba(67,49,31,.1)"][i % 3];
      const x = Math.random() * w, y = Math.random() * h;
      c.beginPath(); c.ellipse(x, y, Math.random() * 5 + 1, Math.random() * 3 + 1, 0, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = "rgba(242,220,179,.22)"; c.lineWidth = 4;
    c.strokeRect(45, 45, w - 90, h - 90);
    c.beginPath(); c.moveTo(w / 2, 45); c.lineTo(w / 2, h - 45); c.stroke();
    c.beginPath(); c.arc(w / 2, h / 2, 85, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "rgba(45,33,22,.2)";
    for (let i = 0; i < 18; i++) {
      c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 20, 3 + Math.random() * 8, Math.random(), 0, Math.PI * 2); c.fill();
    }
  }, 1024, 1024);
}
function createCourt() {
  courtGroup = new THREE.Group(); scene.add(courtGroup);
  const dirt = new THREE.MeshStandardMaterial({ map: dirtTexture(), roughness: 1 });
  const bricks = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: .94 });
  box(courtGroup, [COURT.width, .34, COURT.length], mat("#493827"), [0, -.2, 0]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(COURT.width, COURT.length), dirt);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true; courtGroup.add(ground);
  // Enclosed brick walls; end walls have the target brick attached to the inside.
  box(courtGroup, [COURT.width + .5, COURT.wallHeight, .55], bricks, [0, 1.35, -COURT.halfL]);
  box(courtGroup, [COURT.width + .5, COURT.wallHeight, .55], bricks, [0, 1.35, COURT.halfL]);
  box(courtGroup, [.55, COURT.wallHeight, COURT.length], bricks, [-COURT.halfW, 1.35, 0]);
  box(courtGroup, [.55, COURT.wallHeight, COURT.length], bricks, [COURT.halfW, 1.35, 0]);
  const cap = mat("#4b2921");
  box(courtGroup, [COURT.width + .8, .18, .72], cap, [0, 3.08, -COURT.halfL]);
  box(courtGroup, [COURT.width + .8, .18, .72], cap, [0, 3.08, COURT.halfL]);
  box(courtGroup, [.72, .18, COURT.length + .6], cap, [-COURT.halfW, 3.08, 0]);
  box(courtGroup, [.72, .18, COURT.length + .6], cap, [COURT.halfW, 3.08, 0]);
  // The painted target is a single raised red brick, not a goal net.
  homeTarget = createTarget(0, COURT.halfL - .33, "#2ca65b");
  awayTarget = createTarget(0, -COURT.halfL + .33, "#f1c83d");
  addStreetDetails();
}
function createTarget(x, z, trimColor) {
  const g = new THREE.Group(); g.position.set(x, 1.05, z);
  const dark = mat("#281b16"), red = mat("#e9473b"), trim = mat(trimColor);
  box(g, [2.1, 1.25, .14], dark, [0, 0, 0]);
  box(g, [1.8, .95, .12], red, [0, 0, .1]);
  box(g, [1.9, .07, .15], trim, [0, .51, .11]);
  box(g, [.07, 1.02, .15], trim, [-.93, 0, .11]);
  box(g, [.07, 1.02, .15], trim, [.93, 0, .11]);
  courtGroup.add(g); targetMeshes.push(g); return g;
}
function addStreetDetails() {
  const concrete = mat("#6f6655"), tyre = mat("#262521"), litter = [mat("#b4a58b"), mat("#4d5b4b"), mat("#d2c7a8")];
  // A few scattered stones and scraps at the edges, not across the play area.
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (9.1 + Math.random() * .7), z = (Math.random() - .5) * 27;
    const piece = new THREE.Mesh(new THREE.DodecahedronGeometry(.06 + Math.random() * .11, 0), litter[i % litter.length]);
    piece.position.set(x, .04, z); piece.rotation.set(Math.random(), Math.random(), Math.random()); piece.castShadow = true; courtGroup.add(piece);
  }
  // Tyres and low concrete seating near the touchlines.
  for (const z of [-9.5, 9.5]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.48, .14, 8, 20), tyre);
    wheel.rotation.x = Math.PI / 2; wheel.position.set(-9.6, .18, z); courtGroup.add(wheel);
    box(courtGroup, [1.3, .42, .65], concrete, [9.6, .05, z]);
  }
  // Small floodlights on battered poles above the corners.
  const pole = mat("#363832"), lamp = new THREE.MeshStandardMaterial({ color: "#f5dca0", emissive: "#e4a94a", emissiveIntensity: 1.5 });
  for (const x of [-10.3, 10.3]) for (const z of [-13.5, 13.5]) {
    box(courtGroup, [.12, 4.3, .12], pole, [x, 2.1, z]);
    box(courtGroup, [.65, .18, .3], lamp, [x, 4.18, z]);
  }
}
function createPlayer(team, index) {
  const root = new THREE.Group();
  const selectedKit = document.querySelector("#kitColor")?.value || "#21884b";
  const shirtColor = team === "home" ? selectedKit : (index === 0 ? "#c93832" : "#e85a48");
  const shirt = mat(shirtColor), shorts = mat(team === "home" ? "#202e25" : "#302427");
  const skin = mat(["#7b4a2e", "#965b38", "#633a27", "#a76a43"][(index + (team === "away" ? 1 : 0)) % 4]);
  const socks = mat(team === "home" ? "#f2ead4" : "#f0d7c8"), boot = mat("#191b18");
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.31, .48, 4, 8), shirt);
  torso.position.y = 1.08; torso.castShadow = true; root.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 12), skin);
  head.position.y = 1.7; head.castShadow = true; root.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.225, 12, 8, 0, Math.PI * 2, 0, Math.PI * .55), mat(index % 2 ? "#201b18" : "#121412"));
  hair.position.y = 1.76; root.add(hair);
  const armPivots = [], legPivots = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * .39, 1.35, 0); root.add(arm);
    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(.105, .32, 3, 7), skin);
    upperArm.position.y = -.22; arm.add(upperArm); armPivots.push(arm);
    const leg = new THREE.Group(); leg.position.set(side * .17, .73, 0); root.add(leg);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .34, 3, 7), shorts); thigh.position.y = -.2; leg.add(thigh);
    const sock = new THREE.Mesh(new THREE.CapsuleGeometry(.085, .27, 3, 7), socks); sock.position.set(0, -.48, .02); leg.add(sock);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(.19, .12, .32), boot); shoe.position.set(0, -.64, -.06); leg.add(shoe);
    legPivots.push(leg);
  }
  // Team-colour shoulder stripe and a tiny number on the back.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(.5, .075, .33), mat(team === "home" ? "#f1cc3b" : "#f4eee0"));
  stripe.position.set(0, 1.25, .16); root.add(stripe);
  scene.add(root);
  const player = {
    team, index, root, armPivots, legPivots, speed: team === "home" && index === 0 ? 5.1 : 4.1,
    vx: 0, vz: 0, dirX: 0, dirZ: team === "home" ? -1 : 1,
    isUser: team === "home" && index === 0, celebration: 0, tackleCooldown: 0,
    color: shirtColor, kickFlash: 0, runPhase: Math.random() * 6
  };
  player.root.position.set(team === "home" ? (index - (state.mode - 1) / 2) * 2.2 : (index - (state.mode - 1) / 2) * 2.2, 0, team === "home" ? 5.1 + index * .7 : -5.1 - index * .7);
  return player;
}
function createBall() {
  const ballMat = new THREE.MeshStandardMaterial({ color: "#f4eee0", roughness: .45 });
  ballMesh = new THREE.Mesh(new THREE.SphereGeometry(.29, 24, 18), ballMat);
  ballMesh.castShadow = true; scene.add(ballMesh);
  const black = mat("#222420");
  // Dark pentagon-like panels make the ball readable in 3D.
  for (let i = 0; i < 5; i++) {
    const panel = new THREE.Mesh(new THREE.CircleGeometry(.09, 5), black);
    panel.position.set(Math.cos(i * Math.PI * 2 / 5) * .2, .04, Math.sin(i * Math.PI * 2 / 5) * .2);
    panel.lookAt(panel.position.clone().multiplyScalar(2)); ballMesh.add(panel);
  }
  ballShadow = new THREE.Mesh(new THREE.CircleGeometry(.38, 24), new THREE.MeshBasicMaterial({ color: "#211a13", transparent: true, opacity: .28, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = .015; scene.add(ballShadow);
  state.ball = { x: 0, y: .3, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, lastTeam: "home" };
}
function init3D() {
  const venue = document.querySelector("#courtVenue")?.value || "accra";
  activeVenue = venue;
  const venueStyle = {
    accra: { sky: "#c5a078", fog: "#c5a078", sun: "#fff0cf", ambient: "#f7dfb6" },
    jamestown: { sky: "#9fb8bd", fog: "#9fb8bd", sun: "#ffe1bc", ambient: "#d8e7e0" },
    kumasi: { sky: "#a5b18a", fog: "#a5b18a", sun: "#f5e8bd", ambient: "#e0e7c9" }
  }[venue] || { sky: "#c5a078", fog: "#c5a078", sun: "#fff0cf", ambient: "#f7dfb6" };
  scene = new THREE.Scene(); scene.background = new THREE.Color(venueStyle.sky); scene.fog = new THREE.Fog(venueStyle.fog, 42, 92);
  camera = new THREE.PerspectiveCamera(55, 1, .1, 120);
  camera.position.set(0, 18, 31); camera.lookAt(0, 0, 0);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.domElement.id = "gameCanvas"; renderer.domElement.setAttribute("aria-label", "3D Ghanaian street football. Use arrow keys or touch controls to move, S to pass or press, A to shoot, D to tackle, E to sprint and Space to feint.");
  renderer.domElement.style.display = "block";
  ui.canvas.replaceWith(renderer.domElement); ui.canvas = renderer.domElement;
  ambient = new THREE.HemisphereLight(venueStyle.ambient, "#45352a", 2.0); scene.add(ambient);
  sun = new THREE.DirectionalLight(venueStyle.sun, 3.2); sun.position.set(-8, 19, 11); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -19; sun.shadow.camera.right = 19;
  sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25; scene.add(sun);
  const bounce = new THREE.DirectionalLight("#d9e6cf", .65); bounce.position.set(9, 7, -12); scene.add(bounce);
  createCourt();
  addNeighborhood(THREE, scene, venue);
  createBall();
  clock = new THREE.Clock();
  window.addEventListener("resize", resizeRenderer);
  renderer.setAnimationLoop(animate);
  resizeRenderer();
}
function resizeRenderer() {
  if (!renderer || !ui.pitchFrame) return;
  const w = Math.max(1, ui.pitchFrame.clientWidth), h = Math.max(1, ui.pitchFrame.clientHeight || w * .6);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
function resetMatch() {
  state.mode = Number(document.querySelector('input[name="matchMode"]:checked')?.value || 1);
  state.duration = Number($("#matchDuration")?.value || 120);
  state.remaining = state.duration; state.homeScore = 0; state.awayScore = 0; state.matchGoals = 0; state.careerSaved = false;
  state.running = true; state.paused = false; state.ended = false; state.elapsed = 0;
  state.keys.clear(); state.touch.clear(); state.carrier = null; state.shotCooldown = 0;
  if (state.players.length) state.players.forEach(p => scene.remove(p.root));
  state.players = [];
  for (let i = 0; i < state.mode; i++) state.players.push(createPlayer("home", i));
  for (let i = 0; i < state.mode; i++) state.players.push(createPlayer("away", i));
  state.ball = { x: 0, y: .3, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, lastTeam: "home" };
  ballMesh.position.set(0, .3, 0); ballMesh.rotation.set(0, 0, 0);
  ui.homeScore.textContent = "0"; ui.awayScore.textContent = "0";
  ui.clock.textContent = formatTime(state.remaining);
  const venueLabel = ({ accra: "ACCRA", jamestown: "JAMESTOWN", kumasi: "KUMASI" })[document.querySelector("#courtVenue")?.value || "accra"] || "ACCRA";
  ui.matchTitle.textContent = state.mode + "v" + state.mode + " SMALL POLES · " + venueLabel;
  ui.intro.hidden = true; ui.game.hidden = false; ui.pauseOverlay.hidden = true; ui.resultOverlay.hidden = true;
  ui.pause.textContent = "Ⅱ Pause"; ui.hint.textContent = "3D COURT LIVE — hit the marked brick to score. The wall rebounds every miss.";
  resizeRenderer(); updateActionLabel(); placeBall();
}
function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}
function updateActionLabel() {
  const user = state.players.find(p => p.isUser);
  const carrying = state.carrier === user;
  ui.actionLabel.textContent = carrying ? "PASS" : "PRESS";
  ui.actionHint.textContent = carrying ? "S · PASS" : "S · HOLD";
}
function placeBall() {
  if (!state.ball || !ballMesh) return;
  state.ball.x = 0; state.ball.y = .3; state.ball.z = 0;
  state.ball.vx = 0; state.ball.vy = 0; state.ball.vz = 0; state.carrier = null;
  ballMesh.position.set(0, .3, 0); ballShadow.position.set(0, .015, 0);
}
function setHint(text) { ui.hint.textContent = text; state.hintCooldown = 2.2; }
function endMatch() {
  state.running = false; state.ended = true; saveCareerResult(); ui.resultOverlay.hidden = false;
  const won = state.homeScore > state.awayScore, drew = state.homeScore === state.awayScore;
  ui.resultHeadline.textContent = drew ? "LEVEL PEGGING" : won ? "COURT OWNED" : "RUN IT BACK";
  ui.resultSummary.textContent = drew ? "Nobody claimed the pole this time." : won ? "Your side found the brick when it mattered." : "The challengers hit their target more often. One more run?";
  ui.resultScore.textContent = state.homeScore + " — " + state.awayScore;
}
function score(team) {
  if (!state.running) return;
  if (team === "home") { state.homeScore++; state.matchGoals++; } else state.awayScore++;
  ui.homeScore.textContent = String(state.homeScore); ui.awayScore.textContent = String(state.awayScore);
  setHint(team === "home" ? "BRICK! YOUR SIDE CLAIMS THE POLE." : "THE CHALLENGERS HIT THEIR BRICK.");
  state.players.forEach(p => { if (p.team === team) p.celebration = .8; });
  placeBall();
  state.players.forEach((p, i) => {
    p.root.position.set(p.team === "home" ? (p.index - (state.mode - 1) / 2) * 2.2 : (p.index - (state.mode - 1) / 2) * 2.2, 0, p.team === "home" ? 5.1 + p.index * .7 : -5.1 - p.index * .7);
  });
}
function nearestPlayer(x, z, team) {
  let best = null, bestD = Infinity;
  for (const p of state.players) if (!team || p.team === team) {
    const d = Math.hypot(p.root.position.x - x, p.root.position.z - z);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}
function shoot(player, power) {
  if (!state.running || state.paused || state.shotCooldown > 0) return;
  const b = state.ball;
  if (state.carrier !== player && Math.hypot(player.root.position.x - b.x, player.root.position.z - b.z) > 1.4) return;
  state.carrier = null; b.x = player.root.position.x; b.z = player.root.position.z - (player.team === "home" ? .45 : -.45); b.y = .42;
  const targetZ = player.team === "home" ? -COURT.halfL + .15 : COURT.halfL - .15;
  const tx = player.team === "home" ? awayTarget.position.x : homeTarget.position.x;
  const dx = tx - b.x, dz = targetZ - b.z, len = Math.hypot(dx, dz) || 1;
  b.vx = (dx / len) * power + player.vx * .32; b.vz = (dz / len) * power + player.vz * .32;
  b.vy = power > 8 ? 2.8 : 1.25; b.spin = 12; b.lastTeam = player.team; state.shotCooldown = .24;
  player.kickFlash = .22; setHint(player.team === "home" ? "STRIKE IT! AIM FOR THE MARKED BRICK." : "THE CHALLENGERS HAVE A SHOT.");
}
function passBall(player) {
  if (state.carrier !== player) { pressBall(player); return; }
  const teammate = state.players.filter(p => p.team === player.team && p !== player).sort((a, b) => {
    const da = Math.hypot(a.root.position.x - player.root.position.x, a.root.position.z - player.root.position.z);
    const db = Math.hypot(b.root.position.x - player.root.position.x, b.root.position.z - player.root.position.z); return da - db;
  })[0];
  if (!teammate) { shoot(player, 9); return; }
  const dx = teammate.root.position.x - state.ball.x, dz = teammate.root.position.z - state.ball.z, len = Math.hypot(dx, dz) || 1;
  state.carrier = null; state.ball.vx = dx / len * 7; state.ball.vz = dz / len * 7; state.ball.vy = .8; state.ball.lastTeam = player.team;
  setHint("PASS AND MOVE — GET TO THE NEXT BALL.");
}
function pressBall(player) {
  if (state.carrier && state.carrier.team !== player.team) {
    const carrier = state.carrier, dx = carrier.root.position.x - player.root.position.x, dz = carrier.root.position.z - player.root.position.z;
    const len = Math.hypot(dx, dz) || 1;
    if (len < 1.65 && player.tackleCooldown <= 0) {
      state.carrier = null; state.ball.vx = dx / len * 4.6; state.ball.vz = dz / len * 4.6; state.ball.vy = .7;
      player.tackleCooldown = 1.0; setHint("CLEAN TAKE! YOU WON THE BALL.");
    } else setHint("PRESSURE ON — CLOSE THE SPACE.");
  } else if (state.carrier === player) passBall(player);
}
function feint(player) {
  if (state.carrier !== player) return;
  const side = Math.random() < .5 ? -1 : 1;
  player.root.position.x = THREE.MathUtils.clamp(player.root.position.x + side * 1.05, -COURT.halfW + 1, COURT.halfW - 1);
  player.dirX = side; player.dirZ = -1;
  state.ball.vx = side * 1.4; state.ball.vz = player.team === "home" ? -1.7 : 1.7;
  setHint("QUICK CUT — MAKE THEM MISS.");
}
function shove(player) {
  if (!state.running || state.paused) return;
  const rival = nearestPlayer(player.root.position.x, player.root.position.z, player.team === "home" ? "away" : "home");
  if (!rival) return;
  const dx = rival.root.position.x - player.root.position.x, dz = rival.root.position.z - player.root.position.z, d = Math.hypot(dx, dz);
  if (d < 1.55 && player.tackleCooldown <= 0) {
    if (state.carrier === rival) {
      state.carrier = null; state.ball.vx = dx / (d || 1) * 4.2; state.ball.vz = dz / (d || 1) * 4.2; state.ball.vy = .65;
      setHint("SHOULDER IN! THE BALL IS LOOSE.");
    } else setHint("BODY CHECK — KEEP YOUR FEET.");
    rival.vx += dx / (d || 1) * 1.8; rival.vz += dz / (d || 1) * 1.8;
    player.tackleCooldown = .9;
  } else setHint("GET CLOSER BEFORE THE SHOVE.");
}
function inputVector() {
  let x = 0, z = 0;
  if (state.keys.has("ArrowLeft") || state.touch.has("left")) x--;
  if (state.keys.has("ArrowRight") || state.touch.has("right")) x++;
  if (state.keys.has("ArrowUp") || state.touch.has("up")) z--;
  if (state.keys.has("ArrowDown") || state.touch.has("down")) z++;
  const l = Math.hypot(x, z); if (l > 0) { x /= l; z /= l; }
  return { x, z };
}
function updatePlayer(p, dt) {
  const pos = p.root.position;
  p.tackleCooldown = Math.max(0, p.tackleCooldown - dt);
  p.celebration = Math.max(0, p.celebration - dt);
  p.kickFlash = Math.max(0, p.kickFlash - dt);
  let dx = 0, dz = 0, speed = p.speed;
  if (p.isUser) {
    const v = inputVector(); dx = v.x; dz = v.z;
    if (state.keys.has("e") || state.keys.has("shift") || state.touch.has("sprint")) speed *= 1.42;
  } else {
    const b = state.ball;
    let tx = b.x, tz = b.z;
    if (p.team === "home") {
      if (state.carrier && state.carrier.team === "home" && p !== state.carrier) {
        tx = state.ball.x + (p.index - 0.5) * 2.3; tz = state.ball.z + 2.2 + p.index * .4;
      } else if (state.carrier && state.carrier.team === "away") {
        tx = b.x; tz = b.z;
      } else { tx = b.x + (p.index - 0.5) * 1.2; tz = b.z + (p.index ? 1.4 : 0); }
    } else {
      if (state.carrier && state.carrier.team === "away" && p !== state.carrier) {
        tx = b.x + (p.index - 0.5) * 2; tz = b.z - 2 - p.index * .3;
      } else if (state.carrier && state.carrier.team === "home") {
        tx = b.x; tz = b.z;
      } else { tx = b.x + (p.index - 0.5) * 1.3; tz = b.z - (p.index ? 1.3 : 0); }
    }
    if (state.carrier === p) { tx = p.team === "home" ? 0 : 0; tz = p.team === "home" ? -9 : 9; }
    dx = THREE.MathUtils.clamp(tx - pos.x, -1, 1); dz = THREE.MathUtils.clamp(tz - pos.z, -1, 1);
    const len = Math.hypot(dx, dz); if (len > .1) { dx /= len; dz /= len; } else { dx = 0; dz = 0; }
    if (p.team === "away") speed *= .92;
  }
  const moving = Math.hypot(dx, dz) > .02;
  if (moving) { p.dirX = dx; p.dirZ = dz; }
  const acceleration = p.isUser ? 19 : 10;
  p.vx += (dx * speed - p.vx) * Math.min(1, acceleration * dt);
  p.vz += (dz * speed - p.vz) * Math.min(1, acceleration * dt);
  pos.x += p.vx * dt; pos.z += p.vz * dt;
  pos.x = THREE.MathUtils.clamp(pos.x, -COURT.halfW + 1.05, COURT.halfW - 1.05);
  pos.z = THREE.MathUtils.clamp(pos.z, -COURT.halfL + 1.15, COURT.halfL - 1.15);
  p.root.rotation.y = Math.atan2(p.dirX, p.dirZ);
  p.runPhase += dt * (moving ? 10 : 2);
  const stride = moving ? Math.sin(p.runPhase) * .58 : 0;
  p.legPivots[0].rotation.x = stride; p.legPivots[1].rotation.x = -stride;
  p.armPivots[0].rotation.x = -stride * .7; p.armPivots[1].rotation.x = stride * .7;
  if (p.celebration > 0) { p.armPivots[0].rotation.z = -.95; p.armPivots[1].rotation.z = .95; }
  else { p.armPivots[0].rotation.z = 0; p.armPivots[1].rotation.z = 0; }
  p.root.position.y = p.celebration > 0 ? Math.abs(Math.sin(p.celebration * 12)) * .22 : Math.abs(Math.sin(p.runPhase * 2)) * (moving ? .04 : .008);
  // Only very close players can claim a loose ball.
  if (!state.carrier && Math.hypot(pos.x - state.ball.x, pos.z - state.ball.z) < .72 && state.ball.y < 1.1) {
    state.carrier = p; state.ball.vx = 0; state.ball.vz = 0; state.ball.vy = 0;
    if (p.isUser) setHint("BALL AT YOUR FEET — FIND THE BRICK.");
  }
}
function updateBall(dt) {
  const b = state.ball;
  if (state.carrier) {
    const p = state.carrier;
    const facingX = p.dirX || 0, facingZ = p.dirZ || (p.team === "home" ? -1 : 1);
    b.x = p.root.position.x + facingX * .46;
    b.z = p.root.position.z + facingZ * .55;
    b.y = .31 + Math.abs(Math.sin(p.runPhase * 2)) * (Math.hypot(p.vx, p.vz) > 1 ? .09 : .025);
    b.vx = p.vx; b.vz = p.vz;
  } else {
    b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.vx *= Math.pow(.987, dt * 60); b.vz *= Math.pow(.99, dt * 60);
    if (b.y < .29) { b.y = .29; if (Math.abs(b.vy) > .65) b.vy *= -.42; else b.vy = 0; b.vx *= .96; b.vz *= .96; }
    if (b.x < -COURT.halfW + .5 || b.x > COURT.halfW - .5) {
      b.x = THREE.MathUtils.clamp(b.x, -COURT.halfW + .5, COURT.halfW - .5); b.vx *= -.72; b.spin += 1.3;
    }
    if (b.z < -COURT.halfL + .55) {
      if (Math.abs(b.x - awayTarget.position.x) < 1.05 && b.y > .55 && b.y < 2.15) score(b.lastTeam);
      else { b.z = -COURT.halfL + .55; b.vz = Math.abs(b.vz) * .72; b.vx += (Math.random() - .5) * .6; }
    }
    if (b.z > COURT.halfL - .55) {
      if (Math.abs(b.x - homeTarget.position.x) < 1.05 && b.y > .55 && b.y < 2.15) score(b.lastTeam);
      else { b.z = COURT.halfL - .55; b.vz = -Math.abs(b.vz) * .72; b.vx += (Math.random() - .5) * .6; }
    }
    if (Math.abs(b.vx) + Math.abs(b.vz) < .18 && b.y <= .3) {
      const p = nearestPlayer(b.x, b.z);
      if (p && Math.hypot(p.root.position.x - b.x, p.root.position.z - b.z) < 1.25) state.carrier = p;
    }
  }
  ballMesh.position.set(b.x, b.y, b.z);
  ballMesh.rotation.x += b.vz * dt * 1.4; ballMesh.rotation.z -= b.vx * dt * 1.4;
  ballShadow.position.set(b.x, .018, b.z); ballShadow.scale.setScalar(THREE.MathUtils.clamp(1.1 - b.y * .22, .5, 1));
  ballShadow.material.opacity = THREE.MathUtils.clamp(.32 - (b.y - .3) * .12, .08, .32);
}
function updateCamera(dt) {
  const user = state.players.find(p => p.isUser);
  const targetX = user ? user.root.position.x * .12 : 0;
  cameraTarget.lerp(new THREE.Vector3(targetX, 0, 0), 1 - Math.exp(-dt * 1.4));
  camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTarget.x, 1.25, dt);
  camera.lookAt(cameraTarget.x * .35, .4, 0);
}
function animate() {
  const dt = Math.min(clock ? clock.getDelta() : .016, .04);
  if (state.running && !state.paused) {
    state.elapsed += dt; state.remaining = Math.max(0, state.remaining - dt);
    ui.clock.textContent = formatTime(state.remaining);
    state.shotCooldown = Math.max(0, state.shotCooldown - dt);
    state.hintCooldown = Math.max(0, state.hintCooldown - dt);
    state.players.forEach(p => updatePlayer(p, dt));
    updateBall(dt); updateCamera(dt);
    if (state.remaining <= 0) endMatch();
  } else if (state.players.length) updateCamera(dt);
  if (renderer && scene && camera) renderer.render(scene, camera);
}
function startMatch() {
  const selectedVenue = document.querySelector("#courtVenue")?.value || "accra";
  if (scene && activeVenue !== selectedVenue) {
    if (renderer) { renderer.setAnimationLoop(null); renderer.dispose(); }
    scene = null; camera = null; renderer = null; clock = null;
    courtGroup = null; ballMesh = null; ballShadow = null; targetMeshes = [];
  }
  if (!scene) {
    try { init3D(); }
    catch (error) { console.error("SMALL POLES 3D failed to initialise:", error); ui.hint.textContent = THREE_CDN_NOTE + " Try refreshing the page."; return; }
  }
  resetMatch();
}
function togglePause() {
  if (!state.running || state.ended) return;
  state.paused = !state.paused; ui.pauseOverlay.hidden = !state.paused;
  ui.pause.textContent = state.paused ? "▶ Resume" : "Ⅱ Pause";
}
function returnToMenu() {
  state.running = false; state.paused = false; state.ended = false;
  ui.intro.hidden = false; ui.game.hidden = true; ui.pauseOverlay.hidden = true; ui.resultOverlay.hidden = true;
}
function handleAction(action) {
  if (!state.running || state.paused) return;
  const user = state.players.find(p => p.isUser); if (!user) return;
  if (action === "action") passBall(user);
  if (action === "shoot") shoot(user, 10.5);
  if (action === "shove") shove(user);
  if (action === "feint") feint(user);
  if (action === "celebrate") { user.celebration = .8; setHint("LET THEM KNOW. STREET FOOTBALL."); }
}
function keyName(event) {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return event.key;
  if (event.key === " ") return " ";
  return event.key.toLowerCase();
}
document.addEventListener("keydown", event => {
  const key = keyName(event);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(key)) event.preventDefault();
  if (key === "escape") { togglePause(); return; }
  state.keys.add(key);
  if (key === "a") handleAction("shoot");
  if (key === "s" && !state.keys.has("ArrowDown")) handleAction("action");
  if (key === "d") handleAction("shove");
  if (key === " " || key === "f") handleAction("feint");
  if (key === "c") handleAction("celebrate");
});
document.addEventListener("keyup", event => state.keys.delete(keyName(event)));
window.addEventListener("blur", () => { state.keys.clear(); state.touch.clear(); held.clear(); });
ui.start.addEventListener("click", startMatch);
ui.pause.addEventListener("click", togglePause);
ui.resume.addEventListener("click", togglePause);
ui.restart.addEventListener("click", startMatch);
ui.back.addEventListener("click", returnToMenu);
ui.playAgain.addEventListener("click", startMatch);
ui.resultMenu.addEventListener("click", returnToMenu);
document.querySelectorAll("[data-control]").forEach(button => {
  const control = button.dataset.control;
  if (["up", "down", "left", "right", "sprint"].includes(control)) {
    const down = event => { event.preventDefault(); state.touch.add(control); button.classList.add("is-active"); };
    const up = event => { event.preventDefault(); state.touch.delete(control); button.classList.remove("is-active"); };
    button.addEventListener("pointerdown", down);
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    button.addEventListener("contextmenu", event => event.preventDefault());
  } else {
    button.addEventListener("click", () => handleAction(control));
  }
});
document.querySelectorAll('input[name="matchMode"]').forEach(input => input.addEventListener("change", () => {
  state.mode = Number(input.value);
}));
ui.pitchFrame.addEventListener("contextmenu", event => event.preventDefault());


paintCareer();
