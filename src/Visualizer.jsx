import { useEffect, useRef } from 'react';
import { SUNSET, LATE } from './moods.js';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return A.map((v, i) => Math.round(v + (B[i] - v) * t)); };

// Full-screen "lava lamp at the club": soft glowing blobs that drift with the groove and swell on every kick.
function tint(top, bottom) {
  let m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', top);
  document.documentElement.style.background = top;
  document.body.style.background = `linear-gradient(${top}, ${bottom})`;
}

export default function Visualizer({ engine, mood, dropping }) {
  const canvas = useRef(null);
  const live = useRef({ mood, dropping });
  live.current = { mood, dropping };

  useEffect(() => {
    const c = canvas.current, g = c.getContext('2d');
    let raf, w, h, dpr;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.width = Math.floor(innerWidth * dpr * 0.5);   // half resolution: it's blurry on purpose, and cheap
      h = c.height = Math.floor(innerHeight * dpr * 0.5);
    };
    resize(); addEventListener('resize', resize);

    const blobs = [0, 1, 2, 3].map((i) => ({ a: i * 1.7, r: 0.32 + i * 0.05, s: 0.6 + i * 0.25 }));
    let pulse = 0, t0 = performance.now(), level = 0, lastTint = 0;
    const freq = new Uint8Array(512);

    const frame = (now) => {
      const { mood: m, dropping: d } = live.current;
      const t = (now - t0) / 1000;

      // kick pulse: find the latest kick that has already sounded
      if (engine.ctx && engine.playing) {
        const at = engine.ctx.currentTime;
        const hit = engine.kickTimes.filter((k) => k <= at).pop();
        if (hit !== undefined) { const age = at - hit; pulse = Math.max(pulse * 0.9, Math.exp(-age * 9)); }
        engine.analyser.getByteFrequencyData(freq);
        let sum = 0; for (let i = 2; i < 40; i++) sum += freq[i];
        level += (sum / (38 * 255) - level) * 0.15;
      } else { pulse *= 0.92; level *= 0.95; }

      const night = m.night, speed = 0.08 + m.energy * 0.22;
      // background: deep sky that darkens toward 3am
      const top = mix('#2a0f2e', '#05040f', night), bottom = mix('#5a1d3a', '#0b0a24', night);
      const bg = g.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, `rgb(${top})`); bg.addColorStop(1, `rgb(${bottom})`);
      g.globalCompositeOperation = 'source-over'; g.fillStyle = bg; g.fillRect(0, 0, w, h);
      // let the phone's status bar and browser bars match the sky, so the app feels full screen
      if (now - lastTint > 500) { lastTint = now; tint(`rgb(${top})`, `rgb(${bottom})`); }

      g.globalCompositeOperation = 'lighter';
      const base = Math.min(w, h);
      blobs.forEach((b, i) => {
        const col = mix(SUNSET[i], LATE[i], night);
        const swing = Math.sin(t * speed * b.s + b.a) * (0.22 + m.groove * 0.12);
        const x = w * (0.5 + swing + Math.cos(t * speed * 0.7 + i) * 0.12);
        const y = h * (0.5 + Math.cos(t * speed * b.s * 0.8 + b.a * 2) * 0.22);
        const r = base * (b.r + pulse * 0.12 + level * 0.15) * (d ? 0.65 : 1);
        const glow = g.createRadialGradient(x, y, 0, x, y, r);
        const a = (0.42 + pulse * 0.25) * (0.55 + m.warmth * 0.45);
        glow.addColorStop(0, `rgba(${col},${a})`); glow.addColorStop(0.55, `rgba(${col},${a * 0.35})`); glow.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = glow; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, [engine]);

  return <canvas ref={canvas} className="viz" aria-hidden="true" />;
}
