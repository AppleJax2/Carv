import { useState } from 'react'
import { Button } from './ui/button'
import { 
  Palette, 
  Moon, 
  Sun, 
  Leaf, 
  Waves, 
  Sunset,
  Circle,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore, themes, type ThemeName } from '@/store/useThemeStore'

interface ThemeSwitcherProps {
  variant?: 'dropdown' | 'inline' | 'compact'
}

const themeIcons: Record<ThemeName, React.ReactNode> = {
  midnight: <Moon className="w-4 h-4" />,
  light: <Sun className="w-4 h-4" />,
  nature: <Leaf className="w-4 h-4" />,
  ocean: <Waves className="w-4 h-4" />,
  sunset: <Sunset className="w-4 h-4" />,
  monochrome: <Circle className="w-4 h-4" />,
}

const themePreviewColors: Record<ThemeName, { bg: string; accent: string }> = {
  midnight: { bg: 'bg-[#0d1117]', accent: 'bg-emerald-500' },
  light: { bg: 'bg-white', accent: 'bg-emerald-500' },
  nature: { bg: 'bg-[#141f1a]', accent: 'bg-lime-500' },
  ocean: { bg: 'bg-[#0c1929]', accent: 'bg-cyan-400' },
  sunset: { bg: 'bg-[#1a1225]', accent: 'bg-orange-500' },
  monochrome: { bg: 'bg-[#121212]', accent: 'bg-gray-300' },
}

export function ThemeSwitcher({ variant = 'dropdown' }: ThemeSwitcherProps) {
  const { currentTheme, setTheme } = useThemeStore()
  const [isOpen, setIsOpen] = useState(false)

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        {(Object.keys(themes) as ThemeName[]).map((themeName) => (
          <button
            key={themeName}
            onClick={() => setTheme(themeName)}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center",
              themePreviewColors[themeName].bg,
              currentTheme === themeName 
                ? "border-primary scale-110 ring-2 ring-primary/30" 
                : "border-transparent hover:scale-105 opacity-70 hover:opacity-100"
            )}
            title={themes[themeName].label}
          >
            {currentTheme === themeName && (
              <Check className="w-3 h-3 text-primary" />
            )}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Palette className="w-4 h-4 text-muted-foreground" />
          Theme
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(themes) as ThemeName[]).map((themeName) => {
            const theme = themes[themeName]
            const colors = themePreviewColors[themeName]
            const isActive = currentTheme === themeName
            
            return (
              <button
                key={themeName}
                onClick={() => setTheme(themeName)}
                className={cn(
                  "relative p-3 rounded-lg border transition-all duration-200 text-left group",
                  isActive 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center",
                    colors.bg,
                    "border border-border/50"
                  )}>
                    <div className={cn("w-3 h-3 rounded-full", colors.accent)} />
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium">{theme.label}</div>
                <div className="text-[10px] text-muted-foreground line-clamp-1">
                  {theme.description}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Dropdown variant
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        {themeIcons[currentTheme]}
        <span className="hidden sm:inline">{themes[currentTheme].label}</span>
      </Button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-64 p-2 rounded-lg border border-border bg-popover shadow-lg animate-scale-in">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mb-1">
              Choose Theme
            </div>
            {(Object.keys(themes) as ThemeName[]).map((themeName) => {
              const theme = themes[themeName]
              const colors = themePreviewColors[themeName]
              const isActive = currentTheme === themeName
              
              return (
                <button
                  key={themeName}
                  onClick={() => {
                    setTheme(themeName)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "hover:bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center border border-border/50",
                    colors.bg
                  )}>
                    <div className={cn("w-3 h-3 rounded-full", colors.accent)} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium">{theme.label}</div>
                    <div className="text-xs text-muted-foreground">{theme.description}</div>
                  </div>
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default ThemeSwitcher
