import * as THREE from 'three';
import { clamp, distance2, damp } from '../utils/math.js';

const WALK_SPEED = 6.2;
const SPRINT_SPEED = 9.8;
const ACCEL = 26;
const DECEL = 32;
const TURN_SPEED = 14;
const STAMINA_DRAIN = 0.24;
const STAMINA_RECOVER = 0.28;
const TACKLE_RANGE = 1.45;
const CONTROL_RANGE = 1.05;
const DRIBBLE_SPEED_MUL = 0.88;

let playerIdCounter = 0;

export class Player {
  constructor(scene, options = {}) {
    this.id = playerIdCounter++;
    this.team = options.team || 0;
    this.isHuman = options.isHuman || false;
    this.number = options.number || 1;
    this.colour = options.colour || (this.team === 0 ? 0x00a86b : 0xc41e3a);
    this.position = new THREE.Vector3(options.x || 0, 0, options.z || 0);
    this.velocity = new THREE.Vector3();
    this.facing = options.facing || 0;
    this.speed = 0;
    this.stamina = 1;
    this.hasBall = false;
    this.actionCooldown = 0;
    this.tackleTimer = 0;
    this.state = 'idle';
    this._wasShooting = false;
    this._shootCharge = 0;
    this._buildMesh(scene);
  }

  _buildMesh(scene) {
    const group = new THREE.Group();
    const torsoMat = new THREE.MeshStandardMaterial({ color: this.colour, roughness: 0.65, metalness: 0.1 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 4, 8), torsoMat);
    torso.position.y = 1.05; torso.castShadow = true; group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc4a484, roughness: 0.7 }));
    head.position.y = 1.72; head.castShadow = true; group.add(head);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8 });
    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 3, 6), legMat);
    leftLeg.position.set(-0.14, 0.45, 0); leftLeg.castShadow = true; group.add(leftLeg);
    const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 3, 6), legMat);
    rightLeg.position.set(0.14, 0.45, 0); rightLeg.castShadow = true; group.add(rightLeg);
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 3, 6), torsoMat);
    leftArm.position.set(-0.38, 1.15, 0); leftArm.castShadow = true; group.add(leftArm);
    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 3, 6), torsoMat);
    rightArm.position.set(0.38, 1.15, 0); rightArm.castShadow = true; group.add(rightArm);
    const numCanvas = document.createElement('canvas');
    numCanvas.width = 64; numCanvas.height = 64;
    const ctx = numCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(this.number), 32, 34);
    const numMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(numCanvas), transparent: true }));
    numMesh.position.set(0, 1.15, 0.29); group.add(numMesh);
    this.mesh = group; this.mesh.position.copy(this.position); scene.add(this.mesh);
    this.parts = { torso, leftLeg, rightLeg, leftArm, rightArm, head };
  }

  update(dt, input, ball, pitch, teammates, opponents) {
    this.actionCooldown = Math.max(0, this.actionCooldown - dt);
    this.tackleTimer = Math.max(0, this.tackleTimer - dt);
    if (this.isHuman) this._humanControl(dt, input, ball, pitch, teammates);
    else this._aiControl(dt, ball, pitch, teammates, opponents);

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    const hw = pitch.width / 2 - 0.4;
    const hd = pitch.depth / 2 - 0.4;
    this.position.x = clamp(this.position.x, -hw, hw);
    this.position.z = clamp(this.position.z, -hd, hd);

    if (this.speed > 0.25) {
      const targetFacing = Math.atan2(this.velocity.x, this.velocity.z);
      let diff = targetFacing - this.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.facing += clamp(diff, -TURN_SPEED * dt, TURN_SPEED * dt);
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.facing;
    this._animate(dt);

    if (!ball.owner && this.actionCooldown <= 0) {
      const d = ball.distanceTo(this.position.x, this.position.z);
      const canControl = ball.onGround || ball.position.y < 0.6;
      if (d < CONTROL_RANGE && canControl) {
        const ballSpeed = Math.hypot(ball.velocity.x, ball.velocity.z);
        if (ballSpeed < 12 || d < CONTROL_RANGE * 0.55) {
          ball.setOwner(this);
          this.hasBall = true;
        }
      }
    } else if (ball.owner === this) this.hasBall = true;
    else this.hasBall = false;
  }

  _humanControl(dt, input, ball, pitch, teammates = []) {
    const mx = input.moveX;
    const mz = input.moveZ;
    const moving = Math.hypot(mx, mz) > 0.08;
    const wantSprint = input.sprint && this.stamina > 0.05;

    let targetSpeed = 0;
    if (moving) {
      targetSpeed = wantSprint ? SPRINT_SPEED : WALK_SPEED;
      if (this.hasBall) targetSpeed *= DRIBBLE_SPEED_MUL;
      if (wantSprint) {
        this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * dt);
        this.state = 'sprint';
      } else {
        this.state = 'run';
        this.stamina = Math.min(1, this.stamina + STAMINA_RECOVER * dt * 0.5);
      }
    } else {
      this.state = 'idle';
      this.stamina = Math.min(1, this.stamina + STAMINA_RECOVER * dt);
    }

    const desiredVx = mx * targetSpeed;
    const desiredVz = mz * targetSpeed;
    const speedingUp = Math.hypot(desiredVx, desiredVz) > Math.hypot(this.velocity.x, this.velocity.z);
    const rate = speedingUp ? ACCEL : DECEL;
    this.velocity.x = damp(this.velocity.x, desiredVx, rate, dt);
    this.velocity.z = damp(this.velocity.z, desiredVz, rate, dt);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);

    if (this.hasBall && ball.owner === this) {
      if (input.consume('pass') && this.actionCooldown <= 0) this._doPass(ball, teammates);
      if (!input.shoot && this._wasShooting && this.actionCooldown <= 0) {
        const power = Math.max(0.3, Math.min(1.2, this._shootCharge || 0.45));
        this._doShoot(ball, power, pitch);
        this._shootCharge = 0;
      }
      if (input.shoot) {
        this._wasShooting = true;
        this._shootCharge = input.shootHeld;
      } else this._wasShooting = false;
    } else {
      this._wasShooting = false;
      this._shootCharge = 0;
      if (input.consume('tackle') && this.actionCooldown <= 0) this._doTackle(ball);
    }
  }

  _doPass(ball, teammates = []) {
    let best = null;
    let bestScore = -9999;
    for (const t of teammates) {
      if (t === this) continue;
      const d = distance2(this.position.x, this.position.z, t.position.x, t.position.z);
      if (d < 1.8 || d > 16) continue;
      const progress = this.team === 0 ? (this.position.z - t.position.z) : (t.position.z - this.position.z);
      const score = progress * 2 - d * 0.3;
      if (score > bestScore) { bestScore = score; best = t; }
    }
    if (best) {
      this.passTo(ball, best.position.x + best.velocity.x * 0.25, best.position.z + best.velocity.z * 0.25);
    } else {
      ball.kick(Math.sin(this.facing), Math.cos(this.facing), 13, 0.7);
      this.hasBall = false; this.actionCooldown = 0.3; this.state = 'kick';
    }
  }

  _doShoot(ball, power, pitch = null) {
    let dirX = Math.sin(this.facing);
    let dirZ = Math.cos(this.facing);
    if (pitch) {
      const goalZ = this.team === 0 ? -pitch.depth / 2 : pitch.depth / 2;
      const toGoalX = 0 - this.position.x;
      const toGoalZ = goalZ - this.position.z;
      const glen = Math.hypot(toGoalX, toGoalZ) || 1;
      const gx = toGoalX / glen;
      const gz = toGoalZ / glen;
      const align = dirX * gx + dirZ * gz;
      if (align > 0.15) {
        const assist = 0.35 + Math.min(0.35, power * 0.15);
        dirX = dirX * (1 - assist) + gx * assist;
        dirZ = dirZ * (1 - assist) + gz * assist;
        const n = Math.hypot(dirX, dirZ) || 1;
        dirX /= n; dirZ /= n;
      }
    }
    ball.kick(dirX, dirZ, 11 + power * 17, 1.2 + power * 2.8);
    this.hasBall = false; this.actionCooldown = 0.45; this.state = 'kick';
  }

  shootAt(ball, targetX, targetZ, power = 1) {
    const dx = targetX - this.position.x, dz = targetZ - this.position.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    ball.kick(dx / len, dz / len, 10 + power * 14, 1.2 + power * 2);
    this.hasBall = false; this.actionCooldown = 0.5; this.state = 'kick';
  }

  passTo(ball, targetX, targetZ) {
    const dx = targetX - this.position.x, dz = targetZ - this.position.z;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    ball.kick(dx / len, dz / len, clamp(6 + len * 0.85, 7, 18), 0.45 + len * 0.02);
    this.hasBall = false; this.actionCooldown = 0.28; this.state = 'kick';
  }

  _doTackle(ball) {
    this.tackleTimer = 0.35; this.actionCooldown = 0.55; this.state = 'tackle';
    const tx = ball.position.x - this.position.x;
    const tz = ball.position.z - this.position.z;
    const tlen = Math.hypot(tx, tz) || 1;
    this.velocity.x += (tx / tlen) * 4;
    this.velocity.z += (tz / tlen) * 4;
    if (ball.owner && ball.owner.team !== this.team) {
      const d = distance2(this.position.x, this.position.z, ball.owner.position.x, ball.owner.position.z);
      if (d < TACKLE_RANGE) {
        const chance = 0.5 + (1 - d / TACKLE_RANGE) * 0.35;
        if (Math.random() < chance) {
          ball.owner.hasBall = false; ball.setOwner(null);
          ball.kick(Math.sin(Math.atan2(tx, tz)), Math.cos(Math.atan2(tx, tz)), 5 + Math.random() * 5, 0.6);
        }
      }
    } else if (!ball.owner) {
      if (ball.distanceTo(this.position.x, this.position.z) < TACKLE_RANGE * 1.35) {
        ball.setOwner(this); this.hasBall = true;
      }
    }
  }

  _aiControl(dt, ball, pitch, teammates, opponents) {
    const goalZ = this.team === 0 ? -pitch.depth / 2 : pitch.depth / 2;
    const ownGoalZ = this.team === 0 ? pitch.depth / 2 : -pitch.depth / 2;
    const ballPos = ball.position;
    let targetX = this.position.x, targetZ = this.position.z, wantSprint = false;
    const distBall = ball.distanceTo(this.position.x, this.position.z);
    const hasPossession = ball.owner && ball.owner.team === this.team;
    const iHaveBall = ball.owner === this;
    if (iHaveBall) {
      targetX = ballPos.x * 0.25; targetZ = goalZ * 0.75;
      wantSprint = Math.abs(this.position.z - goalZ) > 5;
      if (this.actionCooldown <= 0) {
        const toGoal = Math.abs(this.position.z - goalZ);
        if (toGoal < 11 && Math.random() < 0.09) {
          this.shootAt(ball, (Math.random() - 0.5) * 2.2, goalZ, 0.8 + Math.random() * 0.2);
        } else if (Math.random() < 0.05 && teammates.length > 1) {
          let best = null, bestScore = -999;
          for (const t of teammates) {
            if (t === this) continue;
            const score = this.team === 0 ? -t.position.z : t.position.z;
            if (score > bestScore) { bestScore = score; best = t; }
          }
          if (best) this.passTo(ball, best.position.x, best.position.z);
        }
      }
    } else if (!hasPossession) {
      if (distBall < 12 || !ball.owner) {
        targetX = ballPos.x; targetZ = ballPos.z; wantSprint = distBall > 2.2;
        if (distBall < TACKLE_RANGE * 1.4 && this.actionCooldown <= 0 && Math.random() < 0.12) this._doTackle(ball);
      } else {
        targetX = ballPos.x * 0.5; targetZ = (ballPos.z + ownGoalZ) * 0.5;
      }
    } else {
      const supportOffset = (this.number % 2 === 0 ? 1 : -1) * 2.8;
      targetX = ballPos.x + supportOffset;
      targetZ = ballPos.z + (this.team === 0 ? -3.2 : 3.2);
      wantSprint = distBall > 6;
    }
    const dx = targetX - this.position.x, dz = targetZ - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;
    const spd = (wantSprint && this.stamina > 0.1) ? SPRINT_SPEED * 0.92 : WALK_SPEED * 0.95;
    if (wantSprint) this.stamina = Math.max(0, this.stamina - STAMINA_DRAIN * dt * 0.7);
    else this.stamina = Math.min(1, this.stamina + STAMINA_RECOVER * dt);
    this.velocity.x = damp(this.velocity.x, (dx / dist) * spd, ACCEL * 0.7, dt);
    this.velocity.z = damp(this.velocity.z, (dz / dist) * spd, ACCEL * 0.7, dt);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.state = this.speed > 6 ? 'sprint' : this.speed > 1 ? 'run' : 'idle';
  }

  _animate(dt) {
    const t = performance.now() * 0.001;
    const runCycle = Math.sin(t * (this.state === 'sprint' ? 14 : 9) * this.speed * 0.3);
    if (this.parts.leftLeg) {
      this.parts.leftLeg.rotation.x = runCycle * 0.6;
      this.parts.rightLeg.rotation.x = -runCycle * 0.6;
      this.parts.leftArm.rotation.x = -runCycle * 0.4;
      this.parts.rightArm.rotation.x = runCycle * 0.4;
    }
    this.mesh.rotation.x = (this.state === 'tackle' && this.tackleTimer > 0) ? 0.35 : 0;
  }
}
