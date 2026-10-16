import * as THREE from 'three';

/**
 * Street-football pitch with Ghanaian urban flavour
 */
export class Pitch {
  constructor(scene, venue = 'accra') {
    this.width = 18;
    this.depth = 28;
    this.venue = venue;
    this.group = new THREE.Group();
    scene.add(this.group);

    this._buildSurface();
    this._buildMarkings();
    this._buildGoals();
    this._buildEnvironment();
  }

  _buildSurface() {
    const geo = new THREE.PlaneGeometry(this.width + 4, this.depth + 6, 1, 1);
    let colour = 0x3d4a3a;
    if (this.venue === 'jamestown') colour = 0x4a4538;
    if (this.venue === 'kumasi') colour = 0x2e4a32;

    const mat = new THREE.MeshStandardMaterial({
      color: colour,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const pitchGeo = new THREE.PlaneGeometry(this.width, this.depth);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: this.venue === 'jamestown' ? 0x5a5545 : 0x2d5a38,
      roughness: 0.85,
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.01;
    pitch.receiveShadow = true;
    this.group.add(pitch);
  }

  _buildMarkings() {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e0 });
    const addLine = (w, d, x, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.02, z);
      this.group.add(m);
    };
    const hw = this.width / 2;
    const hd = this.depth / 2;
    const t = 0.08;
    addLine(this.width, t, 0, -hd);
    addLine(this.width, t, 0, hd);
    addLine(t, this.depth, -hw, 0);
    addLine(t, this.depth, hw, 0);
    addLine(this.width, t, 0, 0);
    const circle = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 2.95, 32),
      lineMat
    );
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.025;
    this.group.add(circle);
    addLine(8, t, 0, -hd + 4);
    addLine(t, 4, -4, -hd + 2);
    addLine(t, 4, 4, -hd + 2);
    addLine(8, t, 0, hd - 4);
    addLine(t, 4, -4, hd - 2);
    addLine(t, 4, 4, hd - 2);
  }

  _buildGoals() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4, metalness: 0.3 });
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      wireframe: true,
    });

    const buildGoal = (z) => {
      const g = new THREE.Group();
      const postR = 0.07;
      const goalW = 4.2;
      const goalH = 2.1;
      const postGeo = new THREE.CylinderGeometry(postR, postR, goalH, 8);
      const left = new THREE.Mesh(postGeo, postMat);
      left.position.set(-goalW / 2, goalH / 2, 0);
      left.castShadow = true;
      g.add(left);
      const right = new THREE.Mesh(postGeo, postMat);
      right.position.set(goalW / 2, goalH / 2, 0);
      right.castShadow = true;
      g.add(right);
      const cross = new THREE.Mesh(
        new THREE.CylinderGeometry(postR, postR, goalW, 8),
        postMat
      );
      cross.rotation.z = Math.PI / 2;
      cross.position.set(0, goalH, 0);
      cross.castShadow = true;
      g.add(cross);
      const net = new THREE.Mesh(
        new THREE.PlaneGeometry(goalW, goalH),
        netMat
      );
      net.position.set(0, goalH / 2, z > 0 ? 0.6 : -0.6);
      g.add(net);
      g.position.z = z;
      this.group.add(g);
      return { z, width: goalW, height: goalH };
    };

    this.goalHome = buildGoal(-this.depth / 2);
    this.goalAway = buildGoal(this.depth / 2);
  }

  _buildEnvironment() {
    const fenceMat = new THREE.MeshStandardMaterial({
      color: 0x6a7a6a,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const fenceH = 2.4;
    const addFence = (w, d, x, z, rotY = 0) => {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, fenceH), fenceMat);
      f.position.set(x, fenceH / 2, z);
      f.rotation.y = rotY;
      this.group.add(f);
    };
    const margin = 2.5;
    const hw = this.width / 2 + margin;
    const hd = this.depth / 2 + margin;
    addFence(this.width + margin * 2, 0, 0, -hd);
    addFence(this.width + margin * 2, 0, 0, hd);
    addFence(this.depth + margin * 2, 0, -hw, 0, Math.PI / 2);
    addFence(this.depth + margin * 2, 0, hw, 0, Math.PI / 2);

    const bMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.9 });
    const places = [
      [-14, -8, 3, 5, 4], [14, -10, 2.5, 7, 3.5],
      [-13, 6, 4, 4, 5], [13, 8, 3, 6, 4],
      [-15, 0, 2, 8, 3], [15, -2, 2.5, 5, 4],
    ];
    for (const [x, z, w, h, d] of places) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bMat);
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      this.group.add(b);
    }

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });
    for (const [x, z] of [[-11, -12], [11, -12], [-11, 12], [11, 12]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 6), poleMat);
      p.position.set(x, 3, z);
      this.group.add(p);
    }
  }

  checkGoal(ball) {
    const x = ball.position.x;
    const y = ball.position.y;
    const z = ball.position.z;
    const gw = 2.1;
    const gh = 2.1;

    if (z > this.depth / 2 - 0.3 && Math.abs(x) < gw && y < gh) {
      return 0;
    }
    if (z < -this.depth / 2 + 0.3 && Math.abs(x) < gw && y < gh) {
      return 1;
    }
    return -1;
  }
}
