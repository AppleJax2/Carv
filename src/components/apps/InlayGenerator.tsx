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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { X, Layers, RotateCcw, Download, Plus, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint, DesignObject } from '@/types/design'

interface InlayGeneratorProps {
  onClose: () => void
}

interface InlayConfig {
  inlayType: 'flat' | 'vcarve' | 'proud'
  pocketDepth: number
  gapTolerance: number
  bitAngle: number
  bitDiameter: number
  startDepth: number
  proudHeight: number
  generateAlignmentMarks: boolean
  alignmentMarkSize: number
}

interface InlayOutput {
  pocket: PathPoint[][]
  plug: PathPoint[][]
  alignmentMarks?: PathPoint[][]
}

export function InlayGenerator({ onClose }: InlayGeneratorProps) {
  const { project, addObject, activeLayerId, selectedObjectIds } = useDesignStore()
  
  const [config, setConfig] = useState<InlayConfig>({
    inlayType: 'flat',
    pocketDepth: 3,
    gapTolerance: 0.1,
    bitAngle: 60,
    bitDiameter: 6.35,
    startDepth: 0,
    proudHeight: 1,
    generateAlignmentMarks: true,
    alignmentMarkSize: 5,
  })

  const [showPreview, setShowPreview] = useState(true)
  const [activeTab, setActiveTab] = useState<'pocket' | 'plug'>('pocket')

  const updateConfig = useCallback(<K extends keyof InlayConfig>(key: K, value: InlayConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const selectedObjects = useMemo(() => {
    if (!project) return []
    return project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  }, [project, selectedObjectIds])

  const hasValidSelection = selectedObjects.length > 0 && selectedObjects.every(obj => obj.type === 'path' || obj.type === 'shape')

  const offsetPath = useCallback((points: PathPoint[], offset: number): PathPoint[] => {
    if (points.length < 3) return points

    const result: PathPoint[] = []
    
    for (let i = 0; i < points.length; i++) {
      const curr = points[i]
      const prev = points[(i - 1 + points.length) % points.length]
      const next = points[(i + 1) % points.length]
      
      const dx1 = curr.x - prev.x
      const dy1 = curr.y - prev.y
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1
      const nx1 = -dy1 / len1
      const ny1 = dx1 / len1
      
      const dx2 = next.x - curr.x
      const dy2 = next.y - curr.y
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
      const nx2 = -dy2 / len2
      const ny2 = dx2 / len2
      
      const nx = (nx1 + nx2) / 2
      const ny = (ny1 + ny2) / 2
      const nlen = Math.sqrt(nx * nx + ny * ny) || 1
      
      result.push({
        ...curr,
        x: curr.x + (nx / nlen) * offset,
        y: curr.y + (ny / nlen) * offset,
      })
    }
    
    return result
  }, [])

  const calculateVCarveOffset = useCallback((depth: number, bitAngle: number): number => {
    const halfAngle = (bitAngle / 2) * (Math.PI / 180)
    return depth * Math.tan(halfAngle)
  }, [])

  const generateInlayPaths = useCallback((): InlayOutput | null => {
    if (!hasValidSelection) return null

    const { inlayType, pocketDepth, gapTolerance, bitAngle, startDepth, proudHeight } = config

    const sourcePaths: PathPoint[][] = []
    
    selectedObjects.forEach(obj => {
      if (obj.type === 'path') {
        const pathObj = obj as VectorPath
        sourcePaths.push(pathObj.points)
      } else if (obj.type === 'shape') {
        const shapePoints = generateShapePoints(obj)
        if (shapePoints) sourcePaths.push(shapePoints)
      }
    })

    if (sourcePaths.length === 0) return null

    let pocketOffset: number
    let plugOffset: number

    if (inlayType === 'flat') {
      pocketOffset = 0
      plugOffset = -gapTolerance
    } else if (inlayType === 'vcarve') {
      const vOffset = calculateVCarveOffset(pocketDepth - startDepth, bitAngle)
      pocketOffset = vOffset
      plugOffset = vOffset - gapTolerance
    } else {
      pocketOffset = 0
      plugOffset = -gapTolerance
    }

    const pocketPaths = sourcePaths.map(path => offsetPath(path, pocketOffset))
    const plugPaths = sourcePaths.map(path => offsetPath(path, plugOffset))

    let alignmentMarks: PathPoint[][] | undefined
    if (config.generateAlignmentMarks) {
      alignmentMarks = generateAlignmentMarks(sourcePaths, config.alignmentMarkSize)
    }

    return { pocket: pocketPaths, plug: plugPaths, alignmentMarks }
  }, [hasValidSelection, selectedObjects, config, offsetPath, calculateVCarveOffset])

  const generateShapePoints = (obj: DesignObject): PathPoint[] | null => {
    if (obj.type !== 'shape') return null
    
    const { shapeType, params } = obj
    const { x, y } = obj.transform
    
    if (shapeType === 'rectangle') {
      const { width, height } = params as { width: number; height: number }
      return [
        { x, y, type: 'move' },
        { x: x + width, y, type: 'line' },
        { x: x + width, y: y + height, type: 'line' },
        { x, y: y + height, type: 'line' },
        { x, y, type: 'line' },
      ]
    }
    
    if (shapeType === 'ellipse') {
      const { radiusX, radiusY } = params as { radiusX: number; radiusY: number }
      const points: PathPoint[] = []
      const segments = 32
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        points.push({
          x: x + Math.cos(angle) * radiusX,
          y: y + Math.sin(angle) * radiusY,
          type: i === 0 ? 'move' : 'line',
        })
      }
      return points
    }
    
    return null
  }

  const generateAlignmentMarks = (paths: PathPoint[][], size: number): PathPoint[][] => {
    const marks: PathPoint[][] = []
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    paths.forEach(path => {
      path.forEach(p => {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      })
    })
    
    const corners = [
      { x: minX - size * 2, y: minY - size * 2 },
      { x: maxX + size * 2, y: minY - size * 2 },
      { x: minX - size * 2, y: maxY + size * 2 },
      { x: maxX + size * 2, y: maxY + size * 2 },
    ]
    
    corners.forEach(corner => {
      marks.push([
        { x: corner.x - size / 2, y: corner.y, type: 'move' },
        { x: corner.x + size / 2, y: corner.y, type: 'line' },
      ])
      marks.push([
        { x: corner.x, y: corner.y - size / 2, type: 'move' },
        { x: corner.x, y: corner.y + size / 2, type: 'line' },
      ])
    })
    
    return marks
  }

  const inlayOutput = useMemo(() => generateInlayPaths(), [generateInlayPaths])

  const handleAddToCanvas = useCallback(() => {
    if (!project || !inlayOutput) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    inlayOutput.pocket.forEach((path, index) => {
      const translatedPath = path.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      const pathObject: VectorPath = {
        id: crypto.randomUUID(),
        layerId,
        name: `Pocket ${index + 1}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#ef4444',
          strokeWidth: 1,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedPath,
        closed: true,
      }

      addObject(pathObject)
    })

    const plugOffsetX = offsetX + 250
    inlayOutput.plug.forEach((path, index) => {
      const translatedPath = path.map(p => ({
        ...p,
        x: p.x + plugOffsetX,
        y: p.y + offsetY,
      }))

      const pathObject: VectorPath = {
        id: crypto.randomUUID(),
        layerId,
        name: `Plug ${index + 1}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#22c55e',
          strokeWidth: 1,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedPath,
        closed: true,
      }

      addObject(pathObject)
    })

    if (inlayOutput.alignmentMarks) {
      inlayOutput.alignmentMarks.forEach((mark, index) => {
        const translatedMark = mark.map(p => ({
          ...p,
          x: p.x + offsetX,
          y: p.y + offsetY,
        }))

        addObject({
          id: crypto.randomUUID(),
          layerId,
          name: `Alignment Mark ${index + 1}`,
          visible: true,
          locked: false,
          selected: false,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          style: {
            fillColor: null,
            fillOpacity: 1,
            strokeColor: '#8b5cf6',
            strokeWidth: 0.5,
            strokeOpacity: 1,
          },
          type: 'path',
          points: translatedMark,
          closed: false,
        } as VectorPath)

        const translatedMarkPlug = mark.map(p => ({
          ...p,
          x: p.x + plugOffsetX,
          y: p.y + offsetY,
        }))

        addObject({
          id: crypto.randomUUID(),
          layerId,
          name: `Alignment Mark ${index + 1}`,
          visible: true,
          locked: false,
          selected: false,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          style: {
            fillColor: null,
            fillOpacity: 1,
            strokeColor: '#8b5cf6',
            strokeWidth: 0.5,
            strokeOpacity: 1,
          },
          type: 'path',
          points: translatedMarkPlug,
          closed: false,
        } as VectorPath)
      })
    }

    onClose()
  }, [project, activeLayerId, inlayOutput, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      inlayType: 'flat',
      pocketDepth: 3,
      gapTolerance: 0.1,
      bitAngle: 60,
      bitDiameter: 6.35,
      startDepth: 0,
      proudHeight: 1,
      generateAlignmentMarks: true,
      alignmentMarkSize: 5,
    })
  }, [])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map((p, i) => {
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
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Inlay Generator</h2>
              <p className="text-sm text-muted-foreground">Create pocket and plug pairs</p>
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
              Select one or more paths or shapes on the canvas to generate inlay geometry.
            </p>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="w-72 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Inlay Type</h3>
              
              <Select
                value={config.inlayType}
                onValueChange={(v: string) => updateConfig('inlayType', v as InlayConfig['inlayType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat Inlay</SelectItem>
                  <SelectItem value="vcarve">V-Carve Inlay</SelectItem>
                  <SelectItem value="proud">Proud Inlay</SelectItem>
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">
                {config.inlayType === 'flat' && 'Standard inlay with flat bottom pocket and matching plug.'}
                {config.inlayType === 'vcarve' && 'V-bit carved pocket with angled walls for seamless joints.'}
                {config.inlayType === 'proud' && 'Inlay that sits above the surface for a raised effect.'}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Dimensions</h3>
              
              <div className="space-y-2">
                <Label>Pocket Depth (mm)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={config.pocketDepth}
                    onChange={(e) => updateConfig('pocketDepth', Number(e.target.value))}
                    min={0.5}
                    max={25}
                    step={0.1}
                    className="w-20"
                  />
                  <Slider
                    value={[config.pocketDepth]}
                    onValueChange={([v]) => updateConfig('pocketDepth', v)}
                    min={0.5}
                    max={15}
                    step={0.1}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Gap Tolerance (mm)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={config.gapTolerance}
                    onChange={(e) => updateConfig('gapTolerance', Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-20"
                  />
                  <Slider
                    value={[config.gapTolerance * 100]}
                    onValueChange={([v]) => updateConfig('gapTolerance', v / 100)}
                    min={0}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Space for glue. Typical: 0.05-0.15mm
                </p>
              </div>

              {config.inlayType === 'proud' && (
                <div className="space-y-2">
                  <Label>Proud Height (mm)</Label>
                  <Input
                    type="number"
                    value={config.proudHeight}
                    onChange={(e) => updateConfig('proudHeight', Number(e.target.value))}
                    min={0.5}
                    max={10}
                    step={0.1}
                  />
                </div>
              )}
            </div>

            {config.inlayType === 'vcarve' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">V-Bit Settings</h3>
                
                <div className="space-y-2">
                  <Label>Bit Angle (degrees)</Label>
                  <Select
                    value={config.bitAngle.toString()}
                    onValueChange={(v: string) => updateConfig('bitAngle', Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30°</SelectItem>
                      <SelectItem value="45">45°</SelectItem>
                      <SelectItem value="60">60°</SelectItem>
                      <SelectItem value="90">90°</SelectItem>
                      <SelectItem value="120">120°</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Start Depth (mm)</Label>
                  <Input
                    type="number"
                    value={config.startDepth}
                    onChange={(e) => updateConfig('startDepth', Number(e.target.value))}
                    min={0}
                    max={config.pocketDepth}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Flat area before V-carve begins
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Options</h3>
              
              <div className="flex items-center justify-between">
                <Label>Alignment Marks</Label>
                <Switch
                  checked={config.generateAlignmentMarks}
                  onCheckedChange={(v: boolean) => updateConfig('generateAlignmentMarks', v)}
                />
              </div>

              {config.generateAlignmentMarks && (
                <div className="space-y-2">
                  <Label>Mark Size (mm)</Label>
                  <Input
                    type="number"
                    value={config.alignmentMarkSize}
                    onChange={(e) => updateConfig('alignmentMarkSize', Number(e.target.value))}
                    min={2}
                    max={20}
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Selected Objects:</span>
                <span className="font-medium">{selectedObjects.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Offset (pocket):</span>
                <span className="font-medium">
                  {config.inlayType === 'vcarve' 
                    ? `${calculateVCarveOffset(config.pocketDepth - config.startDepth, config.bitAngle).toFixed(2)}mm`
                    : '0mm'
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Offset (plug):</span>
                <span className="font-medium">
                  {config.inlayType === 'vcarve'
                    ? `${(calculateVCarveOffset(config.pocketDepth - config.startDepth, config.bitAngle) - config.gapTolerance).toFixed(2)}mm`
                    : `-${config.gapTolerance}mm`
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant={showPreview ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                  Preview
                </Button>
                
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pocket' | 'plug')}>
                  <TabsList>
                    <TabsTrigger value="pocket">Pocket</TabsTrigger>
                    <TabsTrigger value="plug">Plug</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="flex-1 bg-muted/30 overflow-auto p-4 flex items-center justify-center">
              {showPreview && inlayOutput && (
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2 text-red-500">Pocket</p>
                    <svg
                      width="200"
                      height="200"
                      viewBox="-50 -50 200 200"
                      className="bg-background rounded-lg border border-border"
                    >
                      {inlayOutput.pocket.map((path, i) => (
                        <path
                          key={i}
                          d={pathToSvg(path) + ' Z'}
                          fill={activeTab === 'pocket' ? '#ef444420' : 'none'}
                          stroke="#ef4444"
                          strokeWidth={activeTab === 'pocket' ? 2 : 1}
                        />
                      ))}
                      {inlayOutput.alignmentMarks?.map((mark, i) => (
                        <path
                          key={`mark-${i}`}
                          d={pathToSvg(mark)}
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth={0.5}
                        />
                      ))}
                    </svg>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2 text-green-500">Plug</p>
                    <svg
                      width="200"
                      height="200"
                      viewBox="-50 -50 200 200"
                      className="bg-background rounded-lg border border-border"
                    >
                      {inlayOutput.plug.map((path, i) => (
                        <path
                          key={i}
                          d={pathToSvg(path) + ' Z'}
                          fill={activeTab === 'plug' ? '#22c55e20' : 'none'}
                          stroke="#22c55e"
                          strokeWidth={activeTab === 'plug' ? 2 : 1}
                        />
                      ))}
                      {inlayOutput.alignmentMarks?.map((mark, i) => (
                        <path
                          key={`mark-${i}`}
                          d={pathToSvg(mark)}
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth={0.5}
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              )}

              {showPreview && !inlayOutput && (
                <div className="text-center text-muted-foreground">
                  <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select objects on the canvas to preview inlay geometry</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-2 bg-red-500/10 rounded text-center">
                  <div className="text-red-500 font-medium">Pocket</div>
                  <div className="text-xs text-muted-foreground">Cut into base material</div>
                </div>
                <div className="p-2 bg-green-500/10 rounded text-center">
                  <div className="text-green-500 font-medium">Plug</div>
                  <div className="text-xs text-muted-foreground">Inlay piece (contrast wood)</div>
                </div>
                <div className="p-2 bg-purple-500/10 rounded text-center">
                  <div className="text-purple-500 font-medium">Alignment</div>
                  <div className="text-xs text-muted-foreground">Registration marks</div>
                </div>
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
            <Button onClick={handleAddToCanvas} disabled={!project || !inlayOutput}>
              <Plus className="w-4 h-4 mr-1" />
              Add to Canvas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InlayGenerator
