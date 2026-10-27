import { useEffect, useMemo, useRef, useState } from 'react';
import { Engine } from './engine.js';
import Visualizer from './Visualizer.jsx';
import { PRESETS, SLIDERS, trackName, moodFromUrl, moodToUrl } from './moods.js';

const DEFAULT = PRESETS[0].mood;

export default function App() {
  const engine = useMemo(() => new Engine(), []);
  const [mood, setMood] = useState(() => ({ ...DEFAULT, ...moodFromUrl() }));
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [beat, setBeat] = useState(0);
  const [copied, setCopied] = useState(false);
  const preset = PRESETS.find((p) => Object.keys(p.mood).every((k) => Math.abs(p.mood[k] - mood[k]) < 0.005));

  useEffect(() => { engine.setMood(mood); }, [engine, mood]);

  // The little beat dots light up in time with the music
  useEffect(() => engine.onStep(({ step, time }) => {
    if (step % 4) return;
    const wait = Math.max(0, (time - engine.ctx.currentTime) * 1000);
    setTimeout(() => setBeat(step / 4), wait);
  }), [engine]);

  async function start() { await engine.start(); setStarted(true); setPlaying(true); }
  async function toggle() { if (playing) { engine.stop(); setPlaying(false); } else { await engine.start(); setPlaying(true); } }

  // DROP: hold the button (or the space bar)
  const dropOn = () => { if (!playing) return; engine.drop(true); setDropping(true); };
  const dropOff = () => { if (!engine.dropping) return; engine.drop(false); setDropping(false); };
  useEffect(() => {
    const down = (e) => { if (e.code === 'Space' && !e.repeat && started && e.target.tagName !== 'INPUT') { e.preventDefault(); dropOn(); } };
    const up = (e) => { if (e.code === 'Space') dropOff(); };
    addEventListener('keydown', down); addEventListener('keyup', up);
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up); };
  });

  // Keep the link in sync so the address bar always holds the current vibe
  useEffect(() => { try { history.replaceState(null, '', moodToUrl(mood)); } catch (e) {} }, [mood]);

  async function share() {
    const url = moodToUrl(mood);
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'Deep House Mood Mixer', text: `Listening to “${trackName(mood)}”`, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch (e) {}
  }

  const name = trackName(mood);

  return (
    <div className={`app ${dropping ? 'is-dropping' : ''}`}>
      <Visualizer engine={engine} mood={mood} dropping={dropping} />
      <div className="grain" aria-hidden="true" />

      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden="true">◐</span>
          <span>Deep House <em>Mood Mixer</em></span>
        </div>
        <a className="by" href="https://gigimostafa.com" target="_blank" rel="noopener">by Gigi Mostafa ↗</a>
      </header>

      {!started && (
        <div className="intro">
          <p className="kicker">a tiny deep house machine</p>
          <h1>Set the mood.<br />The music follows.</h1>
          <p className="sub">Every kick, clap and chord is made live in your browser. No tracks, no repeats, just vibes.</p>
          <button className="go" onClick={start}><span className="go-dot" />Tap to start the night</button>
          <p className="hint">Turn your sound on</p>
        </div>
      )}

      {started && (
        <main className="deck">
          <section className="now" aria-live="polite">
            <div className="beats" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={playing && beat === i ? 'on' : ''} />)}</div>
            <div className="np">
              <small>Now playing · {engine.bpm} BPM</small>
              <strong>{name}</strong>
            </div>
            <button className="play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
          </section>

          <section className="presets" aria-label="Moods">
            {PRESETS.map((p) => (
              <button key={p.id} className={preset?.id === p.id ? 'on' : ''} onClick={() => setMood({ ...p.mood })}>
                {p.label}
              </button>
            ))}
          </section>

          <section className="sliders">
            {SLIDERS.map((s) => (
              <label key={s.key} className="slider" style={{ '--v': mood[s.key] }}>
                <span className="s-label">{s.label}</span>
                <input type="range" min="0" max="1" step="0.01" value={mood[s.key]}
                  onChange={(e) => setMood((m) => ({ ...m, [s.key]: parseFloat(e.target.value) }))} />
                <span className="ends"><span>{s.low}</span><span>{s.high}</span></span>
              </label>
            ))}
          </section>

          <section className="actions">
            <button className={`drop ${dropping ? 'held' : ''}`} disabled={!playing}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); dropOn(); }}
              onPointerUp={dropOff} onPointerCancel={dropOff} onLostPointerCapture={dropOff}
              onContextMenu={(e) => e.preventDefault()}>
              {dropping ? 'Building… let go to drop' : 'Hold to build, release to drop'}
              <small>or hold space</small>
            </button>
            <button className="share" onClick={share}>{copied ? 'Link copied ✓' : 'Share this vibe'}</button>
          </section>
        </main>
      )}
    </div>
  );
}
