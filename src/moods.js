// Presets: each one is just a set of slider positions.
export const PRESETS = [
  { id: 'rooftop', label: 'Rooftop in Cairo', mood: { night: 0.12, energy: 0.45, warmth: 0.8, groove: 0.45 } },
  { id: 'sunday', label: 'Sunday reset', mood: { night: 0.25, energy: 0.15, warmth: 0.55, groove: 0.3 } },
  { id: 'walk', label: 'Walking home glow', mood: { night: 0.55, energy: 0.35, warmth: 0.45, groove: 0.6 } },
  { id: 'warehouse', label: 'Brooklyn warehouse, 3am', mood: { night: 0.95, energy: 0.9, warmth: 0.85, groove: 0.2 } }
];

export const SLIDERS = [
  { key: 'night', label: 'Time of night', low: 'Sunset', high: '3am' },
  { key: 'energy', label: 'Energy', low: 'Chill', high: 'Dancing' },
  { key: 'warmth', label: 'Warmth', low: 'Next room', high: 'Front row' },
  { key: 'groove', label: 'Groove', low: 'Straight', high: 'Bouncy' }
];

// Colors for the glow, blended from sunset to 3am
export const SUNSET = ['#ff7a59', '#ffb36b', '#ff4f8b', '#c2387a'];
export const LATE = ['#3a0ca3', '#4361ee', '#00c2d1', '#7209b7'];

const WORDS = {
  warm: ['Golden', 'Honey', 'Amber', 'Velvet', 'Rooftop', 'Saffron', 'Coral', 'Slow'],
  dark: ['Midnight', 'Indigo', 'Neon', 'Basement', 'Smoke', 'Chrome', 'After', 'Low'],
  noun: ['Mint', 'Hour', 'Signal', 'Tide', 'Room', 'Haze', 'Glow', 'Pulse', 'Drive', 'Garden', 'Satellite', 'Bloom'],
  late: ['3am dub', 'warehouse mix', 'after hours edit', 'late night version'],
  early: ['sunset mix', 'rooftop edit', 'golden hour version', 'Sunday dub'],
  mid: ['extended mix', 'club edit', 'deep mix', 'dub']
};
const pick = (list, seed) => list[Math.abs(Math.floor(seed)) % list.length];

// A fake track name that fits the mood, e.g. "Velvet Mint (3am dub)". It changes when the mood changes a lot.
export function trackName(m) {
  const seed = Math.round(m.night * 7) * 31 + Math.round(m.energy * 5) * 7 + Math.round(m.groove * 3) * 3 + Math.round(m.warmth * 3);
  const adj = pick(m.night > 0.5 ? WORDS.dark : WORDS.warm, seed);
  const noun = pick(WORDS.noun, seed / 3 + m.energy * 10);
  const version = pick(m.night > 0.66 ? WORDS.late : m.night < 0.33 ? WORDS.early : WORDS.mid, seed / 5);
  return `${adj} ${noun} (${version})`;
}

// Mood <-> link, so a shared link plays the same vibe
export function moodFromUrl() {
  const q = new URLSearchParams(location.search), out = {};
  for (const k of ['night', 'energy', 'warmth', 'groove']) {
    const v = parseFloat(q.get(k[0]));
    if (!Number.isNaN(v) && v >= 0 && v <= 100) out[k] = v / 100;
  }
  return out;
}
export function moodToUrl(m) {
  const q = new URLSearchParams({ n: Math.round(m.night * 100), e: Math.round(m.energy * 100), w: Math.round(m.warmth * 100), g: Math.round(m.groove * 100) });
  return `${location.origin}${location.pathname}?${q}`;
}
