import { useEffect, useRef } from 'react';

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
          <div className="label" style={{ '--n': night }}>
            <span className="l-title">{title}</span>
            <span className="l-ver">{version}</span>
          </div>
        </div>
        <div className="shine" />
        <div className="spindle" />
      </div>
      <div className="arm" aria-hidden="true"><i /></div>
      <p className="tt-hint">{held ? 'let go to drop' : 'hold the record'}</p>
    </div>
  );
}
