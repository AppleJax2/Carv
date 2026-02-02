import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeName = 'midnight' | 'light' | 'nature' | 'ocean' | 'sunset' | 'monochrome'

export interface ThemeColors {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string
  border: string
  input: string
  ring: string
  // Extended colors for gradients and effects
  gradientStart: string
  gradientEnd: string
  glow: string
  surface: string
  surfaceHover: string
}

export interface Theme {
  name: ThemeName
  label: string
  description: string
  colors: ThemeColors
  isDark: boolean
}

export const themes: Record<ThemeName, Theme> = {
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    description: 'Deep dark theme with green accents',
    isDark: true,
    colors: {
      background: '222 47% 6%',
      foreground: '210 40% 98%',
      card: '222 47% 8%',
      cardForeground: '210 40% 98%',
      popover: '222 47% 10%',
      popoverForeground: '210 40% 98%',
      primary: '142 76% 36%',
      primaryForeground: '210 40% 98%',
      secondary: '217 33% 17%',
      secondaryForeground: '210 40% 98%',
      muted: '217 33% 17%',
      mutedForeground: '215 20% 65%',
      accent: '142 50% 25%',
      accentForeground: '210 40% 98%',
      destructive: '0 84% 60%',
      destructiveForeground: '210 40% 98%',
      success: '142 76% 36%',
      successForeground: '210 40% 98%',
      warning: '38 92% 50%',
      warningForeground: '222 47% 6%',
      border: '217 33% 17%',
      input: '217 33% 17%',
      ring: '142 76% 36%',
      gradientStart: '142 76% 36%',
      gradientEnd: '180 70% 35%',
      glow: '142 76% 36%',
      surface: '222 47% 11%',
      surfaceHover: '222 47% 14%',
    },
  },
  light: {
    name: 'light',
    label: 'Light',
    description: 'Clean light theme for daytime use',
    isDark: false,
    colors: {
      background: '0 0% 100%',
      foreground: '222 47% 11%',
      card: '0 0% 98%',
      cardForeground: '222 47% 11%',
      popover: '0 0% 100%',
      popoverForeground: '222 47% 11%',
      primary: '142 76% 36%',
      primaryForeground: '0 0% 100%',
      secondary: '220 14% 96%',
      secondaryForeground: '222 47% 11%',
      muted: '220 14% 96%',
      mutedForeground: '220 9% 46%',
      accent: '142 50% 90%',
      accentForeground: '142 76% 25%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      success: '142 76% 36%',
      successForeground: '0 0% 100%',
      warning: '38 92% 50%',
      warningForeground: '222 47% 11%',
      border: '220 13% 91%',
      input: '220 13% 91%',
      ring: '142 76% 36%',
      gradientStart: '142 76% 36%',
      gradientEnd: '180 70% 35%',
      glow: '142 76% 36%',
      surface: '220 14% 96%',
      surfaceHover: '220 14% 93%',
    },
  },
  nature: {
    name: 'nature',
    label: 'Forest',
    description: 'Earthy greens and warm browns',
    isDark: true,
    colors: {
      background: '150 20% 8%',
      foreground: '60 20% 95%',
      card: '150 20% 10%',
      cardForeground: '60 20% 95%',
      popover: '150 20% 12%',
      popoverForeground: '60 20% 95%',
      primary: '84 60% 45%',
      primaryForeground: '150 20% 8%',
      secondary: '150 15% 18%',
      secondaryForeground: '60 20% 95%',
      muted: '150 15% 18%',
      mutedForeground: '60 10% 60%',
      accent: '30 50% 35%',
      accentForeground: '60 20% 95%',
      destructive: '0 70% 50%',
      destructiveForeground: '60 20% 95%',
      success: '84 60% 45%',
      successForeground: '150 20% 8%',
      warning: '45 90% 50%',
      warningForeground: '150 20% 8%',
      border: '150 15% 20%',
      input: '150 15% 18%',
      ring: '84 60% 45%',
      gradientStart: '84 60% 45%',
      gradientEnd: '150 40% 35%',
      glow: '84 60% 45%',
      surface: '150 20% 13%',
      surfaceHover: '150 20% 16%',
    },
  },
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    description: 'Deep blues and teals',
    isDark: true,
    colors: {
      background: '210 50% 8%',
      foreground: '200 20% 98%',
      card: '210 50% 10%',
      cardForeground: '200 20% 98%',
      popover: '210 50% 12%',
      popoverForeground: '200 20% 98%',
      primary: '190 80% 45%',
      primaryForeground: '210 50% 8%',
      secondary: '210 40% 18%',
      secondaryForeground: '200 20% 98%',
      muted: '210 40% 18%',
      mutedForeground: '200 15% 60%',
      accent: '220 70% 50%',
      accentForeground: '200 20% 98%',
      destructive: '0 70% 55%',
      destructiveForeground: '200 20% 98%',
      success: '160 70% 40%',
      successForeground: '210 50% 8%',
      warning: '45 90% 50%',
      warningForeground: '210 50% 8%',
      border: '210 40% 20%',
      input: '210 40% 18%',
      ring: '190 80% 45%',
      gradientStart: '190 80% 45%',
      gradientEnd: '220 70% 50%',
      glow: '190 80% 45%',
      surface: '210 50% 13%',
      surfaceHover: '210 50% 16%',
    },
  },
  sunset: {
    name: 'sunset',
    label: 'Sunset',
    description: 'Warm oranges and purples',
    isDark: true,
    colors: {
      background: '270 30% 8%',
      foreground: '30 20% 98%',
      card: '270 30% 10%',
      cardForeground: '30 20% 98%',
      popover: '270 30% 12%',
      popoverForeground: '30 20% 98%',
      primary: '25 95% 55%',
      primaryForeground: '270 30% 8%',
      secondary: '270 25% 18%',
      secondaryForeground: '30 20% 98%',
      muted: '270 25% 18%',
      mutedForeground: '30 15% 60%',
      accent: '330 70% 50%',
      accentForeground: '30 20% 98%',
      destructive: '0 70% 55%',
      destructiveForeground: '30 20% 98%',
      success: '160 70% 40%',
      successForeground: '270 30% 8%',
      warning: '45 90% 50%',
      warningForeground: '270 30% 8%',
      border: '270 25% 20%',
      input: '270 25% 18%',
      ring: '25 95% 55%',
      gradientStart: '25 95% 55%',
      gradientEnd: '330 70% 50%',
      glow: '25 95% 55%',
      surface: '270 30% 13%',
      surfaceHover: '270 30% 16%',
    },
  },
  monochrome: {
    name: 'monochrome',
    label: 'Monochrome',
    description: 'Sleek grayscale design',
    isDark: true,
    colors: {
      background: '0 0% 7%',
      foreground: '0 0% 95%',
      card: '0 0% 10%',
      cardForeground: '0 0% 95%',
      popover: '0 0% 12%',
      popoverForeground: '0 0% 95%',
      primary: '0 0% 90%',
      primaryForeground: '0 0% 7%',
      secondary: '0 0% 18%',
      secondaryForeground: '0 0% 95%',
      muted: '0 0% 18%',
      mutedForeground: '0 0% 55%',
      accent: '0 0% 25%',
      accentForeground: '0 0% 95%',
      destructive: '0 70% 55%',
      destructiveForeground: '0 0% 95%',
      success: '0 0% 70%',
      successForeground: '0 0% 7%',
      warning: '45 90% 50%',
      warningForeground: '0 0% 7%',
      border: '0 0% 20%',
      input: '0 0% 18%',
      ring: '0 0% 70%',
      gradientStart: '0 0% 30%',
      gradientEnd: '0 0% 50%',
      glow: '0 0% 50%',
      surface: '0 0% 13%',
      surfaceHover: '0 0% 16%',
    },
  },
}

interface ThemeState {
  currentTheme: ThemeName
  setTheme: (theme: ThemeName) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'midnight',
      setTheme: (theme) => {
        set({ currentTheme: theme })
        applyTheme(theme)
      },
    }),
    {
      name: 'carv-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.currentTheme)
        }
      },
    }
  )
)

export function applyTheme(themeName: ThemeName) {
  const theme = themes[themeName]
  const root = document.documentElement

  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`
    root.style.setProperty(cssVar, value)
  })

  // Set dark/light mode class
  if (theme.isDark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.add('light')
    root.classList.remove('dark')
  }
}
