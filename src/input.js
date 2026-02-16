export class InputController {
  constructor() {
    this.keys = new Set();
    this.justPressed = new Set();

    window.addEventListener('keydown', (event) => {
      const code = event.code;
      if (!this.keys.has(code)) {
        this.justPressed.add(code);
      }
      this.keys.add(code);
    });

    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.justPressed.clear();
    });
  }

  get throttle() {
    return this.keys.has('KeyW') ? 1 : 0;
  }

  get brake() {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1 : 0;
  }

  get steer() {
    const left = this.keys.has('KeyA') ? 1 : 0;
    const right = this.keys.has('KeyD') ? 1 : 0;
    return right - left;
  }

  consumePressed(code) {
    const has = this.justPressed.has(code);
    if (has) {
      this.justPressed.delete(code);
    }
    return has;
  }

  endFrame() {
    this.justPressed.clear();
  }
}
