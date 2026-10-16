import * as THREE from 'three';
import { clamp, distance2 } from '../utils/math.js';

const BALL_RADIUS = 0.22;
const GRAVITY = 22;
const BOUNCE = 0.48;
const GROUND_FRICTION = 3.6;
const AIR_DRAG = 0.55;
const STOP_SPEED = 0.12;

export class Ball {
  constructor(scene) {
    this.radius = BALL_RADIUS;
    this.position = new THREE.Vector3(0, BALL_RADIUS, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.owner = null;
    this.lastToucher = null;
    this.onGround = true;

    const geo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
    const colors = [];
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const x = pos.getX(i);
      const black = Math.floor((Math.atan2(y, x) + Math.PI) / (Math.PI / 3)) % 2 === 0;
      if (black && Math.abs(y) < BALL_RADIUS * 0.7) colors.push(0.12, 0.12, 0.12);
      else colors.push(0.95, 0.95, 0.95);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.45,
      metalness: 0.08,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(BALL_RADIUS * 0.95, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 })
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    scene.add(this.shadow);
  }

  reset(x = 0, z = 0) {
    this.position.set(x, this.radius, z);
    this.velocity.set(0, 0, 0);
    this.owner = null;
    this.onGround = true;
    this._syncMesh();
  }

  kick(dirX, dirZ, power, lift = 0) {
    this.owner = null;
    const len = Math.hypot(dirX, dirZ) || 1;
    const speed = clamp(power, 2, 32);
    this.velocity.x = (dirX / len) * speed;
    this.velocity.z = (dirZ / len) * speed;
    this.velocity.y = Math.max(0, lift);
    this.onGround = lift < 0.4;
  }

  setOwner(player) {
    this.owner = player;
    this.lastToucher = player;
    this.velocity.set(0, 0, 0);
  }

  update(dt, pitch) {
    if (this.owner) this._updateOwned(dt);
    else this._updatePhysics(dt, pitch);
    this._syncMesh();
  }

  _updateOwned(dt) {
    const p = this.owner;
    const ang = p.facing;
    const speedFactor = clamp(p.speed / 9, 0, 1);
    const offset = 0.5 + speedFactor * 0.15;
    const targetX = p.position.x + Math.sin(ang) * offset;
    const targetZ = p.position.z + Math.cos(ang) * offset;
    const follow = 1 - Math.exp(-18 * dt);
    this.position.x += (targetX - this.position.x) * follow;
    this.position.z += (targetZ - this.position.z) * follow;
    this.position.y = this.radius;
    this.velocity.set(0, 0, 0);
    this.onGround = true;
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
      if (this.velocity.y < 0) {
        this.velocity.y = -this.velocity.y * BOUNCE;
        if (Math.abs(this.velocity.y) < 1.0) {
          this.velocity.y = 0;
          this.onGround = true;
        }
      } else {
        this.onGround = true;
      }
      const fric = Math.exp(-GROUND_FRICTION * dt);
      this.velocity.x *= fric;
      this.velocity.z *= fric;
      if (Math.hypot(this.velocity.x, this.velocity.z) < STOP_SPEED) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }
    } else {
      this.onGround = false;
    }

    const halfW = pitch.width / 2 - this.radius;
    const halfD = pitch.depth / 2 - this.radius;
    const goalHalf = (pitch.goalWidth || 4.2) / 2;

    if (this.position.x < -halfW) {
      this.position.x = -halfW;
      this.velocity.x = Math.abs(this.velocity.x) * 0.55;
    } else if (this.position.x > halfW) {
      this.position.x = halfW;
      this.velocity.x = -Math.abs(this.velocity.x) * 0.55;
    }

    if (this.position.z < -halfD) {
      if (Math.abs(this.position.x) > goalHalf) {
        this.position.z = -halfD;
        this.velocity.z = Math.abs(this.velocity.z) * 0.55;
      }
    } else if (this.position.z > halfD) {
      if (Math.abs(this.position.x) > goalHalf) {
        this.position.z = halfD;
        this.velocity.z = -Math.abs(this.velocity.z) * 0.55;
      }
    }
  }

  _syncMesh() {
    this.mesh.position.copy(this.position);
    const hx = this.velocity.x;
    const hz = this.velocity.z;
    if (Math.hypot(hx, hz) > 0.2) {
      this.mesh.rotation.x += hz * 0.12;
      this.mesh.rotation.z -= hx * 0.12;
    }
    this.shadow.position.x = this.position.x;
    this.shadow.position.z = this.position.z;
    const heightFactor = clamp(1 - (this.position.y - this.radius) * 0.25, 0.1, 1);
    this.shadow.material.opacity = 0.32 * heightFactor;
    this.shadow.scale.setScalar(0.85 + 0.15 * heightFactor);
  }

  distanceTo(x, z) {
    return distance2(this.position.x, this.position.z, x, z);
  }
}
