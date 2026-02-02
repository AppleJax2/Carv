import { useState, useMemo, useCallback, useRef } from 'react'
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
import { X, Hexagon, RotateCcw, Download, Plus, Eye, EyeOff, RefreshCw, Upload } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface VoronoiGeneratorProps {
  onClose: () => void
}

interface VoronoiConfig {
  width: number
  height: number
  numPoints: number
  seed: number
  distribution: 'random' | 'poisson' | 'grid-jitter' | 'radial'
  cellInset: number
  cornerRadius: number
  borderWidth: number
  includeBorder: boolean
  relaxIterations: number
  // Image-based density
  useImageDensity: boolean
  invertDensity: boolean
}

interface Point {
  x: number
  y: number
}

interface VoronoiCell {
  site: Point
  vertices: Point[]
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = Math.sin(s * 9999) * 10000
    return s - Math.floor(s)
  }
}

// Fortune's algorithm for Voronoi diagram (simplified implementation)
function computeVoronoi(points: Point[], width: number, height: number): VoronoiCell[] {
  const cells: VoronoiCell[] = []

  // For each point, compute its Voronoi cell using brute force
  // (A proper implementation would use Fortune's algorithm)
  points.forEach((site, siteIdx) => {
    const vertices: Point[] = []

    // Sample angles around the site to find cell boundary
    const numSamples = 72
    for (let i = 0; i < numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2

      // Ray march to find boundary
      let dist = 0
      const step = 1
      const maxDist = Math.max(width, height)

      while (dist < maxDist) {
        dist += step
        const testX = site.x + Math.cos(angle) * dist
        const testY = site.y + Math.sin(angle) * dist

        // Check if this point is closer to another site
        let closestSite = siteIdx
        let closestDist = Math.hypot(testX - site.x, testY - site.y)

        for (let j = 0; j < points.length; j++) {
          if (j === siteIdx) continue
          const d = Math.hypot(testX - points[j].x, testY - points[j].y)
          if (d < closestDist) {
            closestDist = d
            closestSite = j
          }
        }

        if (closestSite !== siteIdx || testX < 0 || testX > width || testY < 0 || testY > height) {
          // Found boundary
          vertices.push({
            x: site.x + Math.cos(angle) * (dist - step / 2),
            y: site.y + Math.sin(angle) * (dist - step / 2),
          })
          break
        }
      }
    }

    cells.push({ site, vertices })
  })

  return cells
}

// Lloyd's relaxation for more even distribution
function lloydRelax(points: Point[], width: number, height: number, iterations: number): Point[] {
  let currentPoints = [...points]

  for (let iter = 0; iter < iterations; iter++) {
    const cells = computeVoronoi(currentPoints, width, height)

    currentPoints = cells.map(cell => {
      if (cell.vertices.length === 0) return cell.site

      // Compute centroid
      let cx = 0, cy = 0
      cell.vertices.forEach(v => {
        cx += v.x
        cy += v.y
      })
      cx /= cell.vertices.length
      cy /= cell.vertices.length

      // Clamp to bounds
      cx = Math.max(5, Math.min(width - 5, cx))
      cy = Math.max(5, Math.min(height - 5, cy))

      return { x: cx, y: cy }
    })
  }

  return currentPoints
}

// Generate points with different distributions
function generatePoints(config: VoronoiConfig): Point[] {
  const { width, height, numPoints, seed, distribution } = config
  const random = seededRandom(seed)
  const points: Point[] = []

  switch (distribution) {
    case 'random':
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: random() * width,
          y: random() * height,
        })
      }
      break

    case 'poisson': {
      // Poisson disk sampling (simplified)
      const radius = Math.sqrt((width * height) / (numPoints * Math.PI)) * 0.8
      const cellSize = radius / Math.sqrt(2)
      const gridW = Math.ceil(width / cellSize)
      const gridH = Math.ceil(height / cellSize)
      const grid: (Point | null)[][] = Array(gridW).fill(null).map(() => Array(gridH).fill(null))
      const active: Point[] = []

      // Start with a random point
      const first = { x: random() * width, y: random() * height }
      points.push(first)
      active.push(first)
      const gi = Math.floor(first.x / cellSize)
      const gj = Math.floor(first.y / cellSize)
      if (gi >= 0 && gi < gridW && gj >= 0 && gj < gridH) {
        grid[gi][gj] = first
      }

      while (active.length > 0 && points.length < numPoints) {
        const idx = Math.floor(random() * active.length)
        const point = active[idx]
        let found = false

        for (let k = 0; k < 30; k++) {
          const angle = random() * Math.PI * 2
          const r = radius + random() * radius
          const newX = point.x + Math.cos(angle) * r
          const newY = point.y + Math.sin(angle) * r

          if (newX < 0 || newX >= width || newY < 0 || newY >= height) continue

          const ni = Math.floor(newX / cellSize)
          const nj = Math.floor(newY / cellSize)

          let valid = true
          for (let di = -2; di <= 2 && valid; di++) {
            for (let dj = -2; dj <= 2 && valid; dj++) {
              const ci = ni + di
              const cj = nj + dj
              if (ci >= 0 && ci < gridW && cj >= 0 && cj < gridH && grid[ci][cj]) {
                const neighbor = grid[ci][cj]!
                if (Math.hypot(newX - neighbor.x, newY - neighbor.y) < radius) {
                  valid = false
                }
              }
            }
          }

          if (valid) {
            const newPoint = { x: newX, y: newY }
            points.push(newPoint)
            active.push(newPoint)
            if (ni >= 0 && ni < gridW && nj >= 0 && nj < gridH) {
              grid[ni][nj] = newPoint
            }
            found = true
            break
          }
        }

        if (!found) {
          active.splice(idx, 1)
        }
      }
      break
    }

    case 'grid-jitter': {
      const cols = Math.ceil(Math.sqrt(numPoints * width / height))
      const rows = Math.ceil(numPoints / cols)
      const cellW = width / cols
      const cellH = height / rows
      const jitter = Math.min(cellW, cellH) * 0.35

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (points.length >= numPoints) break
          points.push({
            x: (i + 0.5) * cellW + (random() - 0.5) * jitter * 2,
            y: (j + 0.5) * cellH + (random() - 0.5) * jitter * 2,
          })
        }
      }
      break
    }

    case 'radial': {
      const cx = width / 2
      const cy = height / 2
      const maxRadius = Math.min(width, height) / 2 * 0.9

      // Distribute points in rings
      let remaining = numPoints
      let ring = 0
      const ringSpacing = maxRadius / Math.sqrt(numPoints / Math.PI)

      while (remaining > 0) {
        const r = ring === 0 ? 0 : ring * ringSpacing
        const circumference = 2 * Math.PI * r
        const pointsInRing = ring === 0 ? 1 : Math.min(remaining, Math.floor(circumference / ringSpacing))

        for (let i = 0; i < pointsInRing; i++) {
          const angle = (i / pointsInRing) * Math.PI * 2 + (random() - 0.5) * 0.3
          const jitteredR = r + (random() - 0.5) * ringSpacing * 0.3
          points.push({
            x: cx + Math.cos(angle) * jitteredR,
            y: cy + Math.sin(angle) * jitteredR,
          })
          remaining--
        }
        ring++
      }
      break
    }
  }

  return points
}

// Inset a polygon
function insetPolygon(vertices: Point[], amount: number): Point[] {
  if (vertices.length < 3 || amount <= 0) return vertices

  const result: Point[] = []
  const n = vertices.length

  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n]
    const curr = vertices[i]
    const next = vertices[(i + 1) % n]

    // Edge vectors
    const e1x = curr.x - prev.x
    const e1y = curr.y - prev.y
    const e2x = next.x - curr.x
    const e2y = next.y - curr.y

    // Normalize
    const len1 = Math.hypot(e1x, e1y)
    const len2 = Math.hypot(e2x, e2y)
    if (len1 === 0 || len2 === 0) {
      result.push(curr)
      continue
    }

    const n1x = -e1y / len1
    const n1y = e1x / len1
    const n2x = -e2y / len2
    const n2y = e2x / len2

    // Average normal
    let nx = n1x + n2x
    let ny = n1y + n2y
    const nlen = Math.hypot(nx, ny)
    if (nlen > 0) {
      nx /= nlen
      ny /= nlen
    }

    // Inset point
    result.push({
      x: curr.x + nx * amount,
      y: curr.y + ny * amount,
    })
  }

  return result
}

export function VoronoiGenerator({ onClose }: VoronoiGeneratorProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState<VoronoiConfig>({
    width: 200,
    height: 200,
    numPoints: 30,
    seed: 42,
    distribution: 'poisson',
    cellInset: 2,
    cornerRadius: 0,
    borderWidth: 5,
    includeBorder: true,
    relaxIterations: 2,
    useImageDensity: false,
    invertDensity: false,
  })

  const [showPreview, setShowPreview] = useState(true)

  const updateConfig = useCallback(<K extends keyof VoronoiConfig>(key: K, value: VoronoiConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const randomizeSeed = useCallback(() => {
    updateConfig('seed', Math.floor(Math.random() * 100000))
  }, [updateConfig])

  // Generate Voronoi cells
  const voronoiCells = useMemo(() => {
    let points = generatePoints(config)

    // Apply Lloyd relaxation
    if (config.relaxIterations > 0) {
      points = lloydRelax(points, config.width, config.height, config.relaxIterations)
    }

    return computeVoronoi(points, config.width, config.height)
  }, [config])

  // Convert cells to paths
  const cellPaths = useMemo((): PathPoint[][] => {
    return voronoiCells.map(cell => {
      let vertices = cell.vertices
      if (vertices.length < 3) return []

      // Apply inset
      if (config.cellInset > 0) {
        vertices = insetPolygon(vertices, config.cellInset)
      }

      // Convert to path points
      return vertices.map((v, i) => ({
        x: v.x,
        y: v.y,
        type: i === 0 ? 'move' : 'line',
      } as PathPoint))
    }).filter(path => path.length >= 3)
  }, [voronoiCells, config.cellInset])

  // Border path
  const borderPath = useMemo((): PathPoint[] | null => {
    if (!config.includeBorder) return null

    const { width, height, borderWidth } = config
    const outer: PathPoint[] = [
      { x: 0, y: 0, type: 'move' },
      { x: width, y: 0, type: 'line' },
      { x: width, y: height, type: 'line' },
      { x: 0, y: height, type: 'line' },
      { x: 0, y: 0, type: 'line' },
    ]

    return outer
  }, [config.includeBorder, config.width, config.height, config.borderWidth])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    // Add border
    if (borderPath) {
      const translatedBorder = borderPath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: 'Voronoi Border',
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#6b7280',
          strokeWidth: 1,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedBorder,
        closed: true,
      } as VectorPath)
    }

    // Add cells
    cellPaths.forEach((cellPath, idx) => {
      if (cellPath.length < 3) return

      const translatedCell = cellPath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      // Close the path
      translatedCell.push({ ...translatedCell[0], type: 'line' })

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: `Voronoi Cell ${idx + 1}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#3b82f6',
          strokeWidth: 1,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedCell,
        closed: true,
      } as VectorPath)
    })

    onClose()
  }, [project, activeLayerId, borderPath, cellPaths, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      width: 200,
      height: 200,
      numPoints: 30,
      seed: 42,
      distribution: 'poisson',
      cellInset: 2,
      cornerRadius: 0,
      borderWidth: 5,
      includeBorder: true,
      relaxIterations: 2,
      useImageDensity: false,
      invertDensity: false,
    })
  }, [])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map(p => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      return `L ${p.x} ${p.y}`
    }).join(' ') + ' Z'
  }, [])

  const previewScale = useMemo(() => {
    return Math.min(1, 350 / Math.max(config.width, config.height))
  }, [config.width, config.height])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[950px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Hexagon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Voronoi Pattern Generator</h2>
              <p className="text-sm text-muted-foreground">Create organic cell patterns for decorative panels</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Canvas Size</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={config.width}
                    onChange={(e) => updateConfig('width', Number(e.target.value))}
                    min={50}
                    max={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={config.height}
                    onChange={(e) => updateConfig('height', Number(e.target.value))}
                    min={50}
                    max={500}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Point Distribution</h3>

              <div className="space-y-2">
                <Label>Distribution Type</Label>
                <Select
                  value={config.distribution}
                  onValueChange={(v: string) => updateConfig('distribution', v as VoronoiConfig['distribution'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">Random</SelectItem>
                    <SelectItem value="poisson">Poisson Disk (Even)</SelectItem>
                    <SelectItem value="grid-jitter">Grid with Jitter</SelectItem>
                    <SelectItem value="radial">Radial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Number of Cells</Label>
                  <span className="text-xs text-muted-foreground">{config.numPoints}</span>
                </div>
                <Slider
                  value={[config.numPoints]}
                  onValueChange={([v]) => updateConfig('numPoints', v)}
                  min={5}
                  max={100}
                  step={1}
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Seed</Label>
                  <Input
                    type="number"
                    value={config.seed}
                    onChange={(e) => updateConfig('seed', Number(e.target.value))}
                  />
                </div>
                <Button variant="outline" size="icon" className="mt-6" onClick={randomizeSeed}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Relaxation Iterations</Label>
                  <span className="text-xs text-muted-foreground">{config.relaxIterations}</span>
                </div>
                <Slider
                  value={[config.relaxIterations]}
                  onValueChange={([v]) => updateConfig('relaxIterations', v)}
                  min={0}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  More iterations = more even cells
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Cell Style</h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Cell Inset</Label>
                  <span className="text-xs text-muted-foreground">{config.cellInset}mm</span>
                </div>
                <Slider
                  value={[config.cellInset]}
                  onValueChange={([v]) => updateConfig('cellInset', v)}
                  min={0}
                  max={10}
                  step={0.5}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Include Border</Label>
                <Switch
                  checked={config.includeBorder}
                  onCheckedChange={(v: boolean) => updateConfig('includeBorder', v)}
                />
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="text-sm font-medium">Statistics</div>
              <div className="text-xs text-muted-foreground">
                {cellPaths.length} cells generated
              </div>
              <div className="text-xs text-muted-foreground">
                ~{(cellPaths.reduce((sum, p) => sum + p.length, 0))} vertices total
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
              />

              {showPreview && (
                <svg
                  width={config.width * previewScale + 40}
                  height={config.height * previewScale + 40}
                  viewBox={`-20 -20 ${config.width + 40} ${config.height + 40}`}
                  className="bg-background rounded-lg border border-border"
                >
                  <defs>
                    <pattern id="voronoiGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" opacity="0.1" />
                    </pattern>
                  </defs>

                  <rect x="-100" y="-100" width="1000" height="1000" fill="url(#voronoiGrid)" />

                  {/* Border */}
                  {borderPath && (
                    <path
                      d={pathToSvg(borderPath)}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="1"
                    />
                  )}

                  {/* Cells */}
                  {cellPaths.map((cellPath, idx) => (
                    <path
                      key={idx}
                      d={pathToSvg(cellPath)}
                      fill="hsl(var(--primary) / 0.1)"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.5"
                    />
                  ))}

                  {/* Sites (debug) */}
                  {voronoiCells.map((cell, idx) => (
                    <circle
                      key={`site-${idx}`}
                      cx={cell.site.x}
                      cy={cell.site.y}
                      r="1.5"
                      fill="hsl(var(--primary))"
                      opacity="0.5"
                    />
                  ))}
                </svg>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {config.width} × {config.height}mm
                </span>
                <span className="text-muted-foreground">
                  {config.distribution} distribution
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

export default VoronoiGenerator
