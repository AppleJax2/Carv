import { useState, useRef, useEffect } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { Button } from './ui/button'
import {
  Play,
  Pause,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move3D,
  Clock,
  Wrench,
  ChevronLeft
} from 'lucide-react'
import type { Tool } from '@/types/machine'

interface CarvePreviewProps {
  materialWidth: number
  materialHeight: number
  materialThickness: number
  materialColor: string
  roughingBit: Tool | null
  finishingBit: Tool | null
  useTwoBits: boolean
  onClose: () => void
  onStartCarve: () => void
}

export function CarvePreview({
  materialWidth,
  materialHeight,
  materialThickness,
  materialColor,
  roughingBit,
  finishingBit,
  useTwoBits,
  onClose,
  onStartCarve,
}: CarvePreviewProps) {
  const { project } = useDesignStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [viewAngle, setViewAngle] = useState({ x: 30, y: -45 })
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Estimated times (simplified calculation)
  const roughingTime = useTwoBits && roughingBit ? 15 : 0
  const finishingTime = (useTwoBits ? finishingBit : roughingBit) ? 25 : 0
  const totalTime = roughingTime + finishingTime

  // Animation
  useEffect(() => {
    if (!isPlaying) return
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setIsPlaying(false)
          return 100
        }
        return prev + 0.5
      })
    }, 50)

    return () => clearInterval(interval)
  }, [isPlaying])

  // 3D Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Simple isometric projection
    const scale = zoom * Math.min(width, height) / Math.max(materialWidth, materialHeight, materialThickness * 5) * 0.4
    const centerX = width / 2
    const centerY = height / 2

    const angleX = (viewAngle.x * Math.PI) / 180
    const angleY = (viewAngle.y * Math.PI) / 180

    // Project 3D point to 2D
    const project3D = (x: number, y: number, z: number) => {
      // Rotate around Y axis
      const x1 = x * Math.cos(angleY) - z * Math.sin(angleY)
      const z1 = x * Math.sin(angleY) + z * Math.cos(angleY)
      
      // Rotate around X axis
      const y1 = y * Math.cos(angleX) - z1 * Math.sin(angleX)
      const z2 = y * Math.sin(angleX) + z1 * Math.cos(angleX)

      return {
        x: centerX + x1 * scale,
        y: centerY - y1 * scale,
        z: z2
      }
    }

    // Draw material block
    const hw = materialWidth / 2
    const hh = materialHeight / 2
    const th = materialThickness

    // Calculate carved depth based on progress
    const carveDepth = (progress / 100) * th * 0.8

    // Vertices of the material block
    const vertices = [
      // Top face (with carve)
      { x: -hw, y: hh, z: th - carveDepth },
      { x: hw, y: hh, z: th - carveDepth },
      { x: hw, y: -hh, z: th - carveDepth },
      { x: -hw, y: -hh, z: th - carveDepth },
      // Bottom face
      { x: -hw, y: hh, z: 0 },
      { x: hw, y: hh, z: 0 },
      { x: hw, y: -hh, z: 0 },
      { x: -hw, y: -hh, z: 0 },
    ]

    const projected = vertices.map(v => project3D(v.x, v.y, v.z))

    // Draw faces (back to front based on view angle)
    const drawFace = (indices: number[], color: string, darken: number = 0) => {
      ctx.beginPath()
      ctx.moveTo(projected[indices[0]].x, projected[indices[0]].y)
      for (let i = 1; i < indices.length; i++) {
        ctx.lineTo(projected[indices[i]].x, projected[indices[i]].y)
      }
      ctx.closePath()
      
      // Adjust color brightness
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      const factor = 1 - darken * 0.3
      ctx.fillStyle = `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw faces based on view angle (simplified)
    // Bottom
    if (viewAngle.x > 0) {
      drawFace([4, 5, 6, 7], materialColor, 2)
    }
    
    // Back faces
    if (viewAngle.y < 0) {
      drawFace([1, 2, 6, 5], materialColor, 1.5) // Right
    } else {
      drawFace([0, 4, 7, 3], materialColor, 1.5) // Left
    }
    
    if (viewAngle.x < 45) {
      drawFace([0, 1, 5, 4], materialColor, 1) // Front
    } else {
      drawFace([2, 3, 7, 6], materialColor, 1) // Back
    }

    // Top face (carved surface)
    drawFace([0, 1, 2, 3], materialColor, 0)

    // Draw carve indication (simplified - just show toolpath lines)
    if (progress > 0 && project) {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)'
      ctx.lineWidth = 2
      
      // Draw some representative toolpath lines
      const stepover = 5
      const carvedLines = Math.floor((progress / 100) * (materialHeight / stepover))
      
      for (let i = 0; i < carvedLines; i++) {
        const y = -hh + i * stepover
        const p1 = project3D(-hw + 10, y, th - carveDepth + 1)
        const p2 = project3D(hw - 10, y, th - carveDepth + 1)
        
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
    }

    // Draw bit indicator
    if (progress > 0 && progress < 100) {
      const currentBit = useTwoBits && progress < 50 ? roughingBit : (useTwoBits ? finishingBit : roughingBit)
      if (currentBit) {
        const bitX = (Math.sin(progress * 0.1) * hw * 0.8)
        const bitY = (-hh + (progress / 100) * materialHeight)
        const bitPos = project3D(bitX, bitY, th + 10)
        
        // Draw bit
        ctx.fillStyle = '#666'
        ctx.beginPath()
        ctx.arc(bitPos.x, bitPos.y, currentBit.geometry.diameter * scale * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#888'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // Draw grid on wasteboard
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)'
    ctx.lineWidth = 0.5
    const gridSize = 50
    for (let x = -hw; x <= hw; x += gridSize) {
      const p1 = project3D(x, -hh, -2)
      const p2 = project3D(x, hh, -2)
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }
    for (let y = -hh; y <= hh; y += gridSize) {
      const p1 = project3D(-hw, y, -2)
      const p2 = project3D(hw, y, -2)
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.stroke()
    }

  }, [viewAngle, zoom, progress, materialWidth, materialHeight, materialThickness, materialColor, project, useTwoBits, roughingBit, finishingBit])

  // Mouse handlers for rotation
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    
    setViewAngle(prev => ({
      x: Math.max(-90, Math.min(90, prev.x + dy * 0.5)),
      y: prev.y + dx * 0.5
    }))
    
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const resetView = () => {
    setViewAngle({ x: 30, y: -45 })
    setZoom(1)
    setProgress(0)
    setIsPlaying(false)
  }

  const currentPhase = useTwoBits 
    ? (progress < 50 ? 'Roughing' : 'Finishing')
    : 'Cutting'

  const currentBit = useTwoBits 
    ? (progress < 50 ? roughingBit : finishingBit)
    : roughingBit

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" />
            Back to Edit
          </button>
          <h2 className="text-base font-semibold">Carve Preview</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={onStartCarve}>
            <Play className="w-4 h-4 mr-1" />
            Start Carve
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* 3D Preview */}
        <div className="flex-1 relative bg-[#1a1a2e]">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />

          {/* View controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button variant="secondary" size="icon-sm" onClick={() => setZoom(z => Math.min(z + 0.2, 3))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={resetView}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Drag hint */}
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground flex items-center gap-1">
            <Move3D className="w-4 h-4" />
            Drag to rotate view
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 border-l border-border bg-card flex flex-col">
          {/* Progress */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Simulation</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            
            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
              <div 
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setProgress(0)}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button 
                variant={isPlaying ? "secondary" : "default"}
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <input
                type="range"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => {
                  setIsPlaying(false)
                  setProgress(Number(e.target.value))
                }}
                className="flex-1"
              />
            </div>
          </div>

          {/* Current operation */}
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium mb-2">Current Operation</h3>
            <div className="bg-muted/50 rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Phase:</span>
                <span className="text-sm font-medium">{currentPhase}</span>
              </div>
              {currentBit && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Bit:</span>
                    <span className="text-xs font-medium truncate max-w-32">{currentBit.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Diameter:</span>
                    <span className="text-xs">{currentBit.geometry.diameter}mm</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Time estimate */}
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Estimate
            </h3>
            <div className="space-y-2">
              {useTwoBits && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Roughing:</span>
                    <span>{roughingTime} min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Finishing:</span>
                    <span>{finishingTime} min</span>
                  </div>
                  <div className="border-t border-border pt-2 flex items-center justify-between text-sm font-medium">
                    <span>Total:</span>
                    <span>{totalTime} min</span>
                  </div>
                </>
              )}
              {!useTwoBits && (
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total:</span>
                  <span>{finishingTime} min</span>
                </div>
              )}
            </div>
          </div>

          {/* Tool changes */}
          {useTwoBits && (
            <div className="p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Tool Changes
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">1</div>
                  <span className="truncate">{roughingBit?.name || 'Roughing bit'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs">2</div>
                  <span className="truncate">{finishingBit?.name || 'Finishing bit'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
