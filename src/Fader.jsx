import { useRef } from 'react';

// A vertical mixer fader: drag the cap, tap the track, or use the arrow keys.
export default function Fader({ label, low, high, value, onChange }) {
  const track = useRef(null);

  const setFromPointer = (e) => {
    const r = track.current.getBoundingClientRect();
    const v = 1 - (e.clientY - r.top) / r.height;
    onChange(Math.min(1, Math.max(0, Math.round(v * 100) / 100)));
  };
  const down = (e) => { e.currentTarget.setPointerCapture(e.pointerId); setFromPointer(e); };
  const move = (e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setFromPointer(e); };
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
        onPointerDown={down} onPointerMove={move} onKeyDown={key} style={{ '--v': value }}>
        <div className="f-ticks" aria-hidden="true">{Array.from({ length: 11 }, (_, i) => <i key={i} />)}</div>
        <div className="f-slot" aria-hidden="true"><div className="f-fill" /></div>
        <div className="f-cap" aria-hidden="true"><b /></div>
      </div>
      <span className="f-end">{low}</span>
      <span className="f-label">{label}</span>
    </div>
  );
}
