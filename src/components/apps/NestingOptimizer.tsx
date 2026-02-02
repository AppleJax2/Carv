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
import { X, LayoutGrid, RotateCcw, Download, Plus, Play, Pause, AlertCircle, Zap, StopCircle } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface NestingOptimizerProps {
  onClose: () => void
}

interface NestingConfig {
  sheetWidth: number
  sheetHeight: number
  partSpacing: number
  sheetMargin: number
  allowRotation: 'none' | '90' | '180' | 'any'
  respectGrain: boolean
  populationSize: number
  mutationRate: number
  generations: number
  partQuantities: Record<string, number>
}

interface PartBounds {
  id: string
  name: string
  width: number
  height: number
  area: number
  points: PathPoint[]
  convexHull: { x: number; y: number }[]
}

interface Placement {
  partId: string
  x: number
  y: number
  rotation: number
  sheetIndex: number
  instanceIndex: number
}

interface NestingResult {
  placements: Placement[]
  sheetCount: number
  efficiency: number
  totalArea: number
  usedArea: number
  generation: number
}

// Compute convex hull using Graham scan
function computeConvexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points

  const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x)
  
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

  const lower: { x: number; y: number }[] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop()
    }
    lower.push(p)
  }

  const upper: { x: number; y: number }[] = []
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop()
    }
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

// Rotate a polygon by angle (degrees)
function rotatePolygon(points: { x: number; y: number }[], angle: number): { x: number; y: number }[] {
  if (angle === 0) return points
  const rad = (angle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  
  // Find center
  let cx = 0, cy = 0
  points.forEach(p => { cx += p.x; cy += p.y })
  cx /= points.length
  cy /= points.length
  
  return points.map(p => ({
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos,
  }))
}

// Get bounding box of rotated part
function getRotatedBounds(part: PartBounds, rotation: number): { width: number; height: number } {
  const rotated = rotatePolygon(part.convexHull, rotation)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  rotated.forEach(p => {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  })
  return { width: maxX - minX, height: maxY - minY }
}

// Bottom-left fill algorithm with improved placement
function bottomLeftFill(
  parts: { part: PartBounds; rotation: number; instanceIndex: number }[],
  sheetWidth: number,
  sheetHeight: number,
  spacing: number,
  margin: number
): { placements: Placement[]; sheetCount: number } {
  const placements: Placement[] = []
  const sheets: { skyline: { x: number; y: number; width: number }[] }[] = []
  
  const usableWidth = sheetWidth - 2 * margin
  const usableHeight = sheetHeight - 2 * margin

  for (const { part, rotation, instanceIndex } of parts) {
    const bounds = getRotatedBounds(part, rotation)
    const w = bounds.width + spacing
    const h = bounds.height + spacing
    
    let placed = false
    
    for (let sheetIndex = 0; sheetIndex < sheets.length && !placed; sheetIndex++) {
      const sheet = sheets[sheetIndex]
      
      // Find best position using skyline algorithm
      let bestX = -1
      let bestY = Infinity
      let bestSegmentIndex = -1
      
      for (let i = 0; i < sheet.skyline.length; i++) {
        const seg = sheet.skyline[i]
        
        // Check if part fits horizontally starting at this segment
        let maxY = seg.y
        let totalWidth = 0
        let fits = true
        
        for (let j = i; j < sheet.skyline.length && totalWidth < w; j++) {
          const s = sheet.skyline[j]
          maxY = Math.max(maxY, s.y)
          totalWidth += s.width
          
          if (maxY + h > usableHeight) {
            fits = false
            break
          }
        }
        
        if (fits && seg.x + w <= usableWidth && maxY < bestY) {
          bestX = seg.x
          bestY = maxY
          bestSegmentIndex = i
        }
      }
      
      if (bestX >= 0 && bestSegmentIndex >= 0) {
        placements.push({
          partId: part.id,
          x: bestX + margin,
          y: bestY + margin,
          rotation,
          sheetIndex,
          instanceIndex,
        })
        
        // Update skyline
        const newSkyline: { x: number; y: number; width: number }[] = []
        let x = 0
        
        for (const seg of sheet.skyline) {
          if (x + seg.width <= bestX || x >= bestX + w) {
            // Segment is outside the placed part
            newSkyline.push({ ...seg, x })
            x += seg.width
          } else if (x < bestX && x + seg.width > bestX) {
            // Segment starts before and extends into placed part
            newSkyline.push({ x, y: seg.y, width: bestX - x })
            if (x + seg.width > bestX + w) {
              // Segment also extends past placed part
              newSkyline.push({ x: bestX, y: bestY + h, width: w })
              newSkyline.push({ x: bestX + w, y: seg.y, width: x + seg.width - bestX - w })
            } else {
              newSkyline.push({ x: bestX, y: bestY + h, width: x + seg.width - bestX })
            }
            x += seg.width
          } else if (x >= bestX && x + seg.width <= bestX + w) {
            // Segment is completely inside placed part
            if (newSkyline.length === 0 || newSkyline[newSkyline.length - 1].y !== bestY + h) {
              newSkyline.push({ x, y: bestY + h, width: seg.width })
            } else {
              newSkyline[newSkyline.length - 1].width += seg.width
            }
            x += seg.width
          } else if (x < bestX + w && x + seg.width > bestX + w) {
            // Segment starts inside and extends past placed part
            newSkyline.push({ x, y: bestY + h, width: bestX + w - x })
            newSkyline.push({ x: bestX + w, y: seg.y, width: x + seg.width - bestX - w })
            x += seg.width
          }
        }
        
        // Merge adjacent segments with same height
        sheet.skyline = []
        for (const seg of newSkyline) {
          if (sheet.skyline.length > 0 && sheet.skyline[sheet.skyline.length - 1].y === seg.y) {
            sheet.skyline[sheet.skyline.length - 1].width += seg.width
          } else {
            sheet.skyline.push(seg)
          }
        }
        
        placed = true
      }
    }
    
    if (!placed) {
      // Create new sheet
      const newSheet = {
        skyline: [{ x: 0, y: h, width: w }, { x: w, y: 0, width: usableWidth - w }]
      }
      sheets.push(newSheet)
      
      placements.push({
        partId: part.id,
        x: margin,
        y: margin,
        rotation,
        sheetIndex: sheets.length - 1,
        instanceIndex,
      })
    }
  }
  
  return { placements, sheetCount: Math.max(1, sheets.length) }
}

// Genetic algorithm for optimization
class GeneticNester {
  private parts: { part: PartBounds; instanceIndex: number }[]
  private config: NestingConfig
  private rotations: number[]
  private population: { order: number[]; rotations: number[]; fitness: number }[]
  private bestResult: NestingResult | null = null
  private generation = 0
  private stopped = false

  constructor(parts: { part: PartBounds; instanceIndex: number }[], config: NestingConfig) {
    this.parts = parts
    this.config = config
    this.rotations = config.allowRotation === 'none' ? [0] :
                     config.allowRotation === '90' ? [0, 90] :
                     config.allowRotation === '180' ? [0, 180] :
                     [0, 90, 180, 270]
    
    if (config.respectGrain) {
      this.rotations = [0]
    }
    
    this.population = this.initializePopulation()
  }

  private initializePopulation(): { order: number[]; rotations: number[]; fitness: number }[] {
    const pop: { order: number[]; rotations: number[]; fitness: number }[] = []
    
    for (let i = 0; i < this.config.populationSize; i++) {
      // Create random order
      const order = Array.from({ length: this.parts.length }, (_, i) => i)
      
      // First individual: sort by area (largest first) - this is usually a good heuristic
      if (i === 0) {
        order.sort((a, b) => this.parts[b].part.area - this.parts[a].part.area)
      } else {
        // Shuffle for diversity
        for (let j = order.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1))
          ;[order[j], order[k]] = [order[k], order[j]]
        }
      }
      
      // Random rotations
      const rotations = this.parts.map(() => 
        this.rotations[Math.floor(Math.random() * this.rotations.length)]
      )
      
      pop.push({ order, rotations, fitness: 0 })
    }
    
    return pop
  }

  private evaluateFitness(individual: { order: number[]; rotations: number[] }): number {
    const orderedParts = individual.order.map((idx, i) => ({
      part: this.parts[idx].part,
      rotation: individual.rotations[idx],
      instanceIndex: this.parts[idx].instanceIndex,
    }))
    
    const result = bottomLeftFill(
      orderedParts,
      this.config.sheetWidth,
      this.config.sheetHeight,
      this.config.partSpacing,
      this.config.sheetMargin
    )
    
    // Fitness = minimize sheets, maximize packing density
    const totalPartArea = this.parts.reduce((sum, p) => sum + p.part.area, 0)
    const totalSheetArea = result.sheetCount * this.config.sheetWidth * this.config.sheetHeight
    const efficiency = totalPartArea / totalSheetArea
    
    // Penalize more sheets heavily
    return efficiency / (result.sheetCount * result.sheetCount)
  }

  private crossover(
    parent1: { order: number[]; rotations: number[] },
    parent2: { order: number[]; rotations: number[] }
  ): { order: number[]; rotations: number[] } {
    const n = parent1.order.length
    
    // Order crossover (OX)
    const start = Math.floor(Math.random() * n)
    const end = start + Math.floor(Math.random() * (n - start))
    
    const childOrder = new Array(n).fill(-1)
    const used = new Set<number>()
    
    // Copy segment from parent1
    for (let i = start; i <= end; i++) {
      childOrder[i] = parent1.order[i]
      used.add(parent1.order[i])
    }
    
    // Fill rest from parent2
    let j = 0
    for (let i = 0; i < n; i++) {
      if (childOrder[i] === -1) {
        while (used.has(parent2.order[j])) j++
        childOrder[i] = parent2.order[j]
        used.add(parent2.order[j])
        j++
      }
    }
    
    // Uniform crossover for rotations
    const childRotations = parent1.rotations.map((r, i) =>
      Math.random() < 0.5 ? r : parent2.rotations[i]
    )
    
    return { order: childOrder, rotations: childRotations }
  }

  private mutate(individual: { order: number[]; rotations: number[] }): void {
    const n = individual.order.length
    
    // Swap mutation for order
    if (Math.random() < this.config.mutationRate) {
      const i = Math.floor(Math.random() * n)
      const j = Math.floor(Math.random() * n)
      ;[individual.order[i], individual.order[j]] = [individual.order[j], individual.order[i]]
    }
    
    // Rotation mutation
    for (let i = 0; i < n; i++) {
      if (Math.random() < this.config.mutationRate) {
        individual.rotations[i] = this.rotations[Math.floor(Math.random() * this.rotations.length)]
      }
    }
  }

  public runGeneration(): NestingResult {
    // Evaluate fitness
    for (const ind of this.population) {
      ind.fitness = this.evaluateFitness(ind)
    }
    
    // Sort by fitness (descending)
    this.population.sort((a, b) => b.fitness - a.fitness)
    
    // Get best result
    const best = this.population[0]
    const orderedParts = best.order.map((idx, i) => ({
      part: this.parts[idx].part,
      rotation: best.rotations[idx],
      instanceIndex: this.parts[idx].instanceIndex,
    }))
    
    const nestResult = bottomLeftFill(
      orderedParts,
      this.config.sheetWidth,
      this.config.sheetHeight,
      this.config.partSpacing,
      this.config.sheetMargin
    )
    
    const totalPartArea = this.parts.reduce((sum, p) => sum + p.part.area, 0)
    const totalSheetArea = nestResult.sheetCount * this.config.sheetWidth * this.config.sheetHeight
    
    this.bestResult = {
      placements: nestResult.placements,
      sheetCount: nestResult.sheetCount,
      efficiency: (totalPartArea / totalSheetArea) * 100,
      totalArea: totalSheetArea,
      usedArea: totalPartArea,
      generation: this.generation,
    }
    
    // Selection and reproduction
    const newPopulation: { order: number[]; rotations: number[]; fitness: number }[] = []
    
    // Elitism: keep top 10%
    const eliteCount = Math.max(1, Math.floor(this.config.populationSize * 0.1))
    for (let i = 0; i < eliteCount; i++) {
      newPopulation.push({ ...this.population[i] })
    }
    
    // Tournament selection and crossover
    while (newPopulation.length < this.config.populationSize) {
      // Tournament selection
      const tournamentSize = 3
      const selectParent = () => {
        let best = this.population[Math.floor(Math.random() * this.population.length)]
        for (let i = 1; i < tournamentSize; i++) {
          const candidate = this.population[Math.floor(Math.random() * this.population.length)]
          if (candidate.fitness > best.fitness) best = candidate
        }
        return best
      }
      
      const parent1 = selectParent()
      const parent2 = selectParent()
      
      const child = this.crossover(parent1, parent2)
      this.mutate(child)
      
      newPopulation.push({ ...child, fitness: 0 })
    }
    
    this.population = newPopulation
    this.generation++
    
    return this.bestResult
  }

  public stop(): void {
    this.stopped = true
  }

  public isStopped(): boolean {
    return this.stopped
  }

  public getGeneration(): number {
    return this.generation
  }

  public getBestResult(): NestingResult | null {
    return this.bestResult
  }
}

export function NestingOptimizer({ onClose }: NestingOptimizerProps) {
  const { project, addObject, activeLayerId, selectedObjectIds } = useDesignStore()
  const nesterRef = useRef<GeneticNester | null>(null)
  const animationRef = useRef<number | null>(null)
  
  const [config, setConfig] = useState<NestingConfig>({
    sheetWidth: 1220,
    sheetHeight: 2440,
    partSpacing: 5,
    sheetMargin: 10,
    allowRotation: '90',
    respectGrain: false,
    populationSize: 20,
    mutationRate: 0.1,
    generations: 50,
    partQuantities: {},
  })

  const [isOptimizing, setIsOptimizing] = useState(false)
  const [nestingResult, setNestingResult] = useState<NestingResult | null>(null)
  const [selectedSheet, setSelectedSheet] = useState(0)
  const [currentGeneration, setCurrentGeneration] = useState(0)

  const updateConfig = useCallback(<K extends keyof NestingConfig>(key: K, value: NestingConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const selectedObjects = useMemo(() => {
    if (!project) return []
    return project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  }, [project, selectedObjectIds])

  const partBounds = useMemo((): PartBounds[] => {
    return selectedObjects.map(obj => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      let points: PathPoint[] = []

      if (obj.type === 'path') {
        const pathObj = obj as VectorPath
        points = pathObj.points
        pathObj.points.forEach(p => {
          minX = Math.min(minX, p.x)
          minY = Math.min(minY, p.y)
          maxX = Math.max(maxX, p.x)
          maxY = Math.max(maxY, p.y)
        })
      } else if (obj.type === 'shape') {
        const { x, y } = obj.transform
        const params = obj.params as { width?: number; height?: number; radiusX?: number; radiusY?: number }
        const w = params.width || (params.radiusX || 50) * 2
        const h = params.height || (params.radiusY || 50) * 2
        minX = x
        minY = y
        maxX = x + w
        maxY = y + h
        points = [
          { x: 0, y: 0, type: 'move' },
          { x: w, y: 0, type: 'line' },
          { x: w, y: h, type: 'line' },
          { x: 0, y: h, type: 'line' },
          { x: 0, y: 0, type: 'line' },
        ]
      }

      const width = maxX - minX
      const height = maxY - minY
      const normalizedPoints = points.map(p => ({ x: p.x - minX, y: p.y - minY }))
      const convexHull = computeConvexHull(normalizedPoints)

      return {
        id: obj.id,
        name: obj.name,
        width,
        height,
        area: width * height,
        points: points.map(p => ({ ...p, x: p.x - minX, y: p.y - minY })),
        convexHull,
      }
    })
  }, [selectedObjects])

  const hasValidSelection = partBounds.length > 0

  const getPartQuantity = useCallback((partId: string) => {
    return config.partQuantities[partId] || 1
  }, [config.partQuantities])

  const setPartQuantity = useCallback((partId: string, qty: number) => {
    setConfig(prev => ({
      ...prev,
      partQuantities: { ...prev.partQuantities, [partId]: Math.max(1, qty) },
    }))
  }, [])

  const stopOptimization = useCallback(() => {
    if (nesterRef.current) {
      nesterRef.current.stop()
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsOptimizing(false)
  }, [])

  const runNesting = useCallback(() => {
    if (!hasValidSelection) return

    setIsOptimizing(true)
    setCurrentGeneration(0)

    // Build parts list with quantities
    const allParts: { part: PartBounds; instanceIndex: number }[] = []
    partBounds.forEach(part => {
      const qty = getPartQuantity(part.id)
      for (let i = 0; i < qty; i++) {
        allParts.push({ part, instanceIndex: i })
      }
    })

    // Create genetic nester
    const nester = new GeneticNester(allParts, config)
    nesterRef.current = nester

    // Run optimization with animation
    const runStep = () => {
      if (nester.isStopped() || nester.getGeneration() >= config.generations) {
        setIsOptimizing(false)
        const finalResult = nester.getBestResult()
        if (finalResult) {
          setNestingResult(finalResult)
        }
        return
      }

      const result = nester.runGeneration()
      setNestingResult(result)
      setCurrentGeneration(nester.getGeneration())

      animationRef.current = requestAnimationFrame(runStep)
    }

    animationRef.current = requestAnimationFrame(runStep)
  }, [hasValidSelection, config, partBounds, getPartQuantity])

  const handleAddToCanvas = useCallback(() => {
    if (!project || !nestingResult) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    const sheetPath: PathPoint[] = [
      { x: 0, y: 0, type: 'move' },
      { x: config.sheetWidth, y: 0, type: 'line' },
      { x: config.sheetWidth, y: config.sheetHeight, type: 'line' },
      { x: 0, y: config.sheetHeight, type: 'line' },
      { x: 0, y: 0, type: 'line' },
    ]

    for (let s = 0; s < nestingResult.sheetCount; s++) {
      const sheetOffsetX = offsetX + s * (config.sheetWidth + 50)

      const translatedSheet = sheetPath.map(p => ({
        ...p,
        x: p.x + sheetOffsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: `Sheet ${s + 1}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#6b7280',
          strokeWidth: 1,
          strokeOpacity: 0.5,
        },
        type: 'path',
        points: translatedSheet,
        closed: true,
      } as VectorPath)

      const sheetPlacements = nestingResult.placements.filter(p => p.sheetIndex === s)
      
      sheetPlacements.forEach((placement) => {
        const part = partBounds.find(p => p.id === placement.partId)
        if (!part) return

        const rotationRad = (placement.rotation * Math.PI) / 180
        const cos = Math.cos(rotationRad)
        const sin = Math.sin(rotationRad)

        const translatedPoints = part.points.map(p => {
          let rx = p.x
          let ry = p.y

          if (placement.rotation !== 0) {
            const cx = part.width / 2
            const cy = part.height / 2
            const dx = p.x - cx
            const dy = p.y - cy
            rx = cx + dx * cos - dy * sin
            ry = cy + dx * sin + dy * cos
          }

          return {
            ...p,
            x: rx + placement.x + sheetOffsetX,
            y: ry + placement.y + offsetY,
          }
        })

        addObject({
          id: crypto.randomUUID(),
          layerId,
          name: `${part.name} (nested)`,
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
          points: translatedPoints,
          closed: true,
        } as VectorPath)
      })
    }

    onClose()
  }, [project, activeLayerId, nestingResult, config, partBounds, addObject, onClose])

  const handleReset = useCallback(() => {
    stopOptimization()
    setConfig({
      sheetWidth: 1220,
      sheetHeight: 2440,
      partSpacing: 5,
      sheetMargin: 10,
      allowRotation: '90',
      respectGrain: false,
      populationSize: 20,
      mutationRate: 0.1,
      generations: 50,
      partQuantities: {},
    })
    setNestingResult(null)
    setCurrentGeneration(0)
  }, [stopOptimization])

  const previewScale = useMemo(() => {
    return Math.min(1, 400 / Math.max(config.sheetWidth, config.sheetHeight))
  }, [config.sheetWidth, config.sheetHeight])

  const currentSheetPlacements = useMemo(() => {
    if (!nestingResult) return []
    return nestingResult.placements.filter(p => p.sheetIndex === selectedSheet)
  }, [nestingResult, selectedSheet])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[1000px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nesting Optimizer</h2>
              <p className="text-sm text-muted-foreground">
                Genetic algorithm-based part layout optimization
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {!hasValidSelection && (
          <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-sm text-amber-600">
              Select parts on the canvas to optimize their layout on sheet material.
            </p>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Sheet Size</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={config.sheetWidth}
                    onChange={(e) => updateConfig('sheetWidth', Number(e.target.value))}
                    min={100}
                    max={3000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={config.sheetHeight}
                    onChange={(e) => updateConfig('sheetHeight', Number(e.target.value))}
                    min={100}
                    max={3000}
                  />
                </div>
              </div>

              <div className="flex gap-1 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { updateConfig('sheetWidth', 1220); updateConfig('sheetHeight', 2440) }}>
                  4×8 ft
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { updateConfig('sheetWidth', 610); updateConfig('sheetHeight', 1220) }}>
                  2×4 ft
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { updateConfig('sheetWidth', 305); updateConfig('sheetHeight', 610) }}>
                  1×2 ft
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Spacing</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Part Spacing</Label>
                  <span className="text-xs text-muted-foreground">{config.partSpacing}mm</span>
                </div>
                <Slider
                  value={[config.partSpacing]}
                  onValueChange={([v]) => updateConfig('partSpacing', v)}
                  min={0}
                  max={25}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Sheet Margin</Label>
                  <span className="text-xs text-muted-foreground">{config.sheetMargin}mm</span>
                </div>
                <Slider
                  value={[config.sheetMargin]}
                  onValueChange={([v]) => updateConfig('sheetMargin', v)}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Rotation</h3>
              
              <Select
                value={config.allowRotation}
                onValueChange={(v: string) => updateConfig('allowRotation', v as NestingConfig['allowRotation'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Rotation</SelectItem>
                  <SelectItem value="90">90° Only</SelectItem>
                  <SelectItem value="180">180° Only</SelectItem>
                  <SelectItem value="any">Any Angle (0°, 90°, 180°, 270°)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-between">
                <Label>Respect Grain Direction</Label>
                <Switch
                  checked={config.respectGrain}
                  onCheckedChange={(v: boolean) => updateConfig('respectGrain', v)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Optimization</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Generations</Label>
                  <span className="text-xs text-muted-foreground">{config.generations}</span>
                </div>
                <Slider
                  value={[config.generations]}
                  onValueChange={([v]) => updateConfig('generations', v)}
                  min={10}
                  max={200}
                  step={10}
                />
                <p className="text-xs text-muted-foreground">
                  More generations = better results but slower
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Population Size</Label>
                  <span className="text-xs text-muted-foreground">{config.populationSize}</span>
                </div>
                <Slider
                  value={[config.populationSize]}
                  onValueChange={([v]) => updateConfig('populationSize', v)}
                  min={10}
                  max={50}
                  step={5}
                />
              </div>
            </div>

            {hasValidSelection && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Parts ({partBounds.length})</h3>
                
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {partBounds.map(part => (
                    <div key={part.id} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                      <div>
                        <div className="font-medium truncate max-w-[120px]">{part.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {part.width.toFixed(0)} × {part.height.toFixed(0)} mm
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPartQuantity(part.id, getPartQuantity(part.id) - 1)}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center">{getPartQuantity(part.id)}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setPartQuantity(part.id, getPartQuantity(part.id) + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {isOptimizing ? (
                <Button 
                  className="w-full" 
                  variant="destructive"
                  onClick={stopOptimization}
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Stop ({currentGeneration}/{config.generations})
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={runNesting}
                  disabled={!hasValidSelection}
                >
                  <Zap className="w-4 h-4 mr-1" />
                  Run Optimization
                </Button>
              )}
              
              {isOptimizing && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(currentGeneration / config.generations) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              {nestingResult && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sheet:</span>
                    <Select
                      value={selectedSheet.toString()}
                      onValueChange={(v: string) => setSelectedSheet(Number(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: nestingResult.sheetCount }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>Sheet {i + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Efficiency: </span>
                    <span className={nestingResult.efficiency > 70 ? 'text-green-500 font-medium' : nestingResult.efficiency > 50 ? 'text-amber-500' : 'text-red-500'}>
                      {nestingResult.efficiency.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gen: {nestingResult.generation}
                  </div>
                </div>
              )}
              {!nestingResult && <div />}
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="flex-1 bg-muted/30 overflow-auto p-4 flex items-center justify-center">
              <svg
                width={config.sheetWidth * previewScale + 40}
                height={config.sheetHeight * previewScale + 40}
                viewBox={`-20 -20 ${config.sheetWidth + 40} ${config.sheetHeight + 40}`}
                className="bg-background rounded-lg border border-border"
              >
                <defs>
                  <pattern id="nestGrid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                  </pattern>
                </defs>
                
                <rect 
                  x="0" 
                  y="0" 
                  width={config.sheetWidth} 
                  height={config.sheetHeight} 
                  fill="url(#nestGrid)" 
                  stroke="#6b7280" 
                  strokeWidth="2"
                />
                
                <rect
                  x={config.sheetMargin}
                  y={config.sheetMargin}
                  width={config.sheetWidth - 2 * config.sheetMargin}
                  height={config.sheetHeight - 2 * config.sheetMargin}
                  fill="none"
                  stroke="#6b7280"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  opacity="0.5"
                />
                
                {currentSheetPlacements.map((placement, i) => {
                  const part = partBounds.find(p => p.id === placement.partId)
                  if (!part) return null

                  const bounds = getRotatedBounds(part, placement.rotation)

                  return (
                    <g key={i}>
                      <rect
                        x={placement.x}
                        y={placement.y}
                        width={bounds.width}
                        height={bounds.height}
                        fill="#3b82f620"
                        stroke="#3b82f6"
                        strokeWidth="1"
                      />
                      <text
                        x={placement.x + bounds.width / 2}
                        y={placement.y + bounds.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="10"
                        fill="#3b82f6"
                      >
                        {part.name.slice(0, 8)}
                      </text>
                      {placement.rotation !== 0 && (
                        <text
                          x={placement.x + 5}
                          y={placement.y + 12}
                          fontSize="8"
                          fill="#6b7280"
                        >
                          {placement.rotation}°
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>
            </div>

            {nestingResult && (
              <div className="p-3 border-t border-border">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium">{nestingResult.sheetCount}</div>
                    <div className="text-xs text-muted-foreground">Sheets</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{nestingResult.placements.length}</div>
                    <div className="text-xs text-muted-foreground">Parts</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{(nestingResult.usedArea / 10000).toFixed(1)} cm²</div>
                    <div className="text-xs text-muted-foreground">Used Area</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium">{((nestingResult.totalArea - nestingResult.usedArea) / 10000).toFixed(1)} cm²</div>
                    <div className="text-xs text-muted-foreground">Waste</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <Download className="w-4 h-4 mr-1" />
              Export Report
            </Button>
            <Button onClick={handleAddToCanvas} disabled={!project || !nestingResult}>
              <Plus className="w-4 h-4 mr-1" />
              Add to Canvas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NestingOptimizer
