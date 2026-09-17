/**
 * Rust & Steel — Brand Theme Module
 * Single source of truth for every color, gradient, and usage rule.
 * Import via `import { theme } from '@/theme/tokens'` or consume CSS vars.
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
