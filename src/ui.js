export class UI {
  constructor(track) {
    this.track = track;
    this.speedEl = document.getElementById('speed');
    this.lapEl = document.getElementById('lap');
    this.debugEl = document.getElementById('debug');
    this.itemEl = document.getElementById('item-slot');
    this.minimap = document.getElementById('minimap');
    this.ctx = this.minimap.getContext('2d');

    this.mapPoints = this.track.samples.map((sample) => ({ x: sample.center.x, z: sample.center.z }));
    const xs = this.mapPoints.map((p) => p.x);
    const zs = this.mapPoints.map((p) => p.z);
    this.bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }

  worldToMap(x, z) {
    const pad = 18;
    const w = this.minimap.width - pad * 2;
    const h = this.minimap.height - pad * 2;
    const u = (x - this.bounds.minX) / (this.bounds.maxX - this.bounds.minX || 1);
    const v = (z - this.bounds.minZ) / (this.bounds.maxZ - this.bounds.minZ || 1);
    return {
      x: pad + u * w,
      y: pad + v * h,
    };
  }

  update(telemetry, kart, itemState) {
    const kmh = Math.round(telemetry.speed * 3.6);
    this.speedEl.textContent = `${kmh} km/h`;
    this.lapEl.textContent = `Lap ${kart.lap}/3`;
    this.debugEl.innerHTML = [
      `speed: ${telemetry.speed.toFixed(2)} m/s`,
      `steering: ${telemetry.steering.toFixed(2)}`,
      `yaw: ${telemetry.yaw.toFixed(2)} rad`,
      `onGround: ${telemetry.onGround}`,
      `drifting: ${telemetry.drifting}`,
      `turboLevel: ${telemetry.turboLevel}`,
    ].join('<br/>');

    if (itemState.rouletteActive) {
      this.itemEl.textContent = `ITEM: ${itemState.rouletteName} ...`;
    } else if (itemState.heldItem) {
      this.itemEl.textContent = `ITEM: ${itemState.heldItem} (Kで投げる)`;
    } else {
      this.itemEl.textContent = 'ITEM: ---';
    }

    this.drawMinimap(kart);
  }

  drawMinimap(kart) {
    const ctx = this.ctx;
    const { width, height } = this.minimap;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(220, 240, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    this.mapPoints.forEach((p, i) => {
      const mapped = this.worldToMap(p.x, p.z);
      if (i === 0) ctx.moveTo(mapped.x, mapped.y);
      else ctx.lineTo(mapped.x, mapped.y);
    });
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#72ff86';
    const k = this.worldToMap(kart.position.x, kart.position.z);
    ctx.beginPath();
    ctx.arc(k.x, k.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
