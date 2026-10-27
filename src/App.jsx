import { useEffect, useMemo, useRef, useState } from 'react';
import { Engine } from './engine.js';
import Visualizer from './Visualizer.jsx';
import Turntable from './Turntable.jsx';
import Fader from './Fader.jsx';
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
          <button className="go" onClick={start}><span className="go-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg></span>Start the night</button>
          <p className="hint">Turn your sound on</p>
        </div>
      )}

      {started && (
        <main className="deck">
          <section className="now" aria-live="polite">
            <button className="play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>}
            </button>
            <div className="np">
              <small><span className="beats" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={playing && beat === i ? 'on' : ''} />)}</span>{engine.bpm} BPM</small>
              <strong>{name}</strong>
            </div>
            <button className="share" onClick={share} aria-label="Share this vibe">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" /></svg>
              <span>{copied ? 'Copied' : 'Share'}</span>
            </button>
          </section>

          <div className="rig">
            <Turntable bpm={engine.bpm} playing={playing} held={dropping} name={name} night={mood.night} onHold={dropOn} onRelease={dropOff} />

            <section className="mixer" aria-label="Mixer">
              <div className="cues" role="group" aria-label="Moods">
                {PRESETS.map((p) => (
                  <button key={p.id} className={preset?.id === p.id ? 'on' : ''} onClick={() => setMood({ ...p.mood })}>
                    <i aria-hidden="true" />{p.label}
                  </button>
                ))}
              </div>
              <div className="faders">
                {SLIDERS.map((sl) => (
                  <Fader key={sl.key} label={sl.label} low={sl.low} high={sl.high} value={mood[sl.key]}
                    onChange={(v) => setMood((m) => ({ ...m, [sl.key]: v }))} />
                ))}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}
