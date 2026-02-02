import { cn } from '@/lib/utils'

interface CarvLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTagline?: boolean
  variant?: 'default' | 'minimal' | 'full'
  className?: string
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
}

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-11 h-11',
}

export function CarvLogo({ 
  size = 'md', 
  showTagline = false, 
  variant = 'default',
  className 
}: CarvLogoProps) {
  
  // Custom SVG icon representing carving/CNC
  const LogoIcon = () => (
    <svg 
      viewBox="0 0 32 32" 
      fill="none" 
      className={cn(iconSizes[size], "flex-shrink-0")}
    >
      {/* Outer ring with gradient */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--gradient-start))" />
          <stop offset="100%" stopColor="hsl(var(--gradient-end))" />
        </linearGradient>
        <linearGradient id="logoGradientDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--gradient-start) / 0.3)" />
          <stop offset="100%" stopColor="hsl(var(--gradient-end) / 0.3)" />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <circle 
        cx="16" 
        cy="16" 
        r="14" 
        fill="url(#logoGradientDark)"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
      />
      
      {/* Stylized "C" that looks like a cutting path */}
      <path
        d="M20 10C18.5 8.5 16.5 8 14.5 8C10.5 8 8 11 8 16C8 21 10.5 24 14.5 24C16.5 24 18.5 23.5 20 22"
        stroke="url(#logoGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Tool/bit indicator */}
      <circle 
        cx="21" 
        cy="10" 
        r="2.5" 
        fill="url(#logoGradient)"
      />
      
      {/* Carving lines */}
      <path
        d="M12 13L18 13M12 16L16 16M12 19L18 19"
        stroke="hsl(var(--foreground) / 0.4)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center", className)}>
        <LogoIcon />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoIcon />
      <div className="flex flex-col">
        <span 
          className={cn(
            "font-display font-bold tracking-tight leading-none",
            sizeClasses[size]
          )}
        >
          <span className="gradient-text">Carv</span>
        </span>
        {showTagline && (
          <span className="text-[10px] text-muted-foreground tracking-wide uppercase mt-0.5">
            Design • Cut • Create
          </span>
        )}
      </div>
    </div>
  )
}

// Animated version for loading screens or splash
export function CarvLogoAnimated({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-xl opacity-50">
          <CarvLogo size={size} variant="minimal" />
        </div>
        {/* Main logo */}
        <div className="relative animate-float">
          <CarvLogo size={size} variant="minimal" />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className={cn(
          "font-display font-bold tracking-tight gradient-text",
          size === 'xl' ? 'text-5xl' : size === 'lg' ? 'text-4xl' : 'text-3xl'
        )}>
          Carv
        </span>
        <span className="text-sm text-muted-foreground tracking-widest uppercase mt-1">
          Design • Cut • Create
        </span>
      </div>
    </div>
  )
}

// Compact inline logo for headers
export function CarvLogoInline({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <svg 
        viewBox="0 0 32 32" 
        fill="none" 
        className="w-5 h-5"
      >
        <defs>
          <linearGradient id="inlineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--gradient-start))" />
            <stop offset="100%" stopColor="hsl(var(--gradient-end))" />
          </linearGradient>
        </defs>
        <circle 
          cx="16" 
          cy="16" 
          r="14" 
          fill="hsl(var(--gradient-start) / 0.15)"
          stroke="url(#inlineGradient)"
          strokeWidth="1.5"
        />
        <path
          d="M20 10C18.5 8.5 16.5 8 14.5 8C10.5 8 8 11 8 16C8 21 10.5 24 14.5 24C16.5 24 18.5 23.5 20 22"
          stroke="url(#inlineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle 
          cx="21" 
          cy="10" 
          r="2" 
          fill="url(#inlineGradient)"
        />
      </svg>
      <span className="font-display font-semibold text-base tracking-tight">
        <span className="gradient-text">Carv</span>
      </span>
    </div>
  )
}

export default CarvLogo
