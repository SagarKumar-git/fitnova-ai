/**
 * FitNova AI — Design Tokens
 * Premium Athletic AI Design System: Dark Navy + Neon Green + Lime/Yellow
 */

export const FitNovaTokens = {
  colors: {
    // Backgrounds
    bg: '#020817',
    bgElevated: '#04111F',
    bgDeep: '#06101F',
    surface: 'rgba(5, 15, 30, 0.72)',
    surfaceSolid: '#050f1e',
    
    // Brand Accents
    primary: '#39FF14',   // Neon Green
    secondary: '#A8FF00', // Lime Green
    highlight: '#DFFF00', // Electric Yellow
    
    // Status
    success: '#10B981',
    error: '#F43F5E',
    warning: '#F59E0B',
    
    // Typography
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    textInverse: '#020817',
    
    // Borders & Overlays
    border: 'rgba(163, 255, 0, 0.18)',
    borderHover: 'rgba(163, 255, 0, 0.40)',
    borderFocus: '#39FF14',
    
    // Shadows & Glows
    glow: '0 0 25px rgba(57, 255, 20, 0.25)',
    glowIntense: '0 0 35px rgba(57, 255, 20, 0.45)',
  },
  typography: {
    fontSans: "'Inter', sans-serif",
    fontDisplay: "'Outfit', sans-serif",
  },
  radii: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    card: '22px',
    full: '9999px',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: '400ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type FitNovaThemeTokens = typeof FitNovaTokens;
