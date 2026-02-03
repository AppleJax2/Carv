import { cn } from '@/lib/utils'

interface CarvLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showTagline?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
}

export function CarvLogo({ 
  size = 'md', 
  showTagline = false, 
  className 
}: CarvLogoProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className={cn("font-black tracking-tight leading-none", sizeClasses[size])}>
        <span className="text-primary">C</span>
        <span className="text-foreground">arv</span>
      </span>
      {showTagline && (
        <span className="text-[10px] text-muted-foreground tracking-wide uppercase mt-0.5">
          Design • Cut • Create
        </span>
      )}
    </div>
  )
}

// Animated version for loading screens or splash
export function CarvLogoAnimated({ size = 'lg' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-xl opacity-30">
          <span className={cn(
            "font-black tracking-tight text-primary",
            size === 'xl' ? 'text-6xl' : size === 'lg' ? 'text-5xl' : 'text-4xl'
          )}>
            C
          </span>
        </div>
        {/* Main logo */}
        <div className="relative animate-float">
          <span className={cn(
            "font-black tracking-tight",
            size === 'xl' ? 'text-6xl' : size === 'lg' ? 'text-5xl' : 'text-4xl'
          )}>
            <span className="text-primary">C</span>
            <span className="text-foreground">arv</span>
          </span>
        </div>
      </div>
      <span className="text-sm text-muted-foreground tracking-widest uppercase">
        Design • Cut • Create
      </span>
    </div>
  )
}

// Compact inline logo for headers
export function CarvLogoInline({ className }: { className?: string }) {
  return (
    <span className={cn("font-black text-xl tracking-tight", className)}>
      <span className="text-primary">C</span>
      <span className="text-foreground">arv</span>
    </span>
  )
}

export default CarvLogo
