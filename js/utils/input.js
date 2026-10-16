/**
 * Unified input — keyboard + virtual joystick / action buttons
 * Controls: WASD move, Shift sprint, J/E pass, K/Space shoot, L/F tackle, Esc pause
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.moveX = 0;
    this.moveZ = 0;
    this.sprint = false;
    this.pass = false;
    this.shoot = false;
    this.tackle = false;
    this.shootHeld = 0;
    this.pausePressed = false;

    this.joyActive = false;
    this.joyX = 0;
    this.joyZ = 0;
    this._mobile = { pass: false, shoot: false, tackle: false, sprint: false };

    this._prevPass = false;
    this._prevTackle = false;

    this._bindKeyboard();
    this._bindMobile();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape') this.pausePressed = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _bindMobile() {
    const base = document.getElementById('joystick-base');
    const knob = document.getElementById('joystick-knob');
    const zone = document.getElementById('joystick-zone');
    if (!base || !knob) return;

    const maxDist = 42;
    let touchId = null;

    const updateKnob = (clientX, clientY) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.joyX = dx / maxDist;
      this.joyZ = dy / maxDist;
      this.joyActive = true;
    };

    const endJoy = () => {
      knob.style.transform = 'translate(-50%, -50%)';
      this.joyX = 0;
      this.joyZ = 0;
      this.joyActive = false;
      touchId = null;
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      touchId = t.identifier;
      updateKnob(t.clientX, t.clientY);
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) updateKnob(t.clientX, t.clientY);
      }
    }, { passive: false });

    zone.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === touchId) endJoy();
      }
    });
    zone.addEventListener('touchcancel', endJoy);

    const bindBtn = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      const set = (v) => { this._mobile[key] = v; };
      el.addEventListener('touchstart', (e) => { e.preventDefault(); set(true); }, { passive: false });
      el.addEventListener('touchend', () => set(false));
      el.addEventListener('touchcancel', () => set(false));
      el.addEventListener('mousedown', (e) => { e.preventDefault(); set(true); });
      el.addEventListener('mouseup', () => set(false));
      el.addEventListener('mouseleave', () => set(false));
    };
    bindBtn('btn-pass', 'pass');
    bindBtn('btn-shoot', 'shoot');
    bindBtn('btn-tackle', 'tackle');
    bindBtn('btn-sprint', 'sprint');
  }

  update(dt) {
    let kx = 0, kz = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) kz -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) kz += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) kx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) kx += 1;

    if (this.joyActive) {
      this.moveX = this.joyX;
      this.moveZ = this.joyZ;
    } else {
      const len = Math.sqrt(kx * kx + kz * kz) || 1;
      this.moveX = kx / len;
      this.moveZ = kz / len;
    }

    this.sprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this._mobile.sprint);

    const passDown = !!(this.keys['KeyJ'] || this.keys['KeyE']);
    const shootDown = !!(this.keys['KeyK'] || this.keys['Space']);
    const tackleDown = !!(this.keys['KeyL'] || this.keys['KeyF']);

    if ((passDown && !this._prevPass) || this._mobile.pass) this.pass = true;
    if ((tackleDown && !this._prevTackle) || this._mobile.tackle) this.tackle = true;
    this._prevPass = passDown;
    this._prevTackle = tackleDown;

    this._mobile.pass = false;
    this._mobile.tackle = false;

    this.shoot = shootDown || this._mobile.shoot;
    if (this.shoot) this.shootHeld = Math.min(1.5, this.shootHeld + dt);
    else this.shootHeld = 0;
  }

  consume(action) {
    const v = this[action];
    this[action] = false;
    return v;
  }

  consumePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }

  isMobile() {
    return window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  }
}
