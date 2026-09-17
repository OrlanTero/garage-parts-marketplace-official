/**
 * Garage Parts & Builds — Admin Design System Tokens
 * Industrial automotive control panel theme with Rust & Steel brand accents.
 */

export const theme = {
  colors: {
    // Brand Core
    rust: '#924424',
    rustHover: '#7B371B',
    rustDark: '#3A1E12',
    orange: '#D8622C',
    orangeLight: '#FBEEE7',
    metal: '#4A4D52',
    steel: '#2C4250',
    steelLight: '#EDF2F5',
    
    // Neutral & Surfaces (Industrial Admin Slate & Warm Neutral)
    bgApp: '#F8FAFC',
    bgSidebar: '#0F172A',
    bgSidebarHover: '#1E293B',
    bgSidebarActive: '#334155',
    bgCard: '#FFFFFF',
    bgSurfaceSubtle: '#F1F5F9',
    
    // Text Hierarchy
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    textLight: '#CBD5E1',
    textInverse: '#F8FAFC',
    
    // Borders
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
    borderDark: '#334155',
    
    // Status & Feedback
    success: '#10B981',
    successBg: '#ECFDF5',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
  },
  typography: {
    fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    fontDisplay: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
    fontSerif: "'DM Serif Display', Georgia, serif",
  },
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)',
    dropdown: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    sidebar: '4px 0 24px 0 rgba(15, 23, 42, 0.06)',
  },
  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    full: '9999px',
  },
}
