import { useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface ViewCubeProps {
  onViewChange: (view: ViewDirection) => void
  className?: string
}

export type ViewDirection = 
  | 'top' 
  | 'bottom' 
  | 'front' 
  | 'back' 
  | 'left' 
  | 'right'
  | 'iso-front-right'
  | 'iso-front-left'
  | 'iso-back-right'
  | 'iso-back-left'

interface CubeFace {
  name: string
  view: ViewDirection
  transform: string
  labelTransform?: string
}

const CUBE_FACES: CubeFace[] = [
  { name: 'TOP', view: 'top', transform: 'rotateX(90deg) translateZ(25px)' },
  { name: 'BOTTOM', view: 'bottom', transform: 'rotateX(-90deg) translateZ(25px)' },
  { name: 'FRONT', view: 'front', transform: 'translateZ(25px)' },
  { name: 'BACK', view: 'back', transform: 'rotateY(180deg) translateZ(25px)' },
  { name: 'LEFT', view: 'left', transform: 'rotateY(-90deg) translateZ(25px)' },
  { name: 'RIGHT', view: 'right', transform: 'rotateY(90deg) translateZ(25px)' },
]

export function ViewCube({ onViewChange, className }: ViewCubeProps) {
  const [rotation, setRotation] = useState({ x: -25, y: 35 })
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredFace, setHoveredFace] = useState<string | null>(null)
  const lastPos = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    
    setRotation(prev => ({
      x: Math.max(-90, Math.min(90, prev.x - dy * 0.5)),
      y: prev.y + dx * 0.5,
    }))
    
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFaceClick = useCallback((view: ViewDirection) => {
    onViewChange(view)
    
    switch (view) {
      case 'top':
        setRotation({ x: -90, y: 0 })
        break
      case 'bottom':
        setRotation({ x: 90, y: 0 })
        break
      case 'front':
        setRotation({ x: 0, y: 0 })
        break
      case 'back':
        setRotation({ x: 0, y: 180 })
        break
      case 'left':
        setRotation({ x: 0, y: 90 })
        break
      case 'right':
        setRotation({ x: 0, y: -90 })
        break
    }
  }, [onViewChange])

  const handleCornerClick = useCallback((corner: string) => {
    let view: ViewDirection = 'iso-front-right'
    let newRotation = { x: -25, y: 35 }
    
    switch (corner) {
      case 'front-right':
        view = 'iso-front-right'
        newRotation = { x: -25, y: 35 }
        break
      case 'front-left':
        view = 'iso-front-left'
        newRotation = { x: -25, y: -35 }
        break
      case 'back-right':
        view = 'iso-back-right'
        newRotation = { x: -25, y: 145 }
        break
      case 'back-left':
        view = 'iso-back-left'
        newRotation = { x: -25, y: -145 }
        break
    }
    
    setRotation(newRotation)
    onViewChange(view)
  }, [onViewChange])

  return (
    <div 
      className={cn(
        'relative w-[100px] h-[100px] select-none',
        className
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div 
        className="w-full h-full"
        style={{
          perspective: '300px',
          perspectiveOrigin: 'center center',
        }}
      >
        <div
          className="relative w-[50px] h-[50px] mx-auto mt-[25px]"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          {CUBE_FACES.map((face) => (
            <div
              key={face.name}
              className={cn(
                'absolute w-[50px] h-[50px] flex items-center justify-center',
                'text-[8px] font-bold cursor-pointer transition-colors',
                'border border-primary/30',
                hoveredFace === face.name 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-card/90 text-foreground hover:bg-primary/20'
              )}
              style={{
                transform: face.transform,
                backfaceVisibility: 'hidden',
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleFaceClick(face.view)
              }}
              onMouseEnter={() => setHoveredFace(face.name)}
              onMouseLeave={() => setHoveredFace(null)}
            >
              {face.name}
            </div>
          ))}

          {/* Corner indicators */}
          {[
            { corner: 'front-right', pos: [20, -20, 20] },
            { corner: 'front-left', pos: [-20, -20, 20] },
            { corner: 'back-right', pos: [20, -20, -20] },
            { corner: 'back-left', pos: [-20, -20, -20] },
          ].map(({ corner, pos }) => (
            <div
              key={corner}
              className="absolute w-2 h-2 rounded-full bg-primary/50 hover:bg-primary cursor-pointer"
              style={{
                transform: `translate3d(${pos[0]}px, ${pos[1]}px, ${pos[2]}px)`,
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleCornerClick(corner)
              }}
            />
          ))}
        </div>
      </div>

      {/* Axis indicators */}
      <div className="absolute bottom-1 left-1 text-[10px] font-mono">
        <span className="text-red-500">X</span>
        <span className="text-green-500 ml-1">Y</span>
        <span className="text-blue-500 ml-1">Z</span>
      </div>

      {/* Home button */}
      <button
        className="absolute top-1 right-1 w-5 h-5 rounded bg-card/80 hover:bg-primary/20 flex items-center justify-center text-[10px] border border-border"
        onClick={() => {
          setRotation({ x: -25, y: 35 })
          onViewChange('iso-front-right')
        }}
        title="Reset to isometric view"
      >
        ⌂
      </button>
    </div>
  )
}

export function ViewControls({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1 text-[10px] text-muted-foreground', className)}>
      <div className="flex items-center gap-2">
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Scroll</kbd>
        <span>Zoom</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">MMB</kbd>
        <span>Rotate</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Shift+MMB</kbd>
        <span>Pan</span>
      </div>
    </div>
  )
}
