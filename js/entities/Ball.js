import * as THREE from 'three';
import { clamp, distance2 } from '../utils/math.js';

const BALL_RADIUS = 0.22;
const GRAVITY = 18.5;
const BOUNCE = 0.58;
const GROUND_FRICTION = 5.2;
const AIR_DRAG = 0.85;
const STOP_SPEED = 0.08;
const MAX_SPEED = 32;
const MAGNUS = 0.12;

export class Ball {
  constructor(scene) {
    this.radius = BALL_RADIUS;
    this.position = new THREE.Vector3(0, BALL_RADIUS, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.angular = new THREE.Vector3(0, 0, 0);
    this.owner = null;
    this.lastToucher = null;
    this.onGround = true;
    this.controlTightness = 1;
    this._buildMesh(scene);
  }

  _buildMesh(scene) {
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 28, 20);
    const colors = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const sector = Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 5));
      const band = Math.abs(y) > BALL_RADIUS * 0.55;
      const black = !band && sector % 2 === 0;
      colors.push(...(black ? [0.08, 0.08, 0.08] : [0.96, 0.96, 0.96]));
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.05 }));
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; scene.add(this.mesh);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(BALL_RADIUS * 1.05, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.015; scene.add(this.shadow);
  }

  reset(x = 0, z = 0) {
    this.position.set(x, this.radius, z);
    this.velocity.set(0, 0, 0); this.angular.set(0, 0, 0);
    this.owner = null; this.onGround = true; this.controlTightness = 1; this._syncMesh();
  }

  kick(dirX, dirZ, power, lift = 0, sidespin = 0) {
    this.owner = null; this.controlTightness = 1;
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len, nz = dirZ / len;
    const speed = clamp(power, 1.2, MAX_SPEED);
    this.velocity.x = nx * speed; this.velocity.z = nz * speed;
    this.velocity.y = Math.max(0, lift);
    this.onGround = lift < 0.3;
    this.angular.x = nz * speed * 0.18; this.angular.z = -nx * speed * 0.18;
    this.angular.y = sidespin * speed * 0.08;
  }

  setOwner(player) {
    this.owner = player; this.lastToucher = player;
    this.velocity.set(0, 0, 0); this.angular.set(0, 0, 0);
    this.controlTightness = 0.55;
  }

  update(dt, pitch, players = []) {
    if (this.owner) this._updateOwned(dt);
    else { this._updatePhysics(dt, pitch); if (players.length) this._collidePlayers(players); }
    this._syncMesh(dt);
  }

  _updateOwned(dt) {
    const p = this.owner;
    const turnRisk = Math.min(1, p.speed * 0.04);
    this.controlTightness = clamp(this.controlTightness + dt * 1.8 - turnRisk * dt * 0.5, 0.35, 1);
    const ang = p.facing;
    const speedFactor = clamp(p.speed / 10, 0, 1);
    const offset = 0.42 + speedFactor * 0.22;
    const lag = 8 + this.controlTightness * 16;
    const targetX = p.position.x + Math.sin(ang) * offset;
    const targetZ = p.position.z + Math.cos(ang) * offset;
    const follow = 1 - Math.exp(-lag * dt);
    this.position.x += (targetX - this.position.x) * follow;
    this.position.z += (targetZ - this.position.z) * follow;
    this.position.y = this.radius; this.velocity.set(0, 0, 0); this.onGround = true;
    this.angular.x = Math.cos(ang) * p.speed * 0.25;
    this.angular.z = -Math.sin(ang) * p.speed * 0.25;
    if (p.speed > 7 && this.controlTightness < 0.45 && Math.random() < 0.01) {
      this.kick(Math.sin(ang + (Math.random() - 0.5)), Math.cos(ang), 2.5 + Math.random() * 2, 0.3);
      p.hasBall = false;
    }
  }

  _updatePhysics(dt, pitch) {
    this.velocity.y -= GRAVITY * dt;
    if (!this.onGround) {
      this.velocity.x += this.angular.y * MAGNUS * dt * 8;
      const drag = Math.exp(-AIR_DRAG * dt);
      this.velocity.x *= drag; this.velocity.z *= drag;
    }
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
    if (this.position.y <= this.radius) {
      this.position.y = this.radius;
      if (this.velocity.y < -0.4) {
        this.velocity.y = -this.velocity.y * BOUNCE;
        const impact = Math.min(1, Math.abs(this.velocity.y) / 10);
        this.velocity.x *= 0.88 - impact * 0.08;
        this.velocity.z *= 0.88 - impact * 0.08;
        if (Math.abs(this.velocity.y) < 1.0) { this.velocity.y = 0; this.onGround = true; }
      } else { this.velocity.y = 0; this.onGround = true; }
      const fric = Math.exp(-GROUND_FRICTION * dt);
      this.velocity.x *= fric; this.velocity.z *= fric;
      if (Math.hypot(this.velocity.x, this.velocity.z) < STOP_SPEED) { this.velocity.x = 0; this.velocity.z = 0; }
      this.angular.x = this.velocity.z / this.radius;
      this.angular.z = -this.velocity.x / this.radius;
    } else {
      this.onGround = false;
      this.angular.x *= Math.exp(-1.2 * dt);
      this.angular.z *= Math.exp(-1.2 * dt);
      this.angular.y *= Math.exp(-0.8 * dt);
    }
    this._clampSpeed(); this._bounds(pitch);
  }

  _bounds(pitch) {
    const halfW = pitch.width / 2 - this.radius;
    const halfD = pitch.depth / 2 - this.radius;
    const goalHalf = (pitch.goalWidth || 4.2) / 2;
    if (this.position.x < -halfW) { this.position.x = -halfW; this.velocity.x = Math.abs(this.velocity.x) * 0.45; }
    else if (this.position.x > halfW) { this.position.x = halfW; this.velocity.x = -Math.abs(this.velocity.x) * 0.45; }
    if (this.position.z < -halfD && Math.abs(this.position.x) > goalHalf) { this.position.z = -halfD; this.velocity.z = Math.abs(this.velocity.z) * 0.45; }
    else if (this.position.z > halfD && Math.abs(this.position.x) > goalHalf) { this.position.z = halfD; this.velocity.z = -Math.abs(this.velocity.z) * 0.45; }
  }

  _collidePlayers(players) {
    for (const p of players) {
      if (p.hasBall) continue;
      const d = this.distanceTo(p.position.x, p.position.z);
      const minDist = this.radius + 0.38;
      if (d < minDist && d > 0.01) {
        const dx = (this.position.x - p.position.x) / d;
        const dz = (this.position.z - p.position.z) / d;
        this.position.x += dx * (minDist - d) * 0.55;
        this.position.z += dz * (minDist - d) * 0.55;
        const push = 1.8 + p.speed * 0.35;
        this.velocity.x += dx * push + p.velocity.x * 0.28;
        this.velocity.z += dz * push + p.velocity.z * 0.28;
        this.velocity.y += 0.5; this.onGround = false; this.lastToucher = p; this._clampSpeed();
      }
    }
  }

  _clampSpeed() {
    const hs = Math.hypot(this.velocity.x, this.velocity.z);
    if (hs > MAX_SPEED) { this.velocity.x = (this.velocity.x / hs) * MAX_SPEED; this.velocity.z = (this.velocity.z / hs) * MAX_SPEED; }
  }

  _syncMesh(dt = 0.016) {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.x += this.angular.x * dt;
    this.mesh.rotation.y += this.angular.y * dt;
    this.mesh.rotation.z += this.angular.z * dt;
    this.shadow.position.x = this.position.x; this.shadow.position.z = this.position.z;
    const heightFactor = clamp(1 - (this.position.y - this.radius) * 0.22, 0.08, 1);
    this.shadow.material.opacity = 0.35 * heightFactor;
    this.shadow.scale.setScalar(0.8 + 0.2 * heightFactor);
  }

  distanceTo(x, z) { return distance2(this.position.x, this.position.z, x, z); }
}
