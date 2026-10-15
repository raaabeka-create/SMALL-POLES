import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { addNeighborhood } from "./neighborhood.js";

/*
 * SMALL POLES — original 3v3 street-football game.
 * All characters, kits, courts, and effects are generated locally from geometry.
 * No FIFA branding, copied assets, or external character models are used.
 */
const $ = (s) => document.querySelector(s);
const ui = {
  intro: $("#introPanel"), game: $("#gameSection"), canvas: $("#gameCanvas"),
  start: $("#startMatch"), pause: $("#pauseMatch"), resume: $("#resumeMatch"),
  restart: $("#restartMatch"), back: $("#backToMenu"), playAgain: $("#playAgain"),
  resultMenu: $("#resultMenu"), pauseOverlay: $("#pauseOverlay"), resultOverlay: $("#resultOverlay"),
  matchTitle: $("#matchTitle"), homeScore: $("#homeScore"), awayScore: $("#awayScore"),
  clock: $("#matchClock"), resultHeadline: $("#resultHeadline"), resultSummary: $("#resultSummary"),
  resultScore: $("#resultScore"), hint: $("#matchHint"), venue: $("#arenaVenue"),
  homeTeamName: $("#homeTeamName"), playerName: $("#playerName"), courtVenue: $("#courtVenue"),
  matchDuration: $("#matchDuration"), kitColor: $("#kitColor"), skinTone: $("#skinTone"),
  careerPlayerName: $("#careerPlayerName"), careerLevel: $("#careerLevel"),
  careerMatches: $("#careerMatches"), careerWins: $("#careerWins"), careerGoals: $("#careerGoals"),
  careerXP: $("#careerXP"), careerProgressBar: $("#careerProgressBar"), careerProgressText: $("#careerProgressText")
};
const FIELD = { width: 21.5, length: 30, halfW: 10.75, halfL: 15, wallH: 3.5, goalW: 2.7, goalH: 2.35 };
const CAREER_KEY = "small-poles-street-tour-v2";
const TEAM = { home: "#c9ff35", away: "#ff654f" };
const SKINS = ["#8d573a", "#b77952", "#d69a70", "#edc09a"];
const state = {
  phase: "menu", remaining: 120, duration: 120, homeScore: 0, awayScore: 0,
  players: [], ball: null, carrier: null, keys: new Set(), touch: new Set(),
  elapsed: 0, lastTime: 0, lastShot: -10, lastPass: -10, lastTackle: -10,
  aiCooldown: 0, lastGoal: -10, goalFlash: 0, celebration: 0,
  sceneBuilt: false, venue: "accra", playerName: "PLAYER", kit: "#c9ff35", skin: "#b77952",
  scoreSaved: false, effects: [], renderer: null
};
let scene, camera, clock, courtGroup, playerGroup, ballMesh, ballShadow, ballRing, ballTrail;
let homeGoal, awayGoal, crowdGroup, cameraLook = new THREE.Vector3();
let audioContext = null;

function mat(color, roughness = .82, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function box(parent, size, material, pos, rot = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent, r1, r2, h, material, pos, segments = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, segments), material);
  mesh.position.set(...pos); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function sphere(parent, radius, material, pos, width = 14, height = 10) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, width, height), material);
  mesh.position.set(...pos); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function loadCareer() {
  const empty = { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, xp: 0 };
  try { return { ...empty, ...JSON.parse(localStorage.getItem(CAREER_KEY) || "{}") }; }
  catch { return empty; }
}
function paintCareer() {
  const c = loadCareer(), name = (ui.playerName?.value || state.playerName || "PLAYER").trim().slice(0, 14).toUpperCase() || "PLAYER";
  ui.careerPlayerName.textContent = name;
  ui.careerLevel.textContent = "LVL " + String(Math.floor(c.xp / 250) + 1).padStart(2, "0");
  ui.careerMatches.textContent = String(c.matches).padStart(2, "0");
  ui.careerWins.textContent = String(c.wins).padStart(2, "0");
  ui.careerGoals.textContent = String(c.goals).padStart(2, "0");
  ui.careerXP.textContent = String(c.xp).padStart(3, "0") + " XP";
  const inLevel = c.xp % 250;
  ui.careerProgressBar.style.width = (inLevel / 250 * 100) + "%";
  ui.careerProgressText.textContent = inLevel + " / 250 XP TO NEXT LEVEL";
}
function saveCareer() {
  if (state.scoreSaved) return;
  state.scoreSaved = true;
  const c = loadCareer(); c.matches++;
  if (state.homeScore > state.awayScore) c.wins++;
  else if (state.homeScore < state.awayScore) c.losses++;
  else c.draws++;
  c.goals += state.homeScore;
  c.xp += 20 + state.homeScore * 15 + (state.homeScore > state.awayScore ? 50 : state.homeScore === state.awayScore ? 25 : 10);
  try { localStorage.setItem(CAREER_KEY, JSON.stringify(c)); } catch {}
  paintCareer();
}
function playSound(type = "kick") {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioContext ||= new AC();
    if (audioContext.state === "suspended") audioContext.resume();
    const now = audioContext.currentTime, notes = type === "goal" ? [392, 494, 587, 784] : type === "tackle" ? [130, 90] : [180, 240];
    notes.forEach((hz, i) => {
      const osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.type = type === "goal" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(hz, now + i * .07);
      gain.gain.setValueAtTime(.0001, now + i * .07);
      gain.gain.exponentialRampToValueAtTime(type === "goal" ? .07 : .025, now + i * .07 + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, now + i * .07 + .17);
      osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(now + i * .07); osc.stop(now + i * .07 + .19);
    });
  } catch {}
}
function setHint(message) { ui.hint.textContent = message; }

function buildGoal(z, homeSide) {
  const group = new THREE.Group(); group.position.z = z;
  const frameMat = mat(homeSide ? "#c9ff35" : "#ff654f", .4, .2);
  const netMat = new THREE.MeshStandardMaterial({ color: "#dfe4d8", roughness: .9, transparent: true, opacity: .19, side: THREE.DoubleSide });
  const backZ = homeSide ? -.7 : .7;
  box(group, [.09, FIELD.goalH, .09], frameMat, [-FIELD.goalW, FIELD.goalH / 2, 0]);
  box(group, [.09, FIELD.goalH, .09], frameMat, [FIELD.goalW, FIELD.goalH / 2, 0]);
  box(group, [FIELD.goalW * 2 + .1, .09, .09], frameMat, [0, FIELD.goalH, 0]);
  box(group, [.05, FIELD.goalH, .05], frameMat, [-FIELD.goalW, FIELD.goalH / 2, backZ]);
  box(group, [.05, FIELD.goalH, .05], frameMat, [FIELD.goalW, FIELD.goalH / 2, backZ]);
  box(group, [.05, .05, Math.abs(backZ)], frameMat, [-FIELD.goalW, FIELD.goalH, backZ / 2]);
  box(group, [.05, .05, Math.abs(backZ)], frameMat, [FIELD.goalW, FIELD.goalH, backZ / 2]);
  const net = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.goalW * 2, FIELD.goalH), netMat);
  net.position.set(0, FIELD.goalH / 2, backZ); group.add(net);
  const lineMat = new THREE.LineBasicMaterial({ color: "#e6eadf", transparent: true, opacity: .38 });
  for (let x = -FIELD.goalW + .4; x < FIELD.goalW; x += .4) {
    const pts = [new THREE.Vector3(x, .08, .04), new THREE.Vector3(x, FIELD.goalH, backZ)];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  for (let y = .35; y < FIELD.goalH; y += .35) {
    const pts = [new THREE.Vector3(-FIELD.goalW, y, backZ), new THREE.Vector3(FIELD.goalW, y, backZ)];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
  }
  scene.add(group); return group;
}
function buildCrowd() {
  crowdGroup = new THREE.Group(); scene.add(crowdGroup);
  const wallColors = ["#b65e43", "#c8a77a", "#687a63", "#8c4e3a", "#c6b28c", "#4d6b69"];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 8; i++) {
      const x = -9.4 + i * 2.65, z = side * 16.8;
      const h = 2.2 + (i % 3) * .4;
      box(crowdGroup, [2.4, h, .6], mat(wallColors[(i + (side === 1 ? 2 : 0)) % wallColors.length]), [x, h / 2, z]);
      box(crowdGroup, [2.48, .14, .66], mat(["#554b3a", "#8b5b3c", "#39493d"][i % 3]), [x, h + .05, z]);
      box(crowdGroup, [.16, .8, .09], mat("#253129"), [x - .5, h - .65, z - side * .36]);
      box(crowdGroup, [.16, .8, .09], mat("#253129"), [x + .5, h - .65, z - side * .36]);
    }
  }
  // High utility poles and sagging cables frame the street-court skyline.
  const poleMat = mat("#343832", .75, .2);
  for (const x of [-12.5, 12.5]) {
    cylinder(crowdGroup, .12, .2, 9, poleMat, [x, 4.5, -11], 8);
    box(crowdGroup, [2.1, .1, .1], poleMat, [x, 8.4, -11]);
  }
  const cableMat = new THREE.LineBasicMaterial({ color: "#1d2520", transparent: true, opacity: .85 });
  const cablePoints = [new THREE.Vector3(-12.5, 8.3, -11), new THREE.Vector3(0, 7.3, -9), new THREE.Vector3(12.5, 8.3, -11)];
  crowdGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cablePoints), cableMat));
}
function buildCourt() {
  scene.background = new THREE.Color("#a9a38a");
  scene.fog = new THREE.Fog("#a9a38a", 38, 76);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 100), mat("#777b62", 1));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.36; ground.receiveShadow = true; scene.add(ground);
  const court = new THREE.Group(); scene.add(court); courtGroup = court;
  const base = new THREE.Mesh(new THREE.BoxGeometry(FIELD.width, .32, FIELD.length), mat("#8c6b46", 1));
  base.position.y = -.18; base.receiveShadow = true; court.add(base);
  const playing = new THREE.Mesh(new THREE.PlaneGeometry(FIELD.width - .15, FIELD.length - .15), mat("#9a794f", 1));
  playing.rotation.x = -Math.PI / 2; playing.position.y = -.008; playing.receiveShadow = true; court.add(playing);
  // Dust and worn patches give the dirt a physical surface rather than a flat color.
  const dustMat = [mat("#b39063", 1), mat("#6f543a", 1), mat("#d0aa73", 1)];
  for (let i = 0; i < 180; i++) {
    const r = .06 + Math.random() * .23;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 6), dustMat[i % dustMat.length]);
    patch.rotation.x = -Math.PI / 2; patch.position.set((Math.random() - .5) * (FIELD.width - 1), .012 + i * .00001, (Math.random() - .5) * (FIELD.length - 1));
    court.add(patch);
  }
  const line = mat("#d6c8a5", .9);
  box(court, [FIELD.width - 1.1, .025, .055], line, [0, .025, 0]);
  box(court, [.055, .025, FIELD.length - 1.1], line, [0, .025, 0]);
  box(court, [FIELD.width - 1.1, .025, .055], line, [0, .025, -FIELD.halfL + .6]);
  box(court, [FIELD.width - 1.1, .025, .055], line, [0, .025, FIELD.halfL - .6]);
  box(court, [.055, .025, FIELD.length - 1.1], line, [-FIELD.halfW + .55, .025, 0]);
  box(court, [.055, .025, FIELD.length - 1.1], line, [FIELD.halfW - .55, .025, 0]);
  const centerCircle = new THREE.Mesh(new THREE.TorusGeometry(2.1, .025, 4, 64), line);
  centerCircle.rotation.x = Math.PI / 2; centerCircle.position.y = .04; court.add(centerCircle);
  // Enclosing brick walls stop the ball but remain low enough to see the city.
  const brick = mat("#873f30", .96), cap = mat("#3d3026");
  box(court, [FIELD.width + .7, FIELD.wallH, .48], brick, [0, FIELD.wallH / 2 - .03, -FIELD.halfL]);
  box(court, [FIELD.width + .7, FIELD.wallH, .48], brick, [0, FIELD.wallH / 2 - .03, FIELD.halfL]);
  box(court, [.48, FIELD.wallH, FIELD.length], brick, [-FIELD.halfW, FIELD.wallH / 2 - .03, 0]);
  box(court, [.48, FIELD.wallH, FIELD.length], brick, [FIELD.halfW, FIELD.wallH / 2 - .03, 0]);
  box(court, [FIELD.width + 1, .17, .65], cap, [0, FIELD.wallH, -FIELD.halfL]);
  box(court, [FIELD.width + 1, .17, .65], cap, [0, FIELD.wallH, FIELD.halfL]);
  for (let z = -FIELD.halfL + 1; z < FIELD.halfL; z += 1.2) {
    for (let x = -FIELD.halfW + 1; x < FIELD.halfW; x += 1.35) {
      if (Math.abs(x) < FIELD.goalW + .4 && (Math.abs(z) > FIELD.halfL - 1.4)) continue;
      if (Math.random() > .79) {
        const scuff = new THREE.Mesh(new THREE.BoxGeometry(.35 + Math.random() * .5, .018, .02), mat("#d4b789", 1));
        scuff.position.set(x, .028, z); scuff.rotation.y = (Math.random() - .5) * .3; court.add(scuff);
      }
    }
  }
  homeGoal = buildGoal(-FIELD.halfL + .12, true);
  awayGoal = buildGoal(FIELD.halfL - .12, false);
  buildCrowd();
  try { addNeighborhood(THREE, scene, state.venue); } catch (e) { console.warn("Neighbourhood dressing fallback:", e); }
}
function createPlayer(team, index) {
  const root = new THREE.Group(), home = team === "home";
  const kitColor = home ? state.kit : TEAM.away;
  const skinColor = home && index === 0 ? state.skin : SKINS[(index + (home ? 1 : 2)) % SKINS.length];
  const kit = mat(kitColor, .52), shorts = mat(home ? "#20281c" : "#262426", .78), skin = mat(skinColor, .76), boot = mat("#151719", .42, .08);
  const sock = mat(home ? "#e5e8d7" : "#ece2d4", .7);
  const body = new THREE.Group(); root.add(body);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.34, .47, 4, 8), kit);
  torso.position.y = 1.2; torso.castShadow = true; body.add(torso);
  // Shirt stripe, crest and collar details make kits readable at broadcast distance.
  box(body, [.075, .63, .025], mat(home ? "#25301b" : "#f0e4d9"), [0, 1.21, .326]);
  box(body, [.12, .1, .035], mat(home ? "#f1f3e5" : "#2c2a2b"), [-.17, 1.44, .325]);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(.105, .025, 5, 14), mat(home ? "#2c3522" : "#f5d6c9"));
  collar.position.set(0, 1.48, .02); collar.rotation.x = Math.PI / 2; body.add(collar);
  const head = sphere(body, .255, skin, [0, 1.88, .015], 16, 12);
  const hair = sphere(body, .26, mat(home ? "#211a16" : "#251b17"), [0, 2.0, .015], 14, 8);
  hair.scale.set(1, .48, 1); hair.position.y = 2.035;
  // Facial details face forward along +Z.
  sphere(body, .025, mat("#1b1714"), [-.085, 1.91, .239], 8, 6);
  sphere(body, .025, mat("#1b1714"), [.085, 1.91, .239], 8, 6);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(side * .17, .82, 0); body.add(hip);
    cylinder(hip, .115, .13, .48, shorts, [0, -.18, 0], 9);
    cylinder(hip, .085, .105, .31, sock, [0, -.53, 0], 9);
    const foot = box(hip, [.16, .11, .31], boot, [0, -.7, .09]);
    box(hip, [.11, .025, .16], mat("#b9b8ab"), [0, -.75, .13]);
    legs.push(hip);
    const arm = new THREE.Group(); arm.position.set(side * .37, 1.38, 0); body.add(arm);
    sphere(arm, .14, kit, [0, -.12, 0], 9, 8);
    cylinder(arm, .085, .105, .32, skin, [side * .015, -.34, .01], 8);
    sphere(arm, .09, skin, [side * .015, -.51, .015], 8, 6);
    arms.push(arm);
  }
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(.52, 20), new THREE.MeshBasicMaterial({ color: "#161a15", transparent: true, opacity: .28, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .025; root.add(shadow);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.53, .025, 5, 36), new THREE.MeshBasicMaterial({ color: home ? state.kit : TEAM.away, transparent: true, opacity: home && index === 0 ? .95 : .28 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .04; root.add(ring);
  const numberCanvas = document.createElement("canvas"); numberCanvas.width = 128; numberCanvas.height = 128;
  const ctx = numberCanvas.getContext("2d"); ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = home ? "#17200f" : "#fff0e8"; ctx.font = "900 78px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(index + 1), 64, 66);
  const numberTexture = new THREE.CanvasTexture(numberCanvas);
  const number = new THREE.Mesh(new THREE.PlaneGeometry(.25, .25), new THREE.MeshBasicMaterial({ map: numberTexture, transparent: true, depthWrite: false }));
  number.position.set(0, 1.18, .35); body.add(number);
  root.position.set(home ? (index - 1) * 2.4 : (index - 1) * 2.4, 0, home ? 7 + index * .65 : -7 - index * .65);
  playerGroup.add(root);
  return { id: team + index, team, index, root, body, legs, arms, ring, speed: index === 0 && home ? 6.7 : 5.7, vx: 0, vz: 0, dx: 0, dz: home ? -1 : 1, run: Math.random() * 5, tackleCooldown: 0, actionCooldown: Math.random() * .4, celebrate: 0 };
}
function createBall() {
  const group = new THREE.Group();
  const white = mat("#f2f0e7", .42), dark = mat("#20231f", .52);
  const core = sphere(group, .25, white, [0, 0, 0], 24, 16);
  // Simple graphic panels are geometry on the sphere, not an external ball asset.
  for (let i = 0; i < 5; i++) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(.075, 5), dark);
    patch.position.set(Math.cos(i * Math.PI * 2 / 5) * .18, Math.sin(i * Math.PI * 2 / 5) * .12, .17);
    patch.lookAt(0, 0, 1); group.add(patch);
  }
  ballMesh = group; scene.add(ballMesh);
  ballShadow = new THREE.Mesh(new THREE.CircleGeometry(.35, 18), new THREE.MeshBasicMaterial({ color: "#171a13", transparent: true, opacity: .32, depthWrite: false }));
  ballShadow.rotation.x = -Math.PI / 2; ballShadow.position.y = .025; scene.add(ballShadow);
  ballRing = new THREE.Mesh(new THREE.TorusGeometry(.46, .018, 4, 32), new THREE.MeshBasicMaterial({ color: state.kit, transparent: true, opacity: .65 }));
  ballRing.rotation.x = Math.PI / 2; ballRing.position.y = .035; scene.add(ballRing);
}
function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#a9a38a");
  camera = new THREE.PerspectiveCamera(43, 1, .1, 150);
  camera.position.set(0, 22, 30);
  const hemi = new THREE.HemisphereLight("#fff0d5", "#423c2c", 2.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff0cf", 3.1); sun.position.set(-11, 24, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -24; sun.shadow.camera.right = 24; sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28; sun.shadow.bias = -.0004; scene.add(sun);
  const fill = new THREE.DirectionalLight("#c6dbb1", .7); fill.position.set(12, 9, -12); scene.add(fill);
  courtGroup = new THREE.Group(); scene.add(courtGroup);
  playerGroup = new THREE.Group(); scene.add(playerGroup);
  buildCourt();
  state.players = [];
  for (let i = 0; i < 3; i++) state.players.push(createPlayer("home", i), createPlayer("away", i));
  createBall();
  clock = new THREE.Clock();
  if (!state.renderer) {
    state.renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    state.renderer.shadowMap.enabled = true; state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    state.renderer.outputColorSpace = THREE.SRGBColorSpace; state.renderer.toneMapping = THREE.ACESFilmicToneMapping; state.renderer.toneMappingExposure = 1.13;
  }
  resizeRenderer();
  state.sceneBuilt = true;
  resetPositions();
}
function resizeRenderer() {
  if (!state.renderer || !camera) return;
  const rect = ui.canvas.getBoundingClientRect(), width = Math.max(1, rect.width), height = Math.max(1, rect.height);
  state.renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
}
function resetPositions() {
  state.players.forEach(p => {
    p.root.position.set((p.index - 1) * 2.6, 0, p.team === "home" ? 6.8 + p.index * .6 : -6.8 - p.index * .6);
    p.root.rotation.y = p.team === "home" ? Math.PI : 0;
    p.vx = 0; p.vz = 0; p.celebrate = 0; p.tackleCooldown = 0;
    p.ring.material.opacity = p.team === "home" && p.index === 0 ? .95 : .28;
  });
  state.carrier = state.players.find(p => p.team === "home" && p.index === 0) || null;
  state.ball = { x: 0, y: .27, z: 5.95, vx: 0, vy: 0, vz: 0, spin: 0, lastTeam: "home" };
  updateBallVisual(0);
}
function startMatch() {
  state.playerName = (ui.playerName.value || "PLAYER").trim().slice(0, 14).toUpperCase() || "PLAYER";
  state.kit = ui.kitColor.value || "#c9ff35"; state.skin = ui.skinTone.value || "#b77952";
  state.venue = ui.courtVenue.value || "accra"; state.duration = Number(ui.matchDuration.value) || 120;
  if (state.sceneBuilt && state.venue !== state.builtVenue) {
    if (state.renderer) { state.renderer.dispose(); state.renderer = null; }
    state.sceneBuilt = false; scene = camera = clock = courtGroup = playerGroup = ballMesh = ballShadow = ballRing = null;
  }
  if (!state.sceneBuilt) {
    try { buildScene(); state.builtVenue = state.venue; }
    catch (error) { console.error("SMALL POLES scene failed:", error); setHint("3D could not start. Refresh the page and make sure WebGL is available."); return; }
  } else {
    // Update the player kit when a new run starts without rebuilding the venue.
    state.players.forEach(p => {
      if (p.team === "home") {
        p.body.traverse(obj => { if (obj.isMesh && obj.material?.color && obj.material.color.getHexString() === "c9ff35") obj.material.color.set(state.kit); });
      }
    });
  }
  state.remaining = state.duration; state.homeScore = 0; state.awayScore = 0; state.elapsed = 0;
  state.lastShot = -10; state.lastPass = -10; state.lastTackle = -10; state.aiCooldown = 0;
  state.lastGoal = -10; state.goalFlash = 0; state.celebration = 0; state.effects = []; state.scoreSaved = false;
  resetPositions(); updateScore(); state.phase = "playing";
  ui.intro.hidden = true; ui.game.hidden = false; ui.pauseOverlay.hidden = true; ui.resultOverlay.hidden = true;
  ui.pause.textContent = "Ⅱ PAUSE"; ui.matchTitle.textContent = "SMALL POLES · 3V3";
  ui.homeTeamName.textContent = state.playerName; ui.venue.textContent = ({ accra: "ACCRA · THE COMPOUND", jamestown: "JAMESTOWN · THE HARBOUR", kumasi: "KUMASI · THE RED COURT" })[state.venue] || "ACCRA · THE COMPOUND";
  setHint("You're on the ball. Move into space, press J to shoot, K to pass.");
  resizeRenderer(); clock.start(); state.lastTime = 0; paintCareer(); requestAnimationFrame(gameLoop);
  ui.game.scrollIntoView({ behavior: "smooth", block: "start" });
}
function updateScore() {
  ui.homeScore.textContent = String(state.homeScore); ui.awayScore.textContent = String(state.awayScore);
  ui.clock.textContent = formatTime(state.remaining);
}
function formatTime(t) { const n = Math.max(0, Math.ceil(t)); return String(Math.floor(n / 60)).padStart(2, "0") + ":" + String(n % 60).padStart(2, "0"); }
function finishMatch() {
  if (state.phase === "finished") return;
  state.phase = "finished"; state.remaining = 0; updateScore(); state.keys.clear(); state.touch.clear(); saveCareer();
  if (state.homeScore > state.awayScore) {
    ui.resultHeadline.textContent = "THE BLOCK IS YOURS.";
    ui.resultSummary.textContent = "You ran the court. The neighbourhood will remember this one.";
  } else if (state.homeScore < state.awayScore) {
    ui.resultHeadline.textContent = "RUN IT BACK.";
    ui.resultSummary.textContent = "They took this round. Learn the angles and come back sharper.";
  } else {
    ui.resultHeadline.textContent = "STILL UNSETTLED.";
    ui.resultSummary.textContent = "Dead level. One more match decides who owns the block.";
  }
  ui.resultScore.textContent = state.homeScore + " — " + state.awayScore; ui.resultOverlay.hidden = false;
}
function scoreGoal(team) {
  if (state.elapsed - state.lastGoal < 1) return;
  state.lastGoal = state.elapsed; state.goalFlash = .8; state.celebration = 1.3;
  if (team === "home") {
    state.homeScore++; state.players.filter(p => p.team === "home").forEach(p => p.celebrate = 1.4);
    setHint("GOAL! You found the net. The court is yours."); playSound("goal");
  } else {
    state.awayScore++; state.players.filter(p => p.team === "away").forEach(p => p.celebrate = 1.4);
    setHint("They scored. Reset, press, and answer back."); playSound("goal");
  }
  updateScore(); resetPositions();
  const node = team === "home" ? ui.homeScore : ui.awayScore; node.classList.remove("score-pop"); void node.offsetWidth; node.classList.add("score-pop");
}
function nearestPlayer(x, z, team = null, exclude = null) {
  let chosen = null, best = Infinity;
  for (const p of state.players) {
    if ((team && p.team !== team) || p === exclude) continue;
    const d = Math.hypot(p.root.position.x - x, p.root.position.z - z);
    if (d < best) { best = d; chosen = p; }
  }
  return chosen;
}
function userInput() {
  let x = 0, z = 0;
  if (state.keys.has("KeyA") || state.keys.has("ArrowLeft") || state.touch.has("left")) x--;
  if (state.keys.has("KeyD") || state.keys.has("ArrowRight") || state.touch.has("right")) x++;
  if (state.keys.has("KeyW") || state.keys.has("ArrowUp") || state.touch.has("up")) z--;
  if (state.keys.has("KeyS") || state.keys.has("ArrowDown") || state.touch.has("down")) z++;
  const len = Math.hypot(x, z); return len > 0 ? { x: x / len, z: z / len } : { x: 0, z: 0 };
}
function shoot(player) {
  if (state.phase !== "playing" || state.carrier !== player || state.elapsed - state.lastShot < .28) return;
  const b = state.ball, input = userInput();
  let dx = input.x, dz = input.z;
  if (Math.hypot(dx, dz) < .1) { dx = -player.root.position.x * .13; dz = player.team === "home" ? -1 : 1; }
  // Bias a shot toward the opponent's goal while preserving directional aim.
  dz = player.team === "home" ? Math.min(-.32, dz - .28) : Math.max(.32, dz + .28);
  const len = Math.hypot(dx, dz) || 1; dx /= len; dz /= len;
  state.carrier = null; b.vx = dx * 13.5 + player.vx * .25; b.vz = dz * 13.5 + player.vz * .25;
  b.vy = 2.5 + Math.min(2.5, Math.abs(input.x) * .8); b.spin = dx * .25; b.lastTeam = player.team;
  state.lastShot = state.elapsed; player.root.rotation.y = Math.atan2(dx, dz); playSound("kick");
  setHint(player.team === "home" ? "SHOT AWAY! Follow the rebound." : "The visitors have fired a shot.");
}
function passBall(player) {
  if (state.phase !== "playing") return;
  if (state.carrier === player) {
    if (state.elapsed - state.lastPass < .22) return;
    const teammates = state.players.filter(p => p.team === player.team && p !== player);
    const target = teammates.sort((a, b) => {
      const aa = Math.hypot(a.root.position.x - player.root.position.x, a.root.position.z - player.root.position.z);
      const bb = Math.hypot(b.root.position.x - player.root.position.x, b.root.position.z - player.root.position.z);
      return aa - bb;
    })[0];
    const dx = target.root.position.x - state.ball.x + target.vx * .22, dz = target.root.position.z - state.ball.z + target.vz * .22;
    const len = Math.hypot(dx, dz) || 1;
    state.carrier = null; state.ball.vx = dx / len * 8.5; state.ball.vz = dz / len * 8.5; state.ball.vy = .55; state.ball.lastTeam = player.team;
    state.lastPass = state.elapsed; playSound("kick"); setHint("Pass played. Move into space for the return.");
  } else {
    const target = nearestPlayer(player.root.position.x, player.root.position.z, player.team === "home" ? "away" : "home");
    if (!target) return;
    const d = Math.hypot(target.root.position.x - player.root.position.x, target.root.position.z - player.root.position.z);
    if (d < 1.75 && state.elapsed - state.lastTackle > .65) {
      attemptTackle(player, target); state.lastTackle = state.elapsed;
    } else setHint("Close down the ball carrier to tackle. Hold K while moving toward them.");
  }
}
function attemptTackle(defender, carrier) {
  if (!carrier || state.carrier !== carrier || defender.team === carrier.team || defender.tackleCooldown > 0) return;
  const d = Math.hypot(defender.root.position.x - carrier.root.position.x, defender.root.position.z - carrier.root.position.z);
  if (d > 1.85) return;
  const facing = new THREE.Vector3(Math.sin(defender.root.rotation.y), 0, Math.cos(defender.root.rotation.y));
  const toward = new THREE.Vector3(carrier.root.position.x - defender.root.position.x, 0, carrier.root.position.z - defender.root.position.z).normalize();
  const aligned = facing.dot(toward);
  if (aligned > -.25 || d < 1.0) {
    state.carrier = defender; defender.tackleCooldown = .65; carrier.tackleCooldown = .9;
    playSound("tackle"); setHint(defender.team === "home" ? "CLEAN WIN! Get your head up and play." : "They won the ball. Press to win it back.");
  }
}
function updateUser(player, dt) {
  const v = userInput(), sprint = state.keys.has("ShiftLeft") || state.keys.has("ShiftRight") || state.touch.has("sprint");
  const max = player.speed * (sprint ? (state.carrier === player ? 1.22 : 1.45) : 1);
  const accel = 20;
  player.vx += (v.x * max - player.vx) * Math.min(1, accel * dt);
  player.vz += (v.z * max - player.vz) * Math.min(1, accel * dt);
  if (Math.hypot(v.x, v.z) > .05) player.root.rotation.y = Math.atan2(v.x, v.z);
}
function updateAI(player, dt) {
  const home = player.team === "home", hasBall = state.carrier === player, carrier = state.carrier;
  let tx = player.root.position.x, tz = player.root.position.z;
  if (hasBall) {
    tx = player.root.position.x * .3;
    tz = home ? -FIELD.halfL + 3.3 : FIELD.halfL - 3.3;
    const enemy = nearestPlayer(player.root.position.x, player.root.position.z, home ? "away" : "home");
    const underPressure = enemy && Math.hypot(enemy.root.position.x - player.root.position.x, enemy.root.position.z - player.root.position.z) < 2.4;
    const goalDist = Math.abs((home ? -FIELD.halfL : FIELD.halfL) - player.root.position.z);
    player.actionCooldown -= dt;
    if (player.actionCooldown <= 0 && (goalDist < 8.5 || underPressure)) {
      if (Math.random() < .68 || goalDist < 5) aiShoot(player);
      else aiPass(player);
      player.actionCooldown = 1.1 + Math.random() * .5;
      return;
    }
    // Carriers cut toward the goal, with a small lateral variation to find an angle.
    tx += Math.sin(state.elapsed * 1.4 + player.index * 2) * 1.1;
  } else if (carrier && carrier.team !== player.team) {
    const distanceToBall = Math.hypot(player.root.position.x - state.ball.x, player.root.position.z - state.ball.z);
    if ((home && player.index === 0) || distanceToBall < 7.5) { tx = carrier.root.position.x; tz = carrier.root.position.z; }
    else { tx = carrier.root.position.x * .45; tz = home ? carrier.root.position.z + 3 + player.index * .8 : carrier.root.position.z - 3 - player.index * .8; }
  } else if (carrier && carrier.team === player.team) {
    const lane = (player.index - 1) * 3.2;
    tx = THREE.MathUtils.clamp(carrier.root.position.x + lane, -7.2, 7.2);
    tz = carrier.root.position.z + (home ? 3.2 : -3.2);
  } else {
    const nearest = nearestPlayer(state.ball.x, state.ball.z, player.team);
    if (nearest === player || Math.hypot(player.root.position.x - state.ball.x, player.root.position.z - state.ball.z) < 5) {
      tx = state.ball.x; tz = state.ball.z;
    } else {
      tx = (player.index - 1) * 3.4; tz = home ? 5.5 + player.index : -5.5 - player.index;
    }
  }
  const dx = tx - player.root.position.x, dz = tz - player.root.position.z, len = Math.hypot(dx, dz);
  const speed = player.speed * (hasBall ? .82 : 1);
  player.vx += ((len > .1 ? dx / len * speed : 0) - player.vx) * Math.min(1, 7 * dt);
  player.vz += ((len > .1 ? dz / len * speed : 0) - player.vz) * Math.min(1, 7 * dt);
  if (len > .15) player.root.rotation.y = Math.atan2(dx, dz);
}
function aiShoot(player) {
  const b = state.ball, targetZ = player.team === "home" ? -FIELD.halfL : FIELD.halfL;
  const dx = -b.x * .15 - b.x, dz = targetZ - b.z, len = Math.hypot(dx, dz) || 1;
  state.carrier = null; b.vx = dx / len * 12.5; b.vz = dz / len * 12.5; b.vy = 2.3; b.lastTeam = player.team;
  playSound("kick");
}
function aiPass(player) {
  const mate = state.players.filter(p => p.team === player.team && p !== player).sort((a, b) => Math.abs(a.root.position.z - player.root.position.z) - Math.abs(b.root.position.z - player.root.position.z))[0];
  if (!mate) { aiShoot(player); return; }
  const dx = mate.root.position.x - state.ball.x, dz = mate.root.position.z - state.ball.z, len = Math.hypot(dx, dz) || 1;
  state.carrier = null; state.ball.vx = dx / len * 7.6; state.ball.vz = dz / len * 7.6; state.ball.vy = .4; state.ball.lastTeam = player.team;
}
function updatePlayers(dt) {
  for (const p of state.players) {
    if (p.celebrate > 0) p.celebrate = Math.max(0, p.celebrate - dt);
    if (p.team === "home" && p.index === 0) updateUser(p, dt); else updateAI(p, dt);
    const pos = p.root.position; pos.x += p.vx * dt; pos.z += p.vz * dt;
    pos.x = THREE.MathUtils.clamp(pos.x, -FIELD.halfW + .85, FIELD.halfW - .85);
    pos.z = THREE.MathUtils.clamp(pos.z, -FIELD.halfL + .9, FIELD.halfL - .9);
    const moving = Math.hypot(p.vx, p.vz) > .3; p.run += dt * (moving ? 10 : 2);
    const stride = moving ? Math.sin(p.run) * .55 : 0;
    p.legs[0].rotation.x = stride; p.legs[1].rotation.x = -stride;
    p.arms[0].rotation.x = -stride * .6; p.arms[1].rotation.x = stride * .6;
    p.body.position.y = p.celebrate > 0 ? Math.abs(Math.sin(p.celebrate * 11)) * .23 : Math.abs(Math.sin(p.run * 2)) * (moving ? .035 : .006);
    if (p.celebrate > 0) { p.arms[0].rotation.z = -.8; p.arms[1].rotation.z = .8; }
    else { p.arms[0].rotation.z = 0; p.arms[1].rotation.z = 0; }
  }
  // Simple separation makes body contact legible and prevents player stacking.
  for (let i = 0; i < state.players.length; i++) for (let j = i + 1; j < state.players.length; j++) {
    const a = state.players[i], b = state.players[j], dx = b.root.position.x - a.root.position.x, dz = b.root.position.z - a.root.position.z;
    const d = Math.hypot(dx, dz); if (d > 0 && d < .82) {
      const push = (.82 - d) * .5, nx = dx / d, nz = dz / d;
      a.root.position.x -= nx * push; a.root.position.z -= nz * push;
      b.root.position.x += nx * push; b.root.position.z += nz * push;
    }
  }
}
function updateBall(dt) {
  const b = state.ball;
  if (state.carrier) {
    const p = state.carrier, facing = p.root.rotation.y;
    b.x = p.root.position.x + Math.sin(facing) * .63;
    b.z = p.root.position.z + Math.cos(facing) * .63;
    b.y = .29 + Math.abs(Math.sin(p.run * 2)) * (Math.hypot(p.vx, p.vz) > 1 ? .1 : .025);
    b.vx = p.vx; b.vz = p.vz; b.vy = 0;
  } else {
    b.vy -= 9.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.vx *= Math.pow(.992, dt * 60); b.vz *= Math.pow(.992, dt * 60); b.spin *= Math.pow(.96, dt * 60);
    if (b.y < .25) { b.y = .25; if (Math.abs(b.vy) > .65) b.vy *= -.43; else b.vy = 0; b.vx *= .985; b.vz *= .985; }
    if (b.x < -FIELD.halfW + .35 || b.x > FIELD.halfW - .35) {
      b.x = THREE.MathUtils.clamp(b.x, -FIELD.halfW + .35, FIELD.halfW - .35); b.vx *= -.72; b.vz += (Math.random() - .5) * .8;
    }
    // Goal detection: the ball must cross the end line inside the net aperture.
    if (b.z < -FIELD.halfL + .15 && Math.abs(b.x) < FIELD.goalW - .12 && b.y < FIELD.goalH) { if (b.lastTeam === "home") scoreGoal("home"); else scoreGoal("away"); return; }
    if (b.z > FIELD.halfL - .15 && Math.abs(b.x) < FIELD.goalW - .12 && b.y < FIELD.goalH) { if (b.lastTeam === "away") scoreGoal("away"); else scoreGoal("home"); return; }
    if (b.z < -FIELD.halfL + .4) { b.z = -FIELD.halfL + .4; b.vz = Math.abs(b.vz) * .76; }
    if (b.z > FIELD.halfL - .4) { b.z = FIELD.halfL - .4; b.vz = -Math.abs(b.vz) * .76; }
    const speed = Math.hypot(b.vx, b.vz);
    let nearest = null, best = Infinity;
    for (const p of state.players) {
      const d = Math.hypot(p.root.position.x - b.x, p.root.position.z - b.z);
      if (d < .68 && (speed < 9.5 || d < .34) && d < best && b.y < 1.15) { nearest = p; best = d; }
    }
    if (nearest) { state.carrier = nearest; b.vx = 0; b.vz = 0; b.vy = 0; if (nearest.team === "home") setHint("BALL WON. Find a pass or take the shot."); }
  }
  // The player nearest the ball can nudge a loose ball with a quick first touch.
  if (!state.carrier && b.y < .5 && Math.hypot(b.vx, b.vz) < 1.4) {
    const p = nearestPlayer(b.x, b.z);
    if (p && Math.hypot(p.root.position.x - b.x, p.root.position.z - b.z) < .85) state.carrier = p;
  }
  updateBallVisual(dt);
}
function updateBallVisual(dt) {
  if (!state.ball || !ballMesh) return;
  const b = state.ball;
  ballMesh.position.set(b.x, b.y, b.z); ballMesh.rotation.x += b.vz * dt * 1.5; ballMesh.rotation.z -= b.vx * dt * 1.5;
  ballShadow.position.set(b.x, .03, b.z); ballShadow.scale.setScalar(THREE.MathUtils.clamp(1.1 - b.y * .22, .45, 1));
  ballShadow.material.opacity = THREE.MathUtils.clamp(.34 - (b.y - .25) * .13, .08, .34);
  ballRing.position.set(b.x, .035, b.z); ballRing.material.opacity = state.carrier?.team === "home" ? .8 : .3;
}
function updateCamera(dt) {
  const b = state.ball, user = state.players.find(p => p.team === "home" && p.index === 0);
  const targetX = THREE.MathUtils.clamp(b.x * .14 + user.root.position.x * .06, -1.5, 1.5);
  const targetZ = THREE.MathUtils.clamp(b.z * .11, -1.8, 1.8);
  const desired = new THREE.Vector3(targetX, 22.5, 30 + targetZ);
  camera.position.lerp(desired, 1 - Math.exp(-dt * 1.15));
  cameraLook.lerp(new THREE.Vector3(targetX * .2, .25, targetZ * .25), 1 - Math.exp(-dt * 1.6));
  camera.lookAt(cameraLook);
}
function updateEffects(dt) {
  state.goalFlash = Math.max(0, state.goalFlash - dt);
  for (const fx of state.effects) { fx.life -= dt; fx.mesh.scale.multiplyScalar(1 + dt * 2); fx.mesh.material.opacity = Math.max(0, fx.life / fx.maxLife); }
  state.effects = state.effects.filter(fx => { if (fx.life <= 0) { scene.remove(fx.mesh); fx.mesh.geometry.dispose(); fx.mesh.material.dispose(); return false; } return true; });
}
function gameLoop() {
  if (state.phase !== "playing") return;
  const dt = Math.min(clock.getDelta(), .035);
  state.elapsed += dt; state.remaining = Math.max(0, state.remaining - dt);
  updatePlayers(dt);
  const user = state.players.find(p => p.team === "home" && p.index === 0);
  if ((state.keys.has("KeyK") || state.touch.has("pass")) && state.carrier && state.carrier.team !== "home" && user.tackleCooldown <= 0) {
    const d = Math.hypot(user.root.position.x - state.carrier.root.position.x, user.root.position.z - state.carrier.root.position.z);
    if (d < 1.7 && state.elapsed - state.lastTackle > .35) { attemptTackle(user, state.carrier); state.lastTackle = state.elapsed; }
  }
  updateBall(dt); updateCamera(dt); updateEffects(dt);
  ui.clock.textContent = formatTime(state.remaining);
  if (state.remaining <= 0) { finishMatch(); }
  if (state.renderer && scene && camera) state.renderer.render(scene, camera);
  if (state.phase === "playing") requestAnimationFrame(gameLoop);
}
function togglePause() {
  if (state.phase === "playing") {
    state.phase = "paused"; ui.pauseOverlay.hidden = false; ui.pause.textContent = "▶ RESUME"; state.keys.clear(); state.touch.clear();
  } else if (state.phase === "paused") {
    state.phase = "playing"; ui.pauseOverlay.hidden = true; ui.pause.textContent = "Ⅱ PAUSE"; clock.start(); requestAnimationFrame(gameLoop);
  }
}
function returnToMenu() {
  state.phase = "menu"; state.keys.clear(); state.touch.clear();
  ui.game.hidden = true; ui.intro.hidden = false; ui.pauseOverlay.hidden = true; ui.resultOverlay.hidden = true;
  paintCareer(); ui.intro.scrollIntoView({ behavior: "smooth", block: "start" });
}
function handleAction(action) {
  const user = state.players.find(p => p.team === "home" && p.index === 0);
  if (state.phase !== "playing" || !user) return;
  if (action === "shoot") shoot(user);
  if (action === "pass") passBall(user);
}
document.addEventListener("keydown", event => {
  const code = event.code;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(code)) event.preventDefault();
  if (code === "Escape") { togglePause(); return; }
  if (state.phase !== "playing") return;
  if (["KeyJ", "KeyK"].includes(code) && !event.repeat) { if (code === "KeyJ") handleAction("shoot"); else handleAction("pass"); return; }
  state.keys.add(code);
});
document.addEventListener("keyup", event => state.keys.delete(event.code));
window.addEventListener("blur", () => { state.keys.clear(); state.touch.clear(); document.querySelectorAll("[data-control].is-active").forEach(b => b.classList.remove("is-active")); });
document.querySelectorAll("[data-control]").forEach(button => {
  const control = button.dataset.control;
  const down = event => {
    event.preventDefault(); if (state.phase !== "playing") return;
    if (control === "shoot" || control === "pass") handleAction(control);
    else state.touch.add(control);
    button.classList.add("is-active");
    if (button.setPointerCapture && event.pointerId !== undefined) { try { button.setPointerCapture(event.pointerId); } catch {} }
  };
  const up = event => { if (event) event.preventDefault(); state.touch.delete(control); button.classList.remove("is-active"); };
  button.addEventListener("pointerdown", down); button.addEventListener("pointerup", up);
  button.addEventListener("pointercancel", up); button.addEventListener("lostpointercapture", up);
  button.addEventListener("contextmenu", event => event.preventDefault());
});
ui.start.addEventListener("click", startMatch); ui.pause.addEventListener("click", togglePause);
ui.resume.addEventListener("click", togglePause); ui.restart.addEventListener("click", startMatch);
ui.back.addEventListener("click", returnToMenu); ui.playAgain.addEventListener("click", startMatch);
ui.resultMenu.addEventListener("click", returnToMenu);
ui.playerName.addEventListener("input", paintCareer);
window.addEventListener("resize", resizeRenderer);
paintCareer();
