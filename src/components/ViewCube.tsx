import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Home } from 'lucide-react'

interface ViewCubeProps {
  onViewChange: (view: ViewDirection) => void
  rotation?: { x: number; y: number }
  onRotationChange?: (rotation: { x: number; y: number }) => void
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
}

const CUBE_SIZE = 44
const HALF_SIZE = CUBE_SIZE / 2

const CUBE_FACES: CubeFace[] = [
  { name: 'TOP', view: 'top', transform: `rotateX(90deg) translateZ(${HALF_SIZE}px)` },
  { name: 'BOTTOM', view: 'bottom', transform: `rotateX(-90deg) translateZ(${HALF_SIZE}px)` },
  { name: 'FRONT', view: 'front', transform: `translateZ(${HALF_SIZE}px)` },
  { name: 'BACK', view: 'back', transform: `rotateY(180deg) translateZ(${HALF_SIZE}px)` },
  { name: 'LEFT', view: 'left', transform: `rotateY(-90deg) translateZ(${HALF_SIZE}px)` },
  { name: 'RIGHT', view: 'right', transform: `rotateY(90deg) translateZ(${HALF_SIZE}px)` },
]

// Standard view rotations for detecting when to show arrows
const STANDARD_VIEWS: Record<ViewDirection, { x: number; y: number }> = {
  'top': { x: -90, y: 0 },
  'bottom': { x: 90, y: 0 },
  'front': { x: 0, y: 0 },
  'back': { x: 0, y: 180 },
  'left': { x: 0, y: 90 },
  'right': { x: 0, y: -90 },
  'iso-front-right': { x: -25, y: 35 },
  'iso-front-left': { x: -25, y: -35 },
  'iso-back-right': { x: -25, y: 145 },
  'iso-back-left': { x: -25, y: -145 },
}

// Simple triangular arrow component like Fusion 360
function RotationArrow({ 
  direction, 
  onClick, 
  position 
}: { 
  direction: 'up' | 'down' | 'left' | 'right'
  onClick: () => void
  position: 'top' | 'bottom' | 'left' | 'right'
}) {
  const positionClasses = {
    top: '-top-1 left-1/2 -translate-x-1/2 -translate-y-full',
    bottom: '-bottom-1 left-1/2 -translate-x-1/2 translate-y-full',
    left: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full',
    right: 'right-0 top-1/2 -translate-y-1/2 translate-x-full',
  }

  // Rotation for the triangle to point in the right direction
  const rotation = {
    up: 0,
    down: 180,
    left: -90,
    right: 90,
  }[direction]

  return (
    <button
      className={cn(
        'absolute flex items-center justify-center',
        'text-muted-foreground/60 hover:text-primary transition-colors',
        'cursor-pointer z-10',
        positionClasses[position]
      )}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={`Rotate view ${direction}`}
    >
      {/* Simple triangle pointing outward */}
      <svg 
        width="10" 
        height="8" 
        viewBox="0 0 10 8" 
        fill="currentColor"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <path d="M5 0L10 8H0L5 0Z" />
      </svg>
    </button>
  )
}

export function ViewCube({ 
  onViewChange, 
  rotation: externalRotation,
  onRotationChange,
  className 
}: ViewCubeProps) {
  const [internalRotation, setInternalRotation] = useState({ x: -25, y: 35 })
  const [isDragging, setIsDragging] = useState(false)
  const [hoveredFace, setHoveredFace] = useState<string | null>(null)
  const [currentView, setCurrentView] = useState<ViewDirection | null>('iso-front-right')
  const lastPos = useRef({ x: 0, y: 0 })

  // Use external rotation if provided, otherwise use internal
  const rotation = externalRotation ?? internalRotation

  const setRotation = useCallback((newRotation: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    const resolved = typeof newRotation === 'function' ? newRotation(rotation) : newRotation
    setInternalRotation(resolved)
    onRotationChange?.(resolved)
  }, [rotation, onRotationChange])

  // Detect if we're at a standard view (within tolerance)
  const isAtStandardView = useCallback((rot: { x: number; y: number }): ViewDirection | null => {
    const tolerance = 5
    for (const [view, stdRot] of Object.entries(STANDARD_VIEWS)) {
      const normalizedY = ((rot.y % 360) + 360) % 360
      const normalizedStdY = ((stdRot.y % 360) + 360) % 360
      
      const xMatch = Math.abs(rot.x - stdRot.x) < tolerance
      const yMatch = Math.abs(normalizedY - normalizedStdY) < tolerance || 
                     Math.abs(normalizedY - normalizedStdY - 360) < tolerance ||
                     Math.abs(normalizedY - normalizedStdY + 360) < tolerance
      
      if (xMatch && yMatch) {
        return view as ViewDirection
      }
    }
    return null
  }, [])

  // Update current view when rotation changes
  useEffect(() => {
    const view = isAtStandardView(rotation)
    setCurrentView(view)
  }, [rotation, isAtStandardView])

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
  }, [isDragging, setRotation])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFaceClick = useCallback((view: ViewDirection) => {
    const newRotation = STANDARD_VIEWS[view]
    setRotation(newRotation)
    setCurrentView(view)
    onViewChange(view)
  }, [onViewChange, setRotation])

  // Handle rotation arrow clicks - rotate 90 degrees in the specified direction
  const handleRotationArrow = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    setRotation(prev => {
      let newRotation = { ...prev }
      switch (direction) {
        case 'up':
          newRotation.x = Math.max(-90, prev.x - 90)
          break
        case 'down':
          newRotation.x = Math.min(90, prev.x + 90)
          break
        case 'left':
          newRotation.y = prev.y - 90
          break
        case 'right':
          newRotation.y = prev.y + 90
          break
      }
      return newRotation
    })
  }, [setRotation])

  const handleHomeClick = useCallback(() => {
    setRotation({ x: -25, y: 35 })
    setCurrentView('iso-front-right')
    onViewChange('iso-front-right')
  }, [onViewChange, setRotation])

  // Show rotation arrows only at standard orthographic views (not iso)
  const showArrows = currentView && ['top', 'bottom', 'front', 'back', 'left', 'right'].includes(currentView)

  return (
    <div 
      className={cn(
        'relative select-none flex items-start gap-1',
        className
      )}
    >
      {/* Home button - positioned to the LEFT of the cube */}
      <button
        className={cn(
          'w-5 h-5 mt-6 flex items-center justify-center',
          'text-muted-foreground hover:text-foreground transition-colors'
        )}
        onClick={handleHomeClick}
        title="Reset to home view"
      >
        <Home className="w-4 h-4" />
      </button>

      {/* Main cube container with arrows */}
      <div className="relative" style={{ width: 80, height: 100 }}>
        {/* Rotation arrows - only show at standard views */}
        {showArrows && (
          <>
            <RotationArrow direction="up" position="top" onClick={() => handleRotationArrow('up')} />
            <RotationArrow direction="down" position="bottom" onClick={() => handleRotationArrow('down')} />
            <RotationArrow direction="left" position="left" onClick={() => handleRotationArrow('left')} />
            <RotationArrow direction="right" position="right" onClick={() => handleRotationArrow('right')} />
          </>
        )}
        
        {/* Cube drag area */}
        <div 
          className="absolute top-3 left-0"
          style={{ width: 80, height: 80 }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* 3D Cube */}
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{
              perspective: '200px',
              perspectiveOrigin: 'center center',
            }}
          >
            <div
              className="relative"
              style={{
                width: CUBE_SIZE,
                height: CUBE_SIZE,
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              {CUBE_FACES.map((face) => (
                <div
                  key={face.name}
                  className={cn(
                    'absolute flex items-center justify-center',
                    'text-[9px] font-semibold cursor-pointer transition-all duration-150',
                    'border border-gray-300 dark:border-gray-600',
                    'shadow-sm',
                    hoveredFace === face.name 
                      ? 'bg-primary/80 text-primary-foreground border-primary' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  )}
                  style={{
                    width: CUBE_SIZE,
                    height: CUBE_SIZE,
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
            </div>
          </div>
        </div>

        {/* XYZ Axis labels positioned around the cube */}
        <div 
          className="absolute pointer-events-none"
          style={{
            top: '50%',
            right: -16,
            transform: 'translateY(-50%)',
          }}
        >
          <span className="text-[11px] font-bold text-red-500">X</span>
        </div>
        <div 
          className="absolute pointer-events-none"
          style={{
            top: -4,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <span className="text-[11px] font-bold text-green-500">Y</span>
        </div>
        <div 
          className="absolute pointer-events-none"
          style={{
            bottom: -4,
            left: -12,
          }}
        >
          <span className="text-[11px] font-bold text-blue-500">Z</span>
        </div>
      </div>
    </div>
  )
}

export function ViewControls({ className, mode = '2d' }: { className?: string; mode?: '2d' | '3d' }) {
  if (mode === '3d') {
    return (
      <div className={cn('flex flex-col gap-1 text-[10px] text-muted-foreground', className)}>
        <div className="flex items-center gap-2">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">LMB</kbd>
          <span>Select</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">RMB</kbd>
          <span>Orbit</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">MMB</kbd>
          <span>Pan</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Scroll</kbd>
          <span>Zoom</span>
        </div>
      </div>
    )
  }
  
  return (
    <div className={cn('flex flex-col gap-1 text-[10px] text-muted-foreground', className)}>
      <div className="flex items-center gap-2">
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Scroll</kbd>
        <span>Zoom</span>
      </div>
      <div className="flex items-center gap-2">
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">MMB</kbd>
        <span>Pan</span>
      </div>
    </div>
  )
}
