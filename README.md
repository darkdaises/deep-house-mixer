# Deep House Mood Mixer

Set the mood, the music follows. A tiny deep house machine by [Gigi Mostafa](https://gigimostafa.com).

Every sound (kick, clap, hats, bass, chords) is synthesized live with the Web Audio API, so nothing is a recording and it never repeats exactly.

- **Time of night**: sunset (warm pads, airy) → 3am (dark stabs, rolling bass)
- **Energy**: 118 BPM and sparse → 124 BPM with full hats and percussion
- **Warmth**: muffled "next room" → crisp "front row"
- **Groove**: straight → swung
- **Hold to DROP** (or hold space): filters everything down, slams back in when you let go
- **Share this vibe**: the link carries your slider settings

## Run it
```
npm install
npm run dev
```

## Deploy (Cloudflare Pages)
Framework preset: Vite (or None) · Build command: `npm run build` · Output directory: `dist`

## Files
- `src/engine.js` the sound: sequencer and synthesized instruments
- `src/Visualizer.jsx` the glow that pulses on every kick
- `src/moods.js` presets, colors, track-name generator, share links
- `src/App.jsx` the controls
