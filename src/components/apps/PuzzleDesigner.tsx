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
import { X, Puzzle, RotateCcw, Download, Plus, Eye, EyeOff, Upload } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface PuzzleDesignerProps {
  onClose: () => void
}

interface PuzzleConfig {
  width: number
  height: number
  columns: number
  rows: number
  pieceStyle: 'classic' | 'modern' | 'whimsical' | 'geometric'
  tabDepth: number
  tabWidth: number
  randomSeed: number
  includeFrame: boolean
  frameWidth: number
  straightEdges: boolean
  jitter: number
}

interface PuzzlePiece {
  row: number
  col: number
  path: PathPoint[]
}

type TabDirection = 'in' | 'out' | 'none'

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = Math.sin(s * 9999) * 10000
    return s - Math.floor(s)
  }
}

export function PuzzleDesigner({ onClose }: PuzzleDesignerProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  
  const [config, setConfig] = useState<PuzzleConfig>({
    width: 200,
    height: 150,
    columns: 4,
    rows: 3,
    pieceStyle: 'classic',
    tabDepth: 20,
    tabWidth: 50,
    randomSeed: 42,
    includeFrame: true,
    frameWidth: 5,
    straightEdges: true,
    jitter: 10,
  })

  const [showPreview, setShowPreview] = useState(true)
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null)

  const updateConfig = useCallback(<K extends keyof PuzzleConfig>(key: K, value: PuzzleConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const generateTabCurve = useCallback((
    x1: number, y1: number,
    x2: number, y2: number,
    direction: TabDirection,
    tabDepth: number,
    tabWidth: number,
    style: PuzzleConfig['pieceStyle'],
    random: () => number
  ): PathPoint[] => {
    if (direction === 'none') {
      return [{ x: x2, y: y2, type: 'line' }]
    }

    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy)
    const nx = -dy / length
    const ny = dx / length
    
    const tabDepthActual = (tabDepth / 100) * length * (direction === 'out' ? 1 : -1)
    const tabWidthActual = (tabWidth / 100) * length
    
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    
    const jitterX = (random() - 0.5) * config.jitter * 0.01 * length
    const jitterY = (random() - 0.5) * config.jitter * 0.01 * length

    const points: PathPoint[] = []

    if (style === 'classic' || style === 'modern') {
      const neckStart = 0.35
      const neckEnd = 0.65
      const neckWidth = style === 'classic' ? 0.15 : 0.1
      
      const p1x = x1 + dx * neckStart
      const p1y = y1 + dy * neckStart
      points.push({ x: p1x, y: p1y, type: 'line' })
      
      const neckInX = p1x + nx * tabDepthActual * neckWidth
      const neckInY = p1y + ny * tabDepthActual * neckWidth
      points.push({ 
        x: neckInX, 
        y: neckInY, 
        type: 'curve',
        handleIn: { x: p1x, y: p1y },
        handleOut: { x: neckInX, y: neckInY }
      })
      
      const bulgeX = midX + nx * tabDepthActual + jitterX
      const bulgeY = midY + ny * tabDepthActual + jitterY
      
      points.push({
        x: bulgeX - dx * 0.15,
        y: bulgeY - dy * 0.15,
        type: 'curve',
        handleIn: { x: neckInX - dx * 0.1, y: neckInY - dy * 0.1 },
        handleOut: { x: bulgeX - dx * 0.1, y: bulgeY - dy * 0.1 }
      })
      
      points.push({
        x: bulgeX + dx * 0.15,
        y: bulgeY + dy * 0.15,
        type: 'curve',
        handleIn: { x: bulgeX + dx * 0.1, y: bulgeY + dy * 0.1 },
        handleOut: { x: bulgeX + dx * 0.15, y: bulgeY + dy * 0.15 }
      })
      
      const p2x = x1 + dx * neckEnd
      const p2y = y1 + dy * neckEnd
      const neckIn2X = p2x + nx * tabDepthActual * neckWidth
      const neckIn2Y = p2y + ny * tabDepthActual * neckWidth
      
      points.push({
        x: neckIn2X,
        y: neckIn2Y,
        type: 'curve',
        handleIn: { x: neckIn2X, y: neckIn2Y },
        handleOut: { x: p2x, y: p2y }
      })
      
      points.push({ x: p2x, y: p2y, type: 'line' })
      points.push({ x: x2, y: y2, type: 'line' })
      
    } else if (style === 'geometric') {
      const tabStart = 0.3
      const tabEnd = 0.7
      
      points.push({ x: x1 + dx * tabStart, y: y1 + dy * tabStart, type: 'line' })
      points.push({ 
        x: x1 + dx * tabStart + nx * tabDepthActual, 
        y: y1 + dy * tabStart + ny * tabDepthActual, 
        type: 'line' 
      })
      points.push({ 
        x: x1 + dx * tabEnd + nx * tabDepthActual, 
        y: y1 + dy * tabEnd + ny * tabDepthActual, 
        type: 'line' 
      })
      points.push({ x: x1 + dx * tabEnd, y: y1 + dy * tabEnd, type: 'line' })
      points.push({ x: x2, y: y2, type: 'line' })
      
    } else {
      const waveCount = 2
      for (let i = 1; i <= waveCount * 2; i++) {
        const t = i / (waveCount * 2 + 1)
        const waveAmp = Math.sin(t * Math.PI * waveCount) * tabDepthActual * 0.5
        points.push({
          x: x1 + dx * t + nx * waveAmp,
          y: y1 + dy * t + ny * waveAmp,
          type: 'curve',
          handleIn: { x: x1 + dx * (t - 0.05), y: y1 + dy * (t - 0.05) },
          handleOut: { x: x1 + dx * (t + 0.05), y: y1 + dy * (t + 0.05) }
        })
      }
      points.push({ x: x2, y: y2, type: 'line' })
    }

    return points
  }, [config.jitter])

  const puzzlePieces = useMemo((): PuzzlePiece[] => {
    const { width, height, columns, rows, pieceStyle, tabDepth, tabWidth, randomSeed, straightEdges } = config
    const random = seededRandom(randomSeed)
    
    const pieceWidth = width / columns
    const pieceHeight = height / rows
    
    const horizontalTabs: TabDirection[][] = []
    const verticalTabs: TabDirection[][] = []
    
    for (let row = 0; row <= rows; row++) {
      horizontalTabs[row] = []
      for (let col = 0; col < columns; col++) {
        if (row === 0 || row === rows) {
          horizontalTabs[row][col] = straightEdges ? 'none' : (random() > 0.5 ? 'out' : 'in')
        } else {
          horizontalTabs[row][col] = random() > 0.5 ? 'out' : 'in'
        }
      }
    }
    
    for (let row = 0; row < rows; row++) {
      verticalTabs[row] = []
      for (let col = 0; col <= columns; col++) {
        if (col === 0 || col === columns) {
          verticalTabs[row][col] = straightEdges ? 'none' : (random() > 0.5 ? 'out' : 'in')
        } else {
          verticalTabs[row][col] = random() > 0.5 ? 'out' : 'in'
        }
      }
    }
    
    const pieces: PuzzlePiece[] = []
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = col * pieceWidth
        const y = row * pieceHeight
        
        const path: PathPoint[] = [{ x, y, type: 'move' }]
        
        const topTab = horizontalTabs[row][col]
        const topDir: TabDirection = topTab === 'out' ? 'in' : topTab === 'in' ? 'out' : 'none'
        path.push(...generateTabCurve(x, y, x + pieceWidth, y, topDir, tabDepth, tabWidth, pieceStyle, random))
        
        const rightTab = verticalTabs[row][col + 1]
        path.push(...generateTabCurve(x + pieceWidth, y, x + pieceWidth, y + pieceHeight, rightTab, tabDepth, tabWidth, pieceStyle, random))
        
        const bottomTab = horizontalTabs[row + 1][col]
        path.push(...generateTabCurve(x + pieceWidth, y + pieceHeight, x, y + pieceHeight, bottomTab, tabDepth, tabWidth, pieceStyle, random))
        
        const leftTab = verticalTabs[row][col]
        const leftDir: TabDirection = leftTab === 'out' ? 'in' : leftTab === 'in' ? 'out' : 'none'
        path.push(...generateTabCurve(x, y + pieceHeight, x, y, leftDir, tabDepth, tabWidth, pieceStyle, random))
        
        pieces.push({ row, col, path })
      }
    }
    
    return pieces
  }, [config, generateTabCurve])

  const framePath = useMemo((): PathPoint[] | null => {
    if (!config.includeFrame) return null
    
    const { width, height, frameWidth: fw } = config
    
    return [
      { x: -fw, y: -fw, type: 'move' },
      { x: width + fw, y: -fw, type: 'line' },
      { x: width + fw, y: height + fw, type: 'line' },
      { x: -fw, y: height + fw, type: 'line' },
      { x: -fw, y: -fw, type: 'line' },
      { x: 0, y: 0, type: 'move' },
      { x: 0, y: height, type: 'line' },
      { x: width, y: height, type: 'line' },
      { x: width, y: 0, type: 'line' },
      { x: 0, y: 0, type: 'line' },
    ]
  }, [config.includeFrame, config.width, config.height, config.frameWidth])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    puzzlePieces.forEach((piece) => {
      const translatedPath = piece.path.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
        handleIn: p.handleIn ? { x: p.handleIn.x + offsetX, y: p.handleIn.y + offsetY } : undefined,
        handleOut: p.handleOut ? { x: p.handleOut.x + offsetX, y: p.handleOut.y + offsetY } : undefined,
      }))

      const pathObject: VectorPath = {
        id: crypto.randomUUID(),
        layerId,
        name: `Piece ${piece.row + 1}-${piece.col + 1}`,
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
        points: translatedPath,
        closed: true,
      }

      addObject(pathObject)
    })

    if (framePath) {
      const translatedFrame = framePath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      const frameObject: VectorPath = {
        id: crypto.randomUUID(),
        layerId,
        name: 'Puzzle Frame',
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
        points: translatedFrame,
        closed: true,
      }

      addObject(frameObject)
    }

    onClose()
  }, [project, activeLayerId, puzzlePieces, framePath, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      width: 200,
      height: 150,
      columns: 4,
      rows: 3,
      pieceStyle: 'classic',
      tabDepth: 20,
      tabWidth: 50,
      randomSeed: 42,
      includeFrame: true,
      frameWidth: 5,
      straightEdges: true,
      jitter: 10,
    })
  }, [])

  const handleRandomize = useCallback(() => {
    updateConfig('randomSeed', Math.floor(Math.random() * 10000))
  }, [updateConfig])

  const previewScale = useMemo(() => {
    const maxDim = Math.max(config.width, config.height)
    return Math.min(1, 350 / maxDim)
  }, [config.width, config.height])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map((p, i) => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      if (p.type === 'line') return `L ${p.x} ${p.y}`
      if (p.type === 'curve' && p.handleIn && p.handleOut) {
        return `C ${p.handleIn.x} ${p.handleIn.y} ${p.handleOut.x} ${p.handleOut.y} ${p.x} ${p.y}`
      }
      return `L ${p.x} ${p.y}`
    }).join(' ') + ' Z'
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[900px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Puzzle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Puzzle Designer</h2>
              <p className="text-sm text-muted-foreground">Create custom jigsaw puzzles</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Puzzle Size</h3>
              
              <div className="space-y-2">
                <Label>Width (mm)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={config.width}
                    onChange={(e) => updateConfig('width', Number(e.target.value))}
                    min={50}
                    max={1000}
                    className="w-20"
                  />
                  <Slider
                    value={[config.width]}
                    onValueChange={([v]) => updateConfig('width', v)}
                    min={50}
                    max={500}
                    step={10}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Height (mm)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={config.height}
                    onChange={(e) => updateConfig('height', Number(e.target.value))}
                    min={50}
                    max={1000}
                    className="w-20"
                  />
                  <Slider
                    value={[config.height]}
                    onValueChange={([v]) => updateConfig('height', v)}
                    min={50}
                    max={500}
                    step={10}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Grid</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Columns</Label>
                  <Input
                    type="number"
                    value={config.columns}
                    onChange={(e) => updateConfig('columns', Math.max(2, Number(e.target.value)))}
                    min={2}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rows</Label>
                  <Input
                    type="number"
                    value={config.rows}
                    onChange={(e) => updateConfig('rows', Math.max(2, Number(e.target.value)))}
                    min={2}
                    max={20}
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                {config.columns * config.rows} pieces total
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Piece Style</h3>
              
              <Select
                value={config.pieceStyle}
                onValueChange={(v: string) => updateConfig('pieceStyle', v as PuzzleConfig['pieceStyle'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classic</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="whimsical">Whimsical</SelectItem>
                  <SelectItem value="geometric">Geometric</SelectItem>
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <Label>Tab Depth (%)</Label>
                <Slider
                  value={[config.tabDepth]}
                  onValueChange={([v]) => updateConfig('tabDepth', v)}
                  min={10}
                  max={35}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Tab Width (%)</Label>
                <Slider
                  value={[config.tabWidth]}
                  onValueChange={([v]) => updateConfig('tabWidth', v)}
                  min={30}
                  max={70}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Variation</Label>
                <Slider
                  value={[config.jitter]}
                  onValueChange={([v]) => updateConfig('jitter', v)}
                  min={0}
                  max={30}
                  step={1}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Options</h3>
              
              <div className="flex items-center justify-between">
                <Label>Straight Edges</Label>
                <Switch
                  checked={config.straightEdges}
                  onCheckedChange={(v: boolean) => updateConfig('straightEdges', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Include Frame</Label>
                <Switch
                  checked={config.includeFrame}
                  onCheckedChange={(v: boolean) => updateConfig('includeFrame', v)}
                />
              </div>

              {config.includeFrame && (
                <div className="space-y-2">
                  <Label>Frame Width (mm)</Label>
                  <Input
                    type="number"
                    value={config.frameWidth}
                    onChange={(e) => updateConfig('frameWidth', Number(e.target.value))}
                    min={2}
                    max={20}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Random Seed</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={config.randomSeed}
                    onChange={(e) => updateConfig('randomSeed', Number(e.target.value))}
                    min={1}
                    max={9999}
                  />
                  <Button variant="outline" size="sm" onClick={handleRandomize}>
                    Shuffle
                  </Button>
                </div>
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
                  width="100%"
                  height="100%"
                  viewBox={`${-config.frameWidth - 10} ${-config.frameWidth - 10} ${config.width + config.frameWidth * 2 + 20} ${config.height + config.frameWidth * 2 + 20}`}
                  className="bg-background rounded-lg border border-border max-w-full max-h-full"
                  style={{ maxWidth: 500, maxHeight: 400 }}
                >
                  <defs>
                    <pattern id="puzzleGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                    </pattern>
                  </defs>
                  <rect x={-config.frameWidth - 10} y={-config.frameWidth - 10} width={config.width + config.frameWidth * 2 + 20} height={config.height + config.frameWidth * 2 + 20} fill="url(#puzzleGrid)" />
                  
                  {framePath && (
                    <path
                      d={pathToSvg(framePath)}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth={1}
                      fillRule="evenodd"
                    />
                  )}
                  
                  {puzzlePieces.map((piece) => (
                    <path
                      key={`${piece.row}-${piece.col}`}
                      d={pathToSvg(piece.path)}
                      fill={selectedPiece === `${piece.row}-${piece.col}` ? '#3b82f620' : 'none'}
                      stroke="#3b82f6"
                      strokeWidth={selectedPiece === `${piece.row}-${piece.col}` ? 2 : 1}
                      className="cursor-pointer hover:fill-primary/10"
                      onClick={() => setSelectedPiece(
                        selectedPiece === `${piece.row}-${piece.col}` ? null : `${piece.row}-${piece.col}`
                      )}
                    />
                  ))}
                </svg>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pieces: {puzzlePieces.length}</span>
                <span className="text-muted-foreground">
                  Piece size: {(config.width / config.columns).toFixed(1)} × {(config.height / config.rows).toFixed(1)} mm
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

export default PuzzleDesigner
