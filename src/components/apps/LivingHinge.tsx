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
import { X, Waves, RotateCcw, Download, Plus, Eye, EyeOff } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface LivingHingeProps {
  onClose: () => void
}

interface HingeConfig {
  width: number
  height: number
  pattern: 'lattice' | 'wave' | 'diamond' | 'straight' | 'honeycomb'
  density: number
  cutWidth: number
  cutLength: number
  offset: number
  materialThickness: number
  bendDirection: 'horizontal' | 'vertical'
  addBorder: boolean
  borderMargin: number
}

export function LivingHinge({ onClose }: LivingHingeProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  
  const [config, setConfig] = useState<HingeConfig>({
    width: 200,
    height: 100,
    pattern: 'lattice',
    density: 5,
    cutWidth: 0.2,
    cutLength: 15,
    offset: 3,
    materialThickness: 3,
    bendDirection: 'horizontal',
    addBorder: true,
    borderMargin: 5,
  })

  const [showPreview, setShowPreview] = useState(true)

  const updateConfig = useCallback(<K extends keyof HingeConfig>(key: K, value: HingeConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const generateLatticePattern = useCallback((): PathPoint[][] => {
    const { width, height, density, cutLength, offset, bendDirection } = config
    const paths: PathPoint[][] = []
    
    const spacing = density
    const isHorizontal = bendDirection === 'horizontal'
    
    const cols = Math.floor((isHorizontal ? width : height) / spacing)
    const rows = Math.floor((isHorizontal ? height : width) / (cutLength + offset))
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isOffset = row % 2 === 1
        const colOffset = isOffset ? spacing / 2 : 0
        
        let x, y, endX, endY: number
        
        if (isHorizontal) {
          x = col * spacing + colOffset
          y = row * (cutLength + offset) + offset / 2
          endX = x
          endY = y + cutLength
        } else {
          x = row * (cutLength + offset) + offset / 2
          y = col * spacing + colOffset
          endX = x + cutLength
          endY = y
        }
        
        if (x >= 0 && x <= width && endX >= 0 && endX <= width &&
            y >= 0 && y <= height && endY >= 0 && endY <= height) {
          paths.push([
            { x, y, type: 'move' },
            { x: endX, y: endY, type: 'line' },
          ])
        }
      }
    }
    
    return paths
  }, [config])

  const generateWavePattern = useCallback((): PathPoint[][] => {
    const { width, height, density, cutLength, bendDirection } = config
    const paths: PathPoint[][] = []
    
    const spacing = density
    const isHorizontal = bendDirection === 'horizontal'
    const waveAmplitude = spacing * 0.3
    const segments = 8
    
    const lineCount = Math.floor((isHorizontal ? width : height) / spacing)
    const lineLength = isHorizontal ? height : width
    
    for (let i = 0; i < lineCount; i++) {
      const path: PathPoint[] = []
      const basePos = i * spacing + spacing / 2
      
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const pos = t * lineLength
        const wave = Math.sin(t * Math.PI * 4) * waveAmplitude
        
        if (isHorizontal) {
          path.push({
            x: basePos + wave,
            y: pos,
            type: j === 0 ? 'move' : 'line',
          })
        } else {
          path.push({
            x: pos,
            y: basePos + wave,
            type: j === 0 ? 'move' : 'line',
          })
        }
      }
      
      paths.push(path)
    }
    
    return paths
  }, [config])

  const generateDiamondPattern = useCallback((): PathPoint[][] => {
    const { width, height, density, cutLength, offset } = config
    const paths: PathPoint[][] = []
    
    const spacing = density * 2
    const diamondSize = cutLength * 0.7
    
    const cols = Math.floor(width / spacing)
    const rows = Math.floor(height / spacing)
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * spacing + spacing / 2
        const cy = row * spacing + spacing / 2
        
        paths.push([
          { x: cx, y: cy - diamondSize / 2, type: 'move' },
          { x: cx + diamondSize / 2, y: cy, type: 'line' },
          { x: cx, y: cy + diamondSize / 2, type: 'line' },
          { x: cx - diamondSize / 2, y: cy, type: 'line' },
          { x: cx, y: cy - diamondSize / 2, type: 'line' },
        ])
      }
    }
    
    return paths
  }, [config])

  const generateStraightPattern = useCallback((): PathPoint[][] => {
    const { width, height, density, cutLength, offset, bendDirection } = config
    const paths: PathPoint[][] = []
    
    const spacing = density
    const isHorizontal = bendDirection === 'horizontal'
    
    const lineCount = Math.floor((isHorizontal ? width : height) / spacing)
    const segmentCount = Math.floor((isHorizontal ? height : width) / (cutLength + offset))
    
    for (let i = 0; i < lineCount; i++) {
      const pos = i * spacing + spacing / 2
      const isOffset = i % 2 === 1
      
      for (let j = 0; j < segmentCount; j++) {
        const segStart = j * (cutLength + offset) + (isOffset ? (cutLength + offset) / 2 : 0)
        const segEnd = segStart + cutLength
        
        if (isHorizontal) {
          if (segEnd <= height) {
            paths.push([
              { x: pos, y: segStart, type: 'move' },
              { x: pos, y: segEnd, type: 'line' },
            ])
          }
        } else {
          if (segEnd <= width) {
            paths.push([
              { x: segStart, y: pos, type: 'move' },
              { x: segEnd, y: pos, type: 'line' },
            ])
          }
        }
      }
    }
    
    return paths
  }, [config])

  const generateHoneycombPattern = useCallback((): PathPoint[][] => {
    const { width, height, density } = config
    const paths: PathPoint[][] = []
    
    const size = density * 1.5
    const h = size * Math.sqrt(3) / 2
    
    const cols = Math.ceil(width / (size * 1.5)) + 1
    const rows = Math.ceil(height / (h * 2)) + 1
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = col * size * 1.5
        const cy = row * h * 2 + (col % 2 === 1 ? h : 0)
        
        if (cx > width + size || cy > height + size) continue
        
        const hexPath: PathPoint[] = []
        for (let i = 0; i < 6; i++) {
          const angle = (i * 60 - 30) * Math.PI / 180
          const x = cx + size * 0.4 * Math.cos(angle)
          const y = cy + size * 0.4 * Math.sin(angle)
          hexPath.push({
            x,
            y,
            type: i === 0 ? 'move' : 'line',
          })
        }
        hexPath.push({ ...hexPath[0], type: 'line' })
        
        paths.push(hexPath)
      }
    }
    
    return paths
  }, [config])

  const hingePaths = useMemo((): PathPoint[][] => {
    switch (config.pattern) {
      case 'lattice':
        return generateLatticePattern()
      case 'wave':
        return generateWavePattern()
      case 'diamond':
        return generateDiamondPattern()
      case 'straight':
        return generateStraightPattern()
      case 'honeycomb':
        return generateHoneycombPattern()
      default:
        return []
    }
  }, [config.pattern, generateLatticePattern, generateWavePattern, generateDiamondPattern, generateStraightPattern, generateHoneycombPattern])

  const borderPath = useMemo((): PathPoint[] | null => {
    if (!config.addBorder) return null
    
    const { width, height, borderMargin: m } = config
    
    return [
      { x: -m, y: -m, type: 'move' },
      { x: width + m, y: -m, type: 'line' },
      { x: width + m, y: height + m, type: 'line' },
      { x: -m, y: height + m, type: 'line' },
      { x: -m, y: -m, type: 'line' },
    ]
  }, [config.addBorder, config.width, config.height, config.borderMargin])

  const estimatedBendRadius = useMemo(() => {
    const { materialThickness, density, cutLength, offset } = config
    const remainingMaterial = density - config.cutWidth
    const flexFactor = cutLength / (cutLength + offset)
    return materialThickness * (1 / flexFactor) * (remainingMaterial / density) * 10
  }, [config])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    hingePaths.forEach((path, index) => {
      const translatedPath = path.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: `Hinge Cut ${index + 1}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#3b82f6',
          strokeWidth: config.cutWidth,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedPath,
        closed: path.length > 2 && path[0].x === path[path.length - 1].x && path[0].y === path[path.length - 1].y,
      } as VectorPath)
    })

    if (borderPath) {
      const translatedBorder = borderPath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: 'Hinge Border',
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#8b5cf6',
          strokeWidth: 1,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedBorder,
        closed: true,
      } as VectorPath)
    }

    onClose()
  }, [project, activeLayerId, hingePaths, borderPath, config.cutWidth, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      width: 200,
      height: 100,
      pattern: 'lattice',
      density: 5,
      cutWidth: 0.2,
      cutLength: 15,
      offset: 3,
      materialThickness: 3,
      bendDirection: 'horizontal',
      addBorder: true,
      borderMargin: 5,
    })
  }, [])

  const previewScale = useMemo(() => {
    return Math.min(1, 400 / Math.max(config.width, config.height))
  }, [config.width, config.height])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map((p) => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      return `L ${p.x} ${p.y}`
    }).join(' ')
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[900px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Waves className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Living Hinge Generator</h2>
              <p className="text-sm text-muted-foreground">Create flexible hinge patterns</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Size</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={config.width}
                    onChange={(e) => updateConfig('width', Number(e.target.value))}
                    min={20}
                    max={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={config.height}
                    onChange={(e) => updateConfig('height', Number(e.target.value))}
                    min={20}
                    max={500}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Pattern</h3>
              
              <Select
                value={config.pattern}
                onValueChange={(v: string) => updateConfig('pattern', v as HingeConfig['pattern'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lattice">Lattice</SelectItem>
                  <SelectItem value="straight">Straight Lines</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                  <SelectItem value="diamond">Diamond</SelectItem>
                  <SelectItem value="honeycomb">Honeycomb</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <Label>Bend Direction</Label>
                <Select
                  value={config.bendDirection}
                  onValueChange={(v: string) => updateConfig('bendDirection', v as 'horizontal' | 'vertical')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal (bend along width)</SelectItem>
                    <SelectItem value="vertical">Vertical (bend along height)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Parameters</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Density (spacing mm)</Label>
                  <span className="text-xs text-muted-foreground">{config.density}</span>
                </div>
                <Slider
                  value={[config.density]}
                  onValueChange={([v]) => updateConfig('density', v)}
                  min={2}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Cut Length (mm)</Label>
                  <span className="text-xs text-muted-foreground">{config.cutLength}</span>
                </div>
                <Slider
                  value={[config.cutLength]}
                  onValueChange={([v]) => updateConfig('cutLength', v)}
                  min={5}
                  max={50}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Gap Between Cuts (mm)</Label>
                  <span className="text-xs text-muted-foreground">{config.offset}</span>
                </div>
                <Slider
                  value={[config.offset]}
                  onValueChange={([v]) => updateConfig('offset', v)}
                  min={1}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Cut Width (kerf mm)</Label>
                  <span className="text-xs text-muted-foreground">{config.cutWidth}</span>
                </div>
                <Slider
                  value={[config.cutWidth * 10]}
                  onValueChange={([v]) => updateConfig('cutWidth', v / 10)}
                  min={1}
                  max={10}
                  step={0.5}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Options</h3>
              
              <div className="space-y-2">
                <Label>Material Thickness (mm)</Label>
                <Input
                  type="number"
                  value={config.materialThickness}
                  onChange={(e) => updateConfig('materialThickness', Number(e.target.value))}
                  min={1}
                  max={25}
                  step={0.5}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Add Border</Label>
                <Switch
                  checked={config.addBorder}
                  onCheckedChange={(v: boolean) => updateConfig('addBorder', v)}
                />
              </div>

              {config.addBorder && (
                <div className="space-y-2">
                  <Label>Border Margin (mm)</Label>
                  <Input
                    type="number"
                    value={config.borderMargin}
                    onChange={(e) => updateConfig('borderMargin', Number(e.target.value))}
                    min={0}
                    max={20}
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cuts:</span>
                <span className="font-medium">{hingePaths.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Bend Radius:</span>
                <span className="font-medium">~{estimatedBendRadius.toFixed(0)}mm</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Smaller density and longer cuts = more flexible
              </p>
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
                  width={(config.width + config.borderMargin * 2 + 40) * previewScale}
                  height={(config.height + config.borderMargin * 2 + 40) * previewScale}
                  viewBox={`${-config.borderMargin - 20} ${-config.borderMargin - 20} ${config.width + config.borderMargin * 2 + 40} ${config.height + config.borderMargin * 2 + 40}`}
                  className="bg-background rounded-lg border border-border"
                >
                  <defs>
                    <pattern id="hingeGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                    </pattern>
                  </defs>
                  <rect 
                    x={-config.borderMargin - 20} 
                    y={-config.borderMargin - 20} 
                    width={config.width + config.borderMargin * 2 + 40} 
                    height={config.height + config.borderMargin * 2 + 40} 
                    fill="url(#hingeGrid)" 
                  />
                  
                  <rect
                    x="0"
                    y="0"
                    width={config.width}
                    height={config.height}
                    fill="#f5f5f4"
                    stroke="#d4d4d4"
                    strokeWidth="1"
                  />
                  
                  {hingePaths.map((path, i) => (
                    <path
                      key={i}
                      d={pathToSvg(path)}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={Math.max(0.5, config.cutWidth)}
                    />
                  ))}
                  
                  {borderPath && (
                    <path
                      d={pathToSvg(borderPath) + ' Z'}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="1"
                    />
                  )}
                </svg>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Size: {config.width} × {config.height} mm
                </span>
                <span className="text-muted-foreground">
                  Pattern: {config.pattern}
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

export default LivingHinge
