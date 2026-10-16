import * as THREE from 'three';
import { Pitch } from './Pitch.js';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87a0b8);
    this.scene.fog = new THREE.FogExp2(0x87a0b8, 0.018);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 9, 14);
    this.camera.lookAt(0, 0.5, 0);

    this.camMode = 0;
    this._lookTarget = new THREE.Vector3(0, 0.5, 0);
    this._camIdeal = new THREE.Vector3(0, 9, 14);

    this._setupLights();
    this.pitch = null;

    window.addEventListener('resize', () => this._onResize());
  }

  cycleCamera() {
    this.camMode = (this.camMode + 1) % 3;
  }

  _setupLights() {
    const amb = new THREE.AmbientLight(0xb0c4de, 0.55);
    this.scene.add(amb);

    const sun = new THREE.DirectionalLight(0xfff0dd, 1.35);
    sun.position.set(12, 28, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -22;
    sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22;
    sun.shadow.camera.bottom = -22;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.sun = sun;

    const fill = new THREE.DirectionalLight(0xffaa66, 0.25);
    fill.position.set(-8, 6, -5);
    this.scene.add(fill);

    const hemi = new THREE.HemisphereLight(0x88aacc, 0x3a4a30, 0.4);
    this.scene.add(hemi);
  }

  loadVenue(venueId) {
    if (this.pitch) {
      this.scene.remove(this.pitch.group);
    }
    this.pitch = new Pitch(this.scene, venueId);

    if (venueId === 'jamestown') {
      this.scene.background.set(0x9ab0c0);
      this.scene.fog.color.set(0x9ab0c0);
    } else if (venueId === 'kumasi') {
      this.scene.background.set(0x7a9a80);
      this.scene.fog.color.set(0x7a9a80);
    } else {
      this.scene.background.set(0x87a0b8);
      this.scene.fog.color.set(0x87a0b8);
    }
    return this.pitch;
  }

  updateCamera(ball, players, dt) {
    if (!ball) return;

    const bx = ball.position.x;
    const bz = ball.position.z;
    const speed = Math.hypot(ball.velocity.x, ball.velocity.z);

    let idealX, idealY, idealZ, lookY;
    if (this.camMode === 1) {
      idealX = bx * 0.25;
      idealY = 16 + Math.abs(bz) * 0.06;
      idealZ = bz * 0.35 + 20;
      lookY = 0.4;
      this.camera.fov = 50;
    } else if (this.camMode === 2) {
      idealX = Math.sign(bx || 1) * 14 + bx * 0.15;
      idealY = 4.5;
      idealZ = bz * 0.85;
      lookY = 0.8;
      this.camera.fov = 55;
    } else {
      idealX = bx * 0.45;
      idealY = 7.5 + Math.min(speed * 0.15, 2.5);
      idealZ = bz * 0.55 + 11;
      lookY = 0.6 + Math.min(speed * 0.02, 0.4);
      this.camera.fov = 58;
    }
    this.camera.updateProjectionMatrix();

    this._camIdeal.set(idealX, idealY, idealZ);
    this.camera.position.lerp(this._camIdeal, 1 - Math.exp(-2.8 * dt));

    const look = new THREE.Vector3(bx * 0.9, lookY, bz * 0.85);
    this._lookTarget.lerp(look, 1 - Math.exp(-4 * dt));
    this.camera.lookAt(this._lookTarget);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
