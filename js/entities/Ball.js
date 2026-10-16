import * as THREE from 'three';
import { clamp, distance2 } from '../utils/math.js';

const BALL_RADIUS = 0.22;
const FRICTION = 2.8;
const BOUNCE = 0.55;
const GRAVITY = 18;

export class Ball {
  constructor(scene) {
    this.radius = BALL_RADIUS;
    this.position = new THREE.Vector3(0, BALL_RADIUS, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.owner = null;
    this.lastToucher = null;
    this.onGround = true;

    const geo = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.4,
      metalness: 0.05,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(BALL_RADIUS * 0.9, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
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
    const speed = clamp(power, 4, 28);
    this.velocity.x = dirX * speed;
    this.velocity.z = dirZ * speed;
    this.velocity.y = lift;
    this.onGround = lift > 0.5 ? false : this.onGround;
  }

  setOwner(player) {
    this.owner = player;
    this.lastToucher = player;
    this.velocity.set(0, 0, 0);
  }

  update(dt, pitch) {
    if (this.owner) {
      const p = this.owner;
      const ang = p.facing;
      const offset = 0.55;
      this.position.x = p.position.x + Math.sin(ang) * offset;
      this.position.z = p.position.z + Math.cos(ang) * offset;
      this.position.y = this.radius;
      this.velocity.set(0, 0, 0);
      this.onGround = true;
    } else {
      this.velocity.y -= GRAVITY * dt;
      this.position.x += this.velocity.x * dt;
      this.position.y += this.velocity.y * dt;
      this.position.z += this.velocity.z * dt;

      if (this.position.y <= this.radius) {
        this.position.y = this.radius;
        if (this.velocity.y < 0) {
          this.velocity.y = -this.velocity.y * BOUNCE;
          if (Math.abs(this.velocity.y) < 1.2) {
            this.velocity.y = 0;
            this.onGround = true;
          }
        }
        const fric = Math.exp(-FRICTION * dt);
        this.velocity.x *= fric;
        this.velocity.z *= fric;
        if (Math.hypot(this.velocity.x, this.velocity.z) < 0.15) {
          this.velocity.x = 0;
          this.velocity.z = 0;
        }
      } else {
        this.onGround = false;
      }

      const halfW = pitch.width / 2 - this.radius;
      const halfD = pitch.depth / 2 - this.radius;
      if (this.position.x < -halfW) {
        this.position.x = -halfW;
        this.velocity.x = Math.abs(this.velocity.x) * 0.6;
      } else if (this.position.x > halfW) {
        this.position.x = halfW;
        this.velocity.x = -Math.abs(this.velocity.x) * 0.6;
      }
      if (this.position.z < -halfD) {
        this.position.z = -halfD;
        this.velocity.z = Math.abs(this.velocity.z) * 0.6;
      } else if (this.position.z > halfD) {
        this.position.z = halfD;
        this.velocity.z = -Math.abs(this.velocity.z) * 0.6;
      }
    }

    this._syncMesh();
  }

  _syncMesh() {
    this.mesh.position.copy(this.position);
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.5) {
      this.mesh.rotation.x += this.velocity.z * 0.08;
      this.mesh.rotation.z -= this.velocity.x * 0.08;
    }
    this.shadow.position.x = this.position.x;
    this.shadow.position.z = this.position.z;
    this.shadow.material.opacity = this.onGround ? 0.3 : 0.12;
  }

  distanceTo(x, z) {
    return distance2(this.position.x, this.position.z, x, z);
  }
}
