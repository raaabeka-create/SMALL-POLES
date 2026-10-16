import * as THREE from 'three';
import { clamp, distance2 } from '../utils/math.js';

const BALL_RADIUS = 0.22;
const GRAVITY = 24;
const BOUNCE = 0.52;
const GROUND_FRICTION = 4.0;
const AIR_DRAG = 0.7;
const STOP_SPEED = 0.1;
const MAX_SPEED = 36;

export class Ball {
  constructor(scene) {
    this.radius = BALL_RADIUS;
    this.position = new THREE.Vector3(0, BALL_RADIUS, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.angular = new THREE.Vector3(0, 0, 0);
    this.owner = null;
    this.lastToucher = null;
    this.onGround = true;
    this._buildMesh(scene);
  }

  _buildMesh(scene) {
    const geo = new THREE.SphereGeometry(BALL_RADIUS, 28, 20);
    const colors = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const sector = Math.floor((Math.atan2(z, x) + Math.PI) / (Math.PI / 5));
      const band = Math.abs(y) > BALL_RADIUS * 0.55;
      const black = !band && sector % 2 === 0;
      if (black) colors.push(0.08, 0.08, 0.08);
      else colors.push(0.96, 0.96, 0.96);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.06 })
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(BALL_RADIUS * 1.05, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.015;
    scene.add(this.shadow);
  }

  reset(x = 0, z = 0) {
    this.position.set(x, this.radius, z);
    this.velocity.set(0, 0, 0);
    this.angular.set(0, 0, 0);
    this.owner = null;
    this.onGround = true;
    this._syncMesh();
  }

  kick(dirX, dirZ, power, lift = 0) {
    this.owner = null;
    const len = Math.hypot(dirX, dirZ) || 1;
    const nx = dirX / len;
    const nz = dirZ / len;
    const speed = clamp(power, 1.5, MAX_SPEED);
    this.velocity.x = nx * speed;
    this.velocity.z = nz * speed;
    this.velocity.y = Math.max(0, lift);
    this.onGround = lift < 0.35;
    this.angular.x = nz * speed * 0.15;
    this.angular.z = -nx * speed * 0.15;
  }

  setOwner(player) {
    this.owner = player;
    this.lastToucher = player;
    this.velocity.set(0, 0, 0);
    this.angular.set(0, 0, 0);
  }

  update(dt, pitch, players = []) {
    if (this.owner) this._updateOwned(dt);
    else {
      this._updatePhysics(dt, pitch);
      if (players.length) this._collidePlayers(players);
    }
    this._syncMesh(dt);
  }

  _updateOwned(dt) {
    const p = this.owner;
    const ang = p.facing;
    const speedFactor = clamp(p.speed / 9, 0, 1);
    const offset = 0.48 + speedFactor * 0.18;
    const targetX = p.position.x + Math.sin(ang) * offset;
    const targetZ = p.position.z + Math.cos(ang) * offset;
    const follow = 1 - Math.exp(-20 * dt);
    this.position.x += (targetX - this.position.x) * follow;
    this.position.z += (targetZ - this.position.z) * follow;
    this.position.y = this.radius;
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.angular.x = Math.cos(ang) * p.speed * 0.2;
    this.angular.z = -Math.sin(ang) * p.speed * 0.2;
  }

  _updatePhysics(dt, pitch) {
    this.velocity.y -= GRAVITY * dt;
    if (!this.onGround) {
      const drag = Math.exp(-AIR_DRAG * dt);
      this.velocity.x *= drag;
      this.velocity.z *= drag;
    }
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    if (this.position.y <= this.radius) {
      this.position.y = this.radius;
      if (this.velocity.y < -0.5) {
        this.velocity.y = -this.velocity.y * BOUNCE;
        this.velocity.x *= 0.92;
        this.velocity.z *= 0.92;
        if (Math.abs(this.velocity.y) < 1.2) {
          this.velocity.y = 0;
          this.onGround = true;
        }
      } else {
        this.velocity.y = 0;
        this.onGround = true;
      }
      const fric = Math.exp(-GROUND_FRICTION * dt);
      this.velocity.x *= fric;
      this.velocity.z *= fric;
      if (Math.hypot(this.velocity.x, this.velocity.z) < STOP_SPEED) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
      this.angular.x = this.velocity.z / this.radius;
      this.angular.z = -this.velocity.x / this.radius;
    } else {
      this.onGround = false;
      this.angular.x *= Math.exp(-1.5 * dt);
      this.angular.z *= Math.exp(-1.5 * dt);
    }
    this._clampSpeed();
    this._bounds(pitch);
  }

  _bounds(pitch) {
    const halfW = pitch.width / 2 - this.radius;
    const halfD = pitch.depth / 2 - this.radius;
    const goalHalf = (pitch.goalWidth || 4.2) / 2;
    if (this.position.x < -halfW) {
      this.position.x = -halfW;
      this.velocity.x = Math.abs(this.velocity.x) * 0.5;
    } else if (this.position.x > halfW) {
      this.position.x = halfW;
      this.velocity.x = -Math.abs(this.velocity.x) * 0.5;
    }
    if (this.position.z < -halfD) {
      if (Math.abs(this.position.x) > goalHalf) {
        this.position.z = -halfD;
        this.velocity.z = Math.abs(this.velocity.z) * 0.5;
      }
    } else if (this.position.z > halfD) {
      if (Math.abs(this.position.x) > goalHalf) {
        this.position.z = halfD;
        this.velocity.z = -Math.abs(this.velocity.z) * 0.5;
      }
    }
  }

  _collidePlayers(players) {
    for (const p of players) {
      if (p.hasBall) continue;
      const d = this.distanceTo(p.position.x, p.position.z);
      const minDist = this.radius + 0.35;
      if (d < minDist && d > 0.01) {
        const dx = (this.position.x - p.position.x) / d;
        const dz = (this.position.z - p.position.z) / d;
        const overlap = minDist - d;
        this.position.x += dx * overlap * 0.6;
        this.position.z += dz * overlap * 0.6;
        const push = 2.5 + p.speed * 0.4;
        this.velocity.x += dx * push + p.velocity.x * 0.35;
        this.velocity.z += dz * push + p.velocity.z * 0.35;
        this.velocity.y += 0.8;
        this.onGround = false;
        this.lastToucher = p;
        this._clampSpeed();
      }
    }
  }

  _clampSpeed() {
    const hs = Math.hypot(this.velocity.x, this.velocity.z);
    if (hs > MAX_SPEED) {
      this.velocity.x = (this.velocity.x / hs) * MAX_SPEED;
      this.velocity.z = (this.velocity.z / hs) * MAX_SPEED;
    }
  }

  _syncMesh(dt = 0.016) {
    this.mesh.position.copy(this.position);
    this.mesh.rotation.x += this.angular.x * dt;
    this.mesh.rotation.z += this.angular.z * dt;
    this.shadow.position.x = this.position.x;
    this.shadow.position.z = this.position.z;
    const heightFactor = clamp(1 - (this.position.y - this.radius) * 0.22, 0.08, 1);
    this.shadow.material.opacity = 0.35 * heightFactor;
    this.shadow.scale.setScalar(0.8 + 0.2 * heightFactor);
  }

  distanceTo(x, z) {
    return distance2(this.position.x, this.position.z, x, z);
  }
}
