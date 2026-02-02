import { useState, useEffect, useRef, useCallback } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { generateGcode } from '@/lib/gcodeGenerator'
import { 
  parseGcodeForSimulation, 
  getPointAtTime, 
  formatSimulationTime,
  type SimulationData 
} from '@/lib/toolpathSimulator'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  X, 
  FastForward,
  Rewind,
  SkipBack,
  SkipForward
} from 'lucide-react'

interface SimulationViewProps {
  onClose: () => void
}

export function SimulationView({ onClose }: SimulationViewProps) {
  const { project, tools, machineConfig } = useDesignStore()
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  
  const [simulation, setSimulation] = useState<SimulationData | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!project || !machineConfig) {
      setError('No project or machine configuration')
      return
    }

    const enabledToolpaths = project.toolpaths.filter(t => t.enabled)
    if (enabledToolpaths.length === 0) {
      setError('No enabled toolpaths to simulate')
      return
    }

    try {
      const allGcode: string[] = []

      for (const toolpath of enabledToolpaths) {
        const tool = tools.find(t => t.id === toolpath.toolId)
        if (!tool) continue

        const result = generateGcode({
          toolpath,
          tool,
          objects: project.objects,
          machineConfig,
          postProcessor: machineConfig.postProcessor,
        })

        allGcode.push(...result.gcode)
      }

      const simData = parseGcodeForSimulation(allGcode, machineConfig.rapids.xy)
      setSimulation(simData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate simulation')
    }
  }, [project, tools, machineConfig])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !simulation || !project) return

    const { width, height } = canvas
    const { bounds } = simulation

    ctx.fillStyle = '#0a0a14'
    ctx.fillRect(0, 0, width, height)

    const padding = 40
    const simWidth = bounds.maxX - bounds.minX
    const simHeight = bounds.maxY - bounds.minY
    
    const scaleX = (width - padding * 2) / (simWidth || 1)
    const scaleY = (height - padding * 2) / (simHeight || 1)
    const scale = Math.min(scaleX, scaleY)

    const offsetX = padding + (width - padding * 2 - simWidth * scale) / 2
    const offsetY = padding + (height - padding * 2 - simHeight * scale) / 2

    const toScreen = (x: number, y: number) => ({
      x: offsetX + (x - bounds.minX) * scale,
      y: height - offsetY - (y - bounds.minY) * scale,
    })

    ctx.strokeStyle = '#1e3a5f'
    ctx.lineWidth = 1
    ctx.strokeRect(
      offsetX,
      height - offsetY - simHeight * scale,
      simWidth * scale,
      simHeight * scale
    )

    const currentPos = getPointAtTime(simulation, currentTime)
    const currentPointIndex = simulation.points.findIndex(p => p.time > currentTime)

    for (let i = 1; i < simulation.points.length; i++) {
      const p0 = simulation.points[i - 1]
      const p1 = simulation.points[i]
      
      const s0 = toScreen(p0.x, p0.y)
      const s1 = toScreen(p1.x, p1.y)

      const isPast = i < currentPointIndex

      if (p1.type === 'rapid') {
        ctx.strokeStyle = isPast ? '#666666' : '#333333'
        ctx.setLineDash([4, 4])
      } else {
        if (p1.z < 0) {
          ctx.strokeStyle = isPast ? '#3b82f6' : '#1e40af'
        } else {
          ctx.strokeStyle = isPast ? '#22c55e' : '#166534'
        }
        ctx.setLineDash([])
      }

      ctx.lineWidth = isPast ? 2 : 1
      ctx.beginPath()
      ctx.moveTo(s0.x, s0.y)
      ctx.lineTo(s1.x, s1.y)
      ctx.stroke()
    }

    ctx.setLineDash([])

    const toolScreen = toScreen(currentPos.x, currentPos.y)
    const toolRadius = 8

    ctx.fillStyle = currentPos.z < 0 ? '#ef4444' : '#22c55e'
    ctx.beginPath()
    ctx.arc(toolScreen.x, toolScreen.y, toolRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`X: ${currentPos.x.toFixed(2)}`, 10, 20)
    ctx.fillText(`Y: ${currentPos.y.toFixed(2)}`, 10, 36)
    ctx.fillText(`Z: ${currentPos.z.toFixed(2)}`, 10, 52)

  }, [simulation, currentTime, project])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = canvas.clientWidth
      canvas.height = canvas.clientHeight
      draw()
    })

    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [draw])

  useEffect(() => {
    if (!isPlaying || !simulation) return

    let lastTime = performance.now()

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000
      lastTime = now

      setCurrentTime(prev => {
        const next = prev + delta * playbackSpeed
        if (next >= simulation.totalTime) {
          setIsPlaying(false)
          return simulation.totalTime
        }
        return next
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, simulation, playbackSpeed])

  const handlePlayPause = () => {
    if (simulation && currentTime >= simulation.totalTime) {
      setCurrentTime(0)
    }
    setIsPlaying(!isPlaying)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value))
  }

  const handleStepBack = () => {
    setCurrentTime(prev => Math.max(0, prev - 1))
  }

  const handleStepForward = () => {
    if (simulation) {
      setCurrentTime(prev => Math.min(simulation.totalTime, prev + 1))
    }
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>Simulation Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={onClose}>Close</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Toolpath Simulation</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>

      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleStepBack}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="default" size="icon" onClick={handlePlayPause}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleStepForward}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={simulation?.totalTime || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-2 text-sm font-mono">
            <span>{formatSimulationTime(currentTime)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">
              {formatSimulationTime(simulation?.totalTime || 0)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant={playbackSpeed === 0.5 ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setPlaybackSpeed(0.5)}
            >
              <Rewind className="w-3 h-3 mr-1" />
              0.5x
            </Button>
            <Button 
              variant={playbackSpeed === 1 ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setPlaybackSpeed(1)}
            >
              1x
            </Button>
            <Button 
              variant={playbackSpeed === 2 ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setPlaybackSpeed(2)}
            >
              2x
            </Button>
            <Button 
              variant={playbackSpeed === 5 ? 'default' : 'ghost'} 
              size="sm"
              onClick={() => setPlaybackSpeed(5)}
            >
              <FastForward className="w-3 h-3 mr-1" />
              5x
            </Button>
          </div>
        </div>

        {simulation && (
          <div className="flex items-center gap-6 mt-3 text-xs text-muted-foreground">
            <span>Total Distance: {(simulation.totalDistance / 1000).toFixed(2)} m</span>
            <span>Points: {simulation.points.length}</span>
            <span>
              Bounds: X[{simulation.bounds.minX.toFixed(1)}, {simulation.bounds.maxX.toFixed(1)}] 
              Y[{simulation.bounds.minY.toFixed(1)}, {simulation.bounds.maxY.toFixed(1)}]
              Z[{simulation.bounds.minZ.toFixed(1)}, {simulation.bounds.maxZ.toFixed(1)}]
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
