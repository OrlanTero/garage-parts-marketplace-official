/**
 * Rust & Steel — Brand Theme Module (JS mirror of src/styles/tokens.css).
 * Single source of truth for canvas/SVG/JS consumers.
 * CSS consumers must use var(--*) tokens — never hardcode these hexes
 * for surfaces or text. See src/styles/index.css for the directory map.
 */

export const theme = {
  colors: {
    // Palette (exact hexes from brand sheet)
    rustBrown: '#8B4A2F',
    rustDark: '#4E2E1E',
    ironOrange: '#C26A3D',
    metalGray: '#4E4E4E',
    steelBlue: '#2F4A5A',
    sandBeige: '#D9C9B0',
    concreteGray: '#A7A7A7',
    offWhite: '#F7F5EF',
    black: '#1A1A1A',
  },
  day: {
    text: '#4c5156',
    textMuted: '#626b75',
    background: '#f5f2eb',
    surface: '#ffffff',
    border: '#e3ddd3',
    heading: '#14171a',
    inputBg: '#ffffff',
    inputBorder: '#cfc9bb',
    inputText: '#14171a',
    inputPlaceholder: '#6f777f',
  },
  night: {
    text: '#c3c9d1',
    textMuted: '#8b94a0',
    background: '#101216',
    surface: '#181b20',
    border: '#2b313a',
    heading: '#f1f4f8',
    inputBg: '#12151a',
    inputBorder: '#333b46',
    inputText: '#f1f4f8',
    inputPlaceholder: '#8b94a0',
  },
  semantic: {
    primary: '#8B4A2F',
    secondary: '#C26A3D',
    text: '#4E4E4E',
    link: '#2F4A5A',
    background: '#D9C9B0',
    border: '#A7A7A7',
    surface: '#F7F5EF',
    heading: '#1A1A1A',
    error: '#9B2C1E',
    success: '#2E7D32',
  },
  gradients: {
    rust: 'linear-gradient(135deg, #8B4A2F 0%, #4E2E1E 100%)',
    orange: 'linear-gradient(135deg, #C26A3D 0%, #D9C9B0 100%)',
    steel: 'linear-gradient(135deg, #2F4A5A 0%, #4E4E4E 100%)',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    pill: '999px',
  },
  shadow: {
    card: '0 4px 24px rgba(26,26,26,0.08)',
    modal: '0 20px 60px rgba(26,26,26,0.22)',
    button: '0 2px 10px rgba(139,74,47,0.28)',
  },
}
