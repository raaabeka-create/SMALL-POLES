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
    this.renderer.toneMappingExposure = 1.25;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87a0b8);
    this.scene.fog = new THREE.FogExp2(0x87a0b8, 0.012);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(16, 5, 0);
    this.camera.lookAt(0, 0.8, 0);

    this._lookTarget = new THREE.Vector3(0, 0.8, 0);
    this._camIdeal = new THREE.Vector3(16, 5, 0);

    this._setupLights();
    this.pitch = null;

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    this.scene.add(new THREE.AmbientLight(0xb0c4de, 0.55));
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
    this.scene.add(new THREE.HemisphereLight(0x88aacc, 0x3a4a30, 0.4));
  }

  loadVenue(venueId) {
    if (this.pitch) this.scene.remove(this.pitch.group);
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

  /** Sideline camera: ball velocity lead + human player bias */
  updateCamera(ball, players, dt) {
    if (!ball) return;
    let focusX = ball.position.x + ball.velocity.x * 0.18;
    let focusZ = ball.position.z + ball.velocity.z * 0.18;
    const human = players && players.find((pl) => pl.isHuman);
    if (human) {
      focusX = focusX * 0.72 + human.position.x * 0.28;
      focusZ = focusZ * 0.72 + human.position.z * 0.28;
    }
    const speed = Math.hypot(ball.velocity.x, ball.velocity.z);
    this._camIdeal.set(
      14.5 + Math.min(Math.abs(focusX) * 0.1, 2),
      4.5 + Math.min(speed * 0.06, 1.0),
      focusZ * 0.88
    );
    this.camera.position.lerp(this._camIdeal, 1 - Math.exp(-5.5 * dt));
    const look = new THREE.Vector3(focusX * 0.5, 0.85, focusZ * 0.92);
    this._lookTarget.lerp(look, 1 - Math.exp(-6.5 * dt));
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
