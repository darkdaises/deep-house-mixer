import { useEffect, useRef } from 'react';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };

// The record spins in time with the music (one turn every 4 beats). Hold it to build, let go to drop,
// like a DJ holding the vinyl. While held it slows to a stop; on release it spins back up.
export default function Turntable({ bpm, playing, held, name, night = 0, onHold, onRelease }) {
  const disc = useRef(null), anim = useRef(null), rate = useRef(0), raf = useRef(0);

  useEffect(() => {
    anim.current = disc.current.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1000, iterations: Infinity });
    anim.current.playbackRate = 0;
    return () => anim.current.cancel();
  }, []);

  // ease the spin speed toward its target, like a real platter
  useEffect(() => {
    const target = playing && !held ? 1 : 0;
    const turnMs = (60 / bpm) * 4 * 1000;
    cancelAnimationFrame(raf.current);
    const tick = () => {
      rate.current += (target - rate.current) * (held ? 0.18 : 0.08);
      if (Math.abs(target - rate.current) < 0.002) rate.current = target;
      anim.current.playbackRate = (rate.current * 1000) / turnMs;
      if (rate.current !== target) raf.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf.current);
  }, [bpm, playing, held]);

  // "Amber Garden (golden hour version)" -> title above the spindle, version below it
  const m = name.match(/^(.*?)\s*\((.*)\)$/), title = m ? m[1] : name, version = m ? m[2] : '';

  return (
    <div className={`turntable ${held ? 'held' : ''} ${playing ? 'on' : ''}`}>
      <div className="platter"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onHold(); }}
        onPointerUp={onRelease} onPointerCancel={onRelease} onLostPointerCapture={onRelease}
        onContextMenu={(e) => e.preventDefault()}
        role="button" aria-label="Hold the record to build, let go to drop" aria-pressed={held}>
        <div className="disc" ref={disc}>
          <svg className="label" viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <linearGradient id="lbl" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={mix('#ff8a5c', '#4d6bff', night)} />
                <stop offset="1" stopColor={mix('#ff4f8b', '#7a1fd1', night)} />
              </linearGradient>
              {/* title runs along the top edge, version along the bottom, like a real record label */}
              <path id="arcTop" d="M 18,50 A 32,32 0 1,1 82,50" />
              <path id="arcBot" d="M 13,50 A 37,37 0 0,0 87,50" />
            </defs>
            <circle cx="50" cy="50" r="49" fill="url(#lbl)" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth=".6" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth=".6" />
            <text className="l-title"><textPath href="#arcTop" startOffset="50%" textAnchor="middle">{title}</textPath></text>
            <text className="l-ver"><textPath href="#arcBot" startOffset="50%" textAnchor="middle">{version}</textPath></text>
            <text className="l-side" x="27" y="53" textAnchor="middle">A</text>
            <text className="l-side" x="73" y="53" textAnchor="middle">{bpm}</text>
          </svg>
        </div>
        <div className="shine" />
        <div className="spindle" />
      </div>
      <div className="arm" aria-hidden="true"><i /></div>
      <p className="tt-hint">{held ? 'let go to drop' : 'hold the record'}</p>
    </div>
  );
}
