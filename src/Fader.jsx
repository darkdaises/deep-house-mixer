import { useRef } from 'react';

// A vertical mixer fader: drag the cap, tap the track, or use the arrow keys.
export default function Fader({ label, low, high, value, onChange }) {
  const track = useRef(null);

  // Vertical on big screens, horizontal on phones (decided by the track's shape in CSS).
  const horizontal = () => { const r = track.current.getBoundingClientRect(); return r.width > r.height; };
  const setFromPointer = (e) => {
    const r = track.current.getBoundingClientRect();
    const v = horizontal() ? (e.clientX - r.left) / r.width : 1 - (e.clientY - r.top) / r.height;
    onChange(Math.min(1, Math.max(0, Math.round(v * 100) / 100)));
  };
  // On phones the page scrolls up and down, so only a sideways drag (or a tap) moves the fader.
  const g = useRef(null);
  const down = (e) => {
    if (!horizontal()) { e.currentTarget.setPointerCapture(e.pointerId); setFromPointer(e); return; }
    g.current = { x: e.clientX, y: e.clientY, drag: false };
  };
  const move = (e) => {
    const s = g.current;
    if (!s) { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e); return; }
    if (!s.drag) {
      const dx = Math.abs(e.clientX - s.x), dy = Math.abs(e.clientY - s.y);
      if (dy > 8 && dy > dx) { g.current = null; return; }          // they're scrolling the page
      if (dx > 6) { s.drag = true; e.currentTarget.setPointerCapture(e.pointerId); }
    }
    if (s.drag) setFromPointer(e);
  };
  const up = (e) => {
    const s = g.current; g.current = null;
    if (s && !s.drag && Math.abs(e.clientX - s.x) < 6 && Math.abs(e.clientY - s.y) < 6) setFromPointer(e);   // a tap
  };
  const key = (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(1, value + step)); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(0, value - step)); }
  };

  return (
    <div className="fader">
      <span className="f-end">{high}</span>
      <div className="f-body" ref={track} role="slider" tabIndex={0} aria-label={label}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)} aria-valuetext={`${Math.round(value * 100)}%, ${low} to ${high}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { g.current = null; }} onKeyDown={key} style={{ '--v': value }}>
        <div className="f-ticks" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <i key={i} />)}</div>
        <div className="f-slot" aria-hidden="true"><div className="f-fill" /></div>
        <div className="f-cap" aria-hidden="true"><b /></div>
      </div>
      <span className="f-end">{low}</span>
      <span className="f-label">{label}</span>
    </div>
  );
}
