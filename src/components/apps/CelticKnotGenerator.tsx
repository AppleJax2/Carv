import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { X, Infinity, RotateCcw, Download, Plus, Eye, EyeOff } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface CelticKnotGeneratorProps {
  onClose: () => void
}

interface CelticKnotConfig {
  pattern: 'basic' | 'triquetra' | 'quaternary' | 'spiral' | 'border' | 'circular'
  size: number
  strandWidth: number
  gap: number
  cornerRadius: number
  complexity: number
  // Border specific
  borderLength: number
  borderHeight: number
  repeatCount: number
  // Circular specific
  rings: number
  segments: number
}

interface KnotPath {
  points: PathPoint[]
  isOver: boolean
}

// Generate basic interlaced knot
function generateBasicKnot(size: number, strandWidth: number, gap: number): KnotPath[] {
  const paths: KnotPath[] = []
  const halfSize = size / 2
  const r = halfSize - strandWidth

  // Create a simple figure-8 knot
  const segments = 64
  const strand1: PathPoint[] = []
  const strand2: PathPoint[] = []

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    // Lemniscate (figure-8) curve
    const scale = r / (1 + Math.sin(t) * Math.sin(t))
    const x = scale * Math.cos(t)
    const y = scale * Math.sin(t) * Math.cos(t)

    strand1.push({
      x: x + halfSize,
      y: y + halfSize,
      type: i === 0 ? 'move' : 'line',
    })
  }

  // Offset strand for width
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2
    const scale = (r - strandWidth - gap) / (1 + Math.sin(t) * Math.sin(t))
    const x = scale * Math.cos(t)
    const y = scale * Math.sin(t) * Math.cos(t)

    strand2.push({
      x: x + halfSize,
      y: y + halfSize,
      type: i === 0 ? 'move' : 'line',
    })
  }

  paths.push({ points: strand1, isOver: true })
  paths.push({ points: strand2, isOver: false })

  return paths
}

// Generate triquetra (trinity knot)
function generateTriquetra(size: number, strandWidth: number): KnotPath[] {
  const paths: KnotPath[] = []
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - strandWidth * 2

  // Three interlocking arcs
  const angles = [0, 120, 240]

  angles.forEach((baseAngle, idx) => {
    const strand: PathPoint[] = []
    const segments = 40
    const angleRad = (baseAngle * Math.PI) / 180

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 1.5 - Math.PI * 0.25
      const loopR = r * 0.6

      // Vesica piscis-like loop
      const localX = loopR * Math.cos(t)
      const localY = loopR * Math.sin(t) * 0.8

      // Rotate and position
      const cos = Math.cos(angleRad)
      const sin = Math.sin(angleRad)
      const x = cx + (localX * cos - localY * sin) + Math.cos(angleRad + Math.PI / 2) * r * 0.3
      const y = cy + (localX * sin + localY * cos) + Math.sin(angleRad + Math.PI / 2) * r * 0.3

      strand.push({
        x,
        y,
        type: i === 0 ? 'move' : 'line',
      })
    }

    paths.push({ points: strand, isOver: idx % 2 === 0 })
  })

  return paths
}

// Generate quaternary knot (4-fold)
function generateQuaternary(size: number, strandWidth: number): KnotPath[] {
  const paths: KnotPath[] = []
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - strandWidth * 2

  // Four interlocking loops
  const angles = [0, 90, 180, 270]

  angles.forEach((baseAngle, idx) => {
    const strand: PathPoint[] = []
    const segments = 30
    const angleRad = (baseAngle * Math.PI) / 180

    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI - Math.PI / 2
      const loopR = r * 0.5

      const localX = loopR * Math.cos(t)
      const localY = loopR * Math.sin(t) * 0.7

      const cos = Math.cos(angleRad)
      const sin = Math.sin(angleRad)
      const offsetDist = r * 0.4
      const x = cx + (localX * cos - localY * sin) + Math.cos(angleRad) * offsetDist
      const y = cy + (localX * sin + localY * cos) + Math.sin(angleRad) * offsetDist

      strand.push({
        x,
        y,
        type: i === 0 ? 'move' : 'line',
      })
    }

    paths.push({ points: strand, isOver: idx % 2 === 0 })
  })

  return paths
}

// Generate spiral knot
function generateSpiral(size: number, strandWidth: number, turns: number): KnotPath[] {
  const paths: KnotPath[] = []
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - strandWidth

  const segments = turns * 60
  const strand: PathPoint[] = []

  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2 * turns
    const r = maxR * (1 - i / segments * 0.8)

    strand.push({
      x: cx + Math.cos(t) * r,
      y: cy + Math.sin(t) * r,
      type: i === 0 ? 'move' : 'line',
    })
  }

  paths.push({ points: strand, isOver: true })

  // Counter spiral
  const strand2: PathPoint[] = []
  for (let i = 0; i <= segments; i++) {
    const t = -(i / segments) * Math.PI * 2 * turns + Math.PI
    const r = maxR * (1 - i / segments * 0.8)

    strand2.push({
      x: cx + Math.cos(t) * r,
      y: cy + Math.sin(t) * r,
      type: i === 0 ? 'move' : 'line',
    })
  }

  paths.push({ points: strand2, isOver: false })

  return paths
}

// Generate border pattern
function generateBorder(length: number, height: number, strandWidth: number, repeatCount: number): KnotPath[] {
  const paths: KnotPath[] = []
  const unitWidth = length / repeatCount

  for (let rep = 0; rep < repeatCount; rep++) {
    const offsetX = rep * unitWidth
    const segments = 30

    // Upper wave
    const upper: PathPoint[] = []
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2
      const x = offsetX + (i / segments) * unitWidth
      const y = height / 2 + Math.sin(t) * (height / 2 - strandWidth)

      upper.push({
        x,
        y,
        type: i === 0 && rep === 0 ? 'move' : 'line',
      })
    }

    // Lower wave (offset phase)
    const lower: PathPoint[] = []
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2 + Math.PI
      const x = offsetX + (i / segments) * unitWidth
      const y = height / 2 + Math.sin(t) * (height / 2 - strandWidth)

      lower.push({
        x,
        y,
        type: i === 0 && rep === 0 ? 'move' : 'line',
      })
    }

    if (rep === 0) {
      paths.push({ points: upper, isOver: true })
      paths.push({ points: lower, isOver: false })
    } else {
      paths[0].points.push(...upper)
      paths[1].points.push(...lower)
    }
  }

  return paths
}

// Generate circular knot
function generateCircular(size: number, strandWidth: number, rings: number, segments: number): KnotPath[] {
  const paths: KnotPath[] = []
  const cx = size / 2
  const cy = size / 2
  const maxR = size / 2 - strandWidth

  // Create interlocking rings
  for (let ring = 0; ring < rings; ring++) {
    const r = maxR * (1 - ring / rings * 0.6)
    const strand: PathPoint[] = []
    const numPoints = segments * 4

    for (let i = 0; i <= numPoints; i++) {
      const baseAngle = (i / numPoints) * Math.PI * 2
      // Add wave to create interlocking effect
      const waveAmp = strandWidth * 1.5
      const waveFreq = segments
      const wave = Math.sin(baseAngle * waveFreq + ring * Math.PI) * waveAmp

      const effectiveR = r + wave

      strand.push({
        x: cx + Math.cos(baseAngle) * effectiveR,
        y: cy + Math.sin(baseAngle) * effectiveR,
        type: i === 0 ? 'move' : 'line',
      })
    }

    paths.push({ points: strand, isOver: ring % 2 === 0 })
  }

  return paths
}

export function CelticKnotGenerator({ onClose }: CelticKnotGeneratorProps) {
  const { project, addObject, activeLayerId } = useDesignStore()

  const [config, setConfig] = useState<CelticKnotConfig>({
    pattern: 'triquetra',
    size: 150,
    strandWidth: 5,
    gap: 2,
    cornerRadius: 0,
    complexity: 3,
    borderLength: 200,
    borderHeight: 30,
    repeatCount: 4,
    rings: 3,
    segments: 6,
  })

  const [showPreview, setShowPreview] = useState(true)

  const updateConfig = useCallback(<K extends keyof CelticKnotConfig>(key: K, value: CelticKnotConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  // Generate knot paths based on pattern
  const knotPaths = useMemo((): KnotPath[] => {
    switch (config.pattern) {
      case 'basic':
        return generateBasicKnot(config.size, config.strandWidth, config.gap)
      case 'triquetra':
        return generateTriquetra(config.size, config.strandWidth)
      case 'quaternary':
        return generateQuaternary(config.size, config.strandWidth)
      case 'spiral':
        return generateSpiral(config.size, config.strandWidth, config.complexity)
      case 'border':
        return generateBorder(config.borderLength, config.borderHeight, config.strandWidth, config.repeatCount)
      case 'circular':
        return generateCircular(config.size, config.strandWidth, config.rings, config.segments)
      default:
        return []
    }
  }, [config])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    knotPaths.forEach((knotPath, idx) => {
      const translatedPath = knotPath.points.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: `Celtic Knot Strand ${idx + 1}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: knotPath.isOver ? '#3b82f6' : '#22c55e',
          strokeWidth: config.strandWidth,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedPath,
        closed: config.pattern !== 'border',
      } as VectorPath)
    })

    onClose()
  }, [project, activeLayerId, knotPaths, config.strandWidth, config.pattern, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      pattern: 'triquetra',
      size: 150,
      strandWidth: 5,
      gap: 2,
      cornerRadius: 0,
      complexity: 3,
      borderLength: 200,
      borderHeight: 30,
      repeatCount: 4,
      rings: 3,
      segments: 6,
    })
  }, [])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map(p => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      return `L ${p.x} ${p.y}`
    }).join(' ')
  }, [])

  const previewSize = useMemo(() => {
    if (config.pattern === 'border') {
      return { width: config.borderLength, height: config.borderHeight }
    }
    return { width: config.size, height: config.size }
  }, [config.pattern, config.size, config.borderLength, config.borderHeight])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[950px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Infinity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Celtic Knot Generator</h2>
              <p className="text-sm text-muted-foreground">Create interlaced Celtic patterns and borders</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Pattern Type</h3>
              <Select
                value={config.pattern}
                onValueChange={(v: string) => updateConfig('pattern', v as CelticKnotConfig['pattern'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic Figure-8</SelectItem>
                  <SelectItem value="triquetra">Triquetra (Trinity)</SelectItem>
                  <SelectItem value="quaternary">Quaternary (4-fold)</SelectItem>
                  <SelectItem value="spiral">Double Spiral</SelectItem>
                  <SelectItem value="border">Border Pattern</SelectItem>
                  <SelectItem value="circular">Circular Rings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.pattern !== 'border' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Size</h3>
                <div className="space-y-2">
                  <Label>Overall Size (mm)</Label>
                  <Input
                    type="number"
                    value={config.size}
                    onChange={(e) => updateConfig('size', Number(e.target.value))}
                    min={50}
                    max={300}
                  />
                </div>
              </div>
            )}

            {config.pattern === 'border' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Border Dimensions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Length (mm)</Label>
                    <Input
                      type="number"
                      value={config.borderLength}
                      onChange={(e) => updateConfig('borderLength', Number(e.target.value))}
                      min={50}
                      max={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height (mm)</Label>
                    <Input
                      type="number"
                      value={config.borderHeight}
                      onChange={(e) => updateConfig('borderHeight', Number(e.target.value))}
                      min={15}
                      max={100}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Repeat Count</Label>
                    <span className="text-xs text-muted-foreground">{config.repeatCount}</span>
                  </div>
                  <Slider
                    value={[config.repeatCount]}
                    onValueChange={([v]) => updateConfig('repeatCount', v)}
                    min={1}
                    max={10}
                    step={1}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Strand Style</h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Strand Width</Label>
                  <span className="text-xs text-muted-foreground">{config.strandWidth}mm</span>
                </div>
                <Slider
                  value={[config.strandWidth]}
                  onValueChange={([v]) => updateConfig('strandWidth', v)}
                  min={1}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Gap</Label>
                  <span className="text-xs text-muted-foreground">{config.gap}mm</span>
                </div>
                <Slider
                  value={[config.gap]}
                  onValueChange={([v]) => updateConfig('gap', v)}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </div>
            </div>

            {config.pattern === 'spiral' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Spiral Settings</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Turns</Label>
                    <span className="text-xs text-muted-foreground">{config.complexity}</span>
                  </div>
                  <Slider
                    value={[config.complexity]}
                    onValueChange={([v]) => updateConfig('complexity', v)}
                    min={1}
                    max={8}
                    step={1}
                  />
                </div>
              </div>
            )}

            {config.pattern === 'circular' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Circular Settings</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Rings</Label>
                    <span className="text-xs text-muted-foreground">{config.rings}</span>
                  </div>
                  <Slider
                    value={[config.rings]}
                    onValueChange={([v]) => updateConfig('rings', v)}
                    min={2}
                    max={6}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Segments</Label>
                    <span className="text-xs text-muted-foreground">{config.segments}</span>
                  </div>
                  <Slider
                    value={[config.segments]}
                    onValueChange={([v]) => updateConfig('segments', v)}
                    min={3}
                    max={12}
                    step={1}
                  />
                </div>
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="text-sm font-medium">Pattern Info</div>
              <div className="text-xs text-muted-foreground">
                {knotPaths.length} strands
              </div>
              <div className="text-xs text-muted-foreground">
                {knotPaths.reduce((sum, p) => sum + p.points.length, 0)} vertices
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <Button
                variant={showPreview ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                Preview
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="flex-1 bg-muted/30 overflow-auto p-4 flex items-center justify-center">
              {showPreview && (
                <svg
                  width={Math.min(400, previewSize.width * 2)}
                  height={Math.min(400, previewSize.height * 2)}
                  viewBox={`-10 -10 ${previewSize.width + 20} ${previewSize.height + 20}`}
                  className="bg-background rounded-lg border border-border"
                >
                  <defs>
                    <pattern id="celticGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" opacity="0.1" />
                    </pattern>
                  </defs>

                  <rect x="-100" y="-100" width="1000" height="1000" fill="url(#celticGrid)" />

                  {/* Render strands with over/under effect */}
                  {knotPaths.map((knotPath, idx) => (
                    <path
                      key={idx}
                      d={pathToSvg(knotPath.points)}
                      fill="none"
                      stroke={knotPath.isOver ? 'hsl(var(--primary))' : 'hsl(var(--success))'}
                      strokeWidth={config.strandWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={knotPath.isOver ? 1 : 0.7}
                    />
                  ))}
                </svg>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {config.pattern.charAt(0).toUpperCase() + config.pattern.slice(1)} pattern
                </span>
                <span className="text-muted-foreground">
                  {previewSize.width} × {previewSize.height}mm
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <Download className="w-4 h-4 mr-1" />
              Export SVG
            </Button>
            <Button onClick={handleAddToCanvas} disabled={!project}>
              <Plus className="w-4 h-4 mr-1" />
              Add to Canvas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CelticKnotGenerator
