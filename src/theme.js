// Design tokens for PlateScan — warm dark mode.
// Palette: late-night kitchen, ember-glow dark — cozy, food-adjacent.
export const colors = {
  background: '#1C1814', // warm charcoal base
  surface: '#2A241E',    // elevated card / input surface
  ink: '#F5EBE0',        // soft cream text
  inkMuted: '#A3907C',   // secondary / muted warm brown
  tomato: '#E05D44',     // primary accent (calories / actions)
  forest: '#4E7C62',     // secondary accent (confirm / save)
  gold: '#D9A441',       // tertiary highlight, used sparingly
  border: '#3E342B',     // dark brown separator
};

// Using system fonts by default so the app runs with zero extra setup.
export const typography = {
  display: { fontFamily: 'System', fontWeight: '700', letterSpacing: 0.2 },
  body: { fontFamily: 'System', fontWeight: '400' },
  label: { fontFamily: 'System', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
};
