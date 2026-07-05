export const darkTheme = {
  colors: {
    background: '#1C1814',
    surface: '#2A241E',
    ink: '#F5EBE0',
    inkMuted: '#A3907C',
    tomato: '#B39DDB',     // pastel lavender — primary accent
    forest: '#9B7EC8',     // muted sage — confirm/save
    gold: '#C4A882',       // warm tan highlight
    border: '#3E342B',
    white: '#FFFFFF',
  },
  typography: {
    display: { fontFamily: 'System', fontWeight: '700', letterSpacing: 0.2 },
    body: { fontFamily: 'System', fontWeight: '400' },
    label: { fontFamily: 'System', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  },
};

export const lightTheme = {
  colors: {
    background: '#F5F0E8',
    surface: '#EDE7DA',
    ink: '#2C2416',
    inkMuted: '#8C7B6B',
    tomato: '#9B7EC8',     // deeper lavender for light mode legibility
    forest: '#9B7EC8',     // full forest green — readable on light
    gold: '#B8860B',       // darker gold — readable on light
    border: '#D9D0C3',
    white: '#2C2416',      // "white" role inverts to dark ink in light mode
  },
  typography: {
    display: { fontFamily: 'System', fontWeight: '700', letterSpacing: 0.2 },
    body: { fontFamily: 'System', fontWeight: '400' },
    label: { fontFamily: 'System', fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  },
};

// Legacy static export — kept so any file not yet migrated doesn't crash.
// Remove after all screens are migrated in Step 3.
export const colors = darkTheme.colors;
export const typography = darkTheme.typography;