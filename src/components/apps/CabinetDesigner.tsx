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
import { X, Archive, RotateCcw, Download, Plus, Eye, EyeOff, FileText } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface CabinetDesignerProps {
  onClose: () => void
}

interface CabinetConfig {
  cabinetType: 'base' | 'wall' | 'tall' | 'drawer'
  width: number
  height: number
  depth: number
  materialThickness: number
  backPanelThickness: number
  construction: 'frameless' | 'faceframe'
  doorCount: number
  doorOverlay: 'full' | 'half' | 'inset'
  doorGap: number
  shelfCount: number
  shelfAdjustable: boolean
  shelfHoleSpacing: number
  drawerCount: number
  drawerHeights: number[]
  hingeType: 'euro' | 'traditional'
  hingeBoring: boolean
  slideType: 'sidemount' | 'undermount'
  toeKick: boolean
  toeKickHeight: number
  toeKickSetback: number
}

interface CabinetPanel {
  id: string
  name: string
  width: number
  height: number
  quantity: number
  material: string
  paths: PathPoint[][]
}

const CABINET_PRESETS = {
  base: { width: 600, height: 720, depth: 560 },
  wall: { width: 600, height: 720, depth: 300 },
  tall: { width: 600, height: 2100, depth: 560 },
  drawer: { width: 600, height: 720, depth: 560 },
}

export function CabinetDesigner({ onClose }: CabinetDesignerProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  
  const [config, setConfig] = useState<CabinetConfig>({
    cabinetType: 'base',
    width: 600,
    height: 720,
    depth: 560,
    materialThickness: 18,
    backPanelThickness: 6,
    construction: 'frameless',
    doorCount: 2,
    doorOverlay: 'full',
    doorGap: 3,
    shelfCount: 1,
    shelfAdjustable: true,
    shelfHoleSpacing: 32,
    drawerCount: 0,
    drawerHeights: [150],
    hingeType: 'euro',
    hingeBoring: true,
    slideType: 'undermount',
    toeKick: true,
    toeKickHeight: 100,
    toeKickSetback: 50,
  })

  const [showPreview, setShowPreview] = useState(true)
  const [activeTab, setActiveTab] = useState('dimensions')
  const [showCutList, setShowCutList] = useState(false)

  const updateConfig = useCallback(<K extends keyof CabinetConfig>(key: K, value: CabinetConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleTypeChange = useCallback((type: CabinetConfig['cabinetType']) => {
    const preset = CABINET_PRESETS[type]
    setConfig(prev => ({
      ...prev,
      cabinetType: type,
      width: preset.width,
      height: preset.height,
      depth: preset.depth,
      drawerCount: type === 'drawer' ? 4 : 0,
    }))
  }, [])

  const generateRectPath = useCallback((w: number, h: number): PathPoint[] => {
    return [
      { x: 0, y: 0, type: 'move' },
      { x: w, y: 0, type: 'line' },
      { x: w, y: h, type: 'line' },
      { x: 0, y: h, type: 'line' },
      { x: 0, y: 0, type: 'line' },
    ]
  }, [])

  const generateHolePath = useCallback((cx: number, cy: number, diameter: number): PathPoint[] => {
    const r = diameter / 2
    const points: PathPoint[] = []
    const segments = 16
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        type: i === 0 ? 'move' : 'line',
      })
    }
    return points
  }, [])

  const panels = useMemo((): CabinetPanel[] => {
    const {
      width, height, depth,
      materialThickness: t,
      backPanelThickness: bt,
      construction,
      shelfCount,
      shelfAdjustable,
      shelfHoleSpacing,
      toeKick,
      toeKickHeight,
      toeKickSetback,
      drawerCount,
      doorCount,
      hingeBoring,
    } = config

    const result: CabinetPanel[] = []
    
    const caseHeight = toeKick ? height - toeKickHeight : height
    const caseDepth = depth - bt

    const sidePaths: PathPoint[][] = [generateRectPath(caseDepth, caseHeight)]
    
    if (shelfAdjustable) {
      const holeRows = Math.floor((caseHeight - 100) / shelfHoleSpacing)
      const holeDiameter = 5
      const holeInset = 37
      
      for (let row = 0; row < holeRows; row++) {
        const y = 50 + row * shelfHoleSpacing
        sidePaths.push(generateHolePath(holeInset, y, holeDiameter))
        sidePaths.push(generateHolePath(caseDepth - holeInset, y, holeDiameter))
      }
    }

    result.push({
      id: 'left-side',
      name: 'Left Side',
      width: caseDepth,
      height: caseHeight,
      quantity: 1,
      material: 'Primary',
      paths: sidePaths,
    })

    result.push({
      id: 'right-side',
      name: 'Right Side',
      width: caseDepth,
      height: caseHeight,
      quantity: 1,
      material: 'Primary',
      paths: sidePaths,
    })

    const topBottomWidth = width - 2 * t
    const topBottomDepth = caseDepth

    result.push({
      id: 'top',
      name: 'Top Panel',
      width: topBottomWidth,
      height: topBottomDepth,
      quantity: 1,
      material: 'Primary',
      paths: [generateRectPath(topBottomWidth, topBottomDepth)],
    })

    result.push({
      id: 'bottom',
      name: 'Bottom Panel',
      width: topBottomWidth,
      height: topBottomDepth,
      quantity: 1,
      material: 'Primary',
      paths: [generateRectPath(topBottomWidth, topBottomDepth)],
    })

    const backWidth = width - 2 * t
    const backHeight = caseHeight - 2 * t

    result.push({
      id: 'back',
      name: 'Back Panel',
      width: backWidth,
      height: backHeight,
      quantity: 1,
      material: 'Back Panel',
      paths: [generateRectPath(backWidth, backHeight)],
    })

    if (shelfCount > 0) {
      const shelfWidth = width - 2 * t - 2
      const shelfDepth = caseDepth - 20

      result.push({
        id: 'shelf',
        name: 'Adjustable Shelf',
        width: shelfWidth,
        height: shelfDepth,
        quantity: shelfCount,
        material: 'Primary',
        paths: [generateRectPath(shelfWidth, shelfDepth)],
      })
    }

    if (doorCount > 0 && drawerCount === 0) {
      const doorWidth = (width - (doorCount + 1) * config.doorGap) / doorCount
      const doorHeight = caseHeight - 2 * config.doorGap
      
      const doorPaths: PathPoint[][] = [generateRectPath(doorWidth, doorHeight)]
      
      if (hingeBoring && config.hingeType === 'euro') {
        const boringDiameter = 35
        const boringInset = 22.5
        const boringFromEdge = 100
        
        doorPaths.push(generateHolePath(boringInset, boringFromEdge, boringDiameter))
        doorPaths.push(generateHolePath(boringInset, doorHeight - boringFromEdge, boringDiameter))
      }

      result.push({
        id: 'door',
        name: 'Door',
        width: doorWidth,
        height: doorHeight,
        quantity: doorCount,
        material: 'Door',
        paths: doorPaths,
      })
    }

    if (drawerCount > 0) {
      const drawerBoxWidth = width - 2 * t - 26
      const drawerBoxDepth = caseDepth - 50
      const drawerFrontWidth = width - 2 * config.doorGap
      
      let currentY = config.doorGap
      const availableHeight = caseHeight - (drawerCount + 1) * config.doorGap
      const drawerHeight = availableHeight / drawerCount

      for (let i = 0; i < drawerCount; i++) {
        const frontHeight = drawerHeight
        const boxHeight = frontHeight - 25

        result.push({
          id: `drawer-front-${i}`,
          name: `Drawer Front ${i + 1}`,
          width: drawerFrontWidth,
          height: frontHeight,
          quantity: 1,
          material: 'Door',
          paths: [generateRectPath(drawerFrontWidth, frontHeight)],
        })

        result.push({
          id: `drawer-side-${i}`,
          name: `Drawer Side ${i + 1}`,
          width: drawerBoxDepth,
          height: boxHeight,
          quantity: 2,
          material: 'Drawer Box',
          paths: [generateRectPath(drawerBoxDepth, boxHeight)],
        })

        result.push({
          id: `drawer-fb-${i}`,
          name: `Drawer Front/Back ${i + 1}`,
          width: drawerBoxWidth - 2 * 12,
          height: boxHeight,
          quantity: 2,
          material: 'Drawer Box',
          paths: [generateRectPath(drawerBoxWidth - 2 * 12, boxHeight)],
        })

        result.push({
          id: `drawer-bottom-${i}`,
          name: `Drawer Bottom ${i + 1}`,
          width: drawerBoxWidth,
          height: drawerBoxDepth - 12,
          quantity: 1,
          material: 'Drawer Bottom',
          paths: [generateRectPath(drawerBoxWidth, drawerBoxDepth - 12)],
        })

        currentY += frontHeight + config.doorGap
      }
    }

    if (toeKick) {
      const toeKickWidth = width - 2 * toeKickSetback
      
      result.push({
        id: 'toe-kick',
        name: 'Toe Kick',
        width: toeKickWidth,
        height: toeKickHeight - t,
        quantity: 1,
        material: 'Primary',
        paths: [generateRectPath(toeKickWidth, toeKickHeight - t)],
      })
    }

    if (construction === 'faceframe') {
      const ffWidth = width
      const ffHeight = caseHeight
      const railWidth = 50
      const stileWidth = 50

      const ffPaths: PathPoint[][] = []
      
      ffPaths.push([
        { x: 0, y: 0, type: 'move' },
        { x: stileWidth, y: 0, type: 'line' },
        { x: stileWidth, y: ffHeight, type: 'line' },
        { x: 0, y: ffHeight, type: 'line' },
        { x: 0, y: 0, type: 'line' },
      ])
      
      ffPaths.push([
        { x: ffWidth - stileWidth, y: 0, type: 'move' },
        { x: ffWidth, y: 0, type: 'line' },
        { x: ffWidth, y: ffHeight, type: 'line' },
        { x: ffWidth - stileWidth, y: ffHeight, type: 'line' },
        { x: ffWidth - stileWidth, y: 0, type: 'line' },
      ])
      
      ffPaths.push([
        { x: stileWidth, y: 0, type: 'move' },
        { x: ffWidth - stileWidth, y: 0, type: 'line' },
        { x: ffWidth - stileWidth, y: railWidth, type: 'line' },
        { x: stileWidth, y: railWidth, type: 'line' },
        { x: stileWidth, y: 0, type: 'line' },
      ])
      
      ffPaths.push([
        { x: stileWidth, y: ffHeight - railWidth, type: 'move' },
        { x: ffWidth - stileWidth, y: ffHeight - railWidth, type: 'line' },
        { x: ffWidth - stileWidth, y: ffHeight, type: 'line' },
        { x: stileWidth, y: ffHeight, type: 'line' },
        { x: stileWidth, y: ffHeight - railWidth, type: 'line' },
      ])

      result.push({
        id: 'face-frame',
        name: 'Face Frame',
        width: ffWidth,
        height: ffHeight,
        quantity: 1,
        material: 'Face Frame',
        paths: ffPaths,
      })
    }

    return result
  }, [config, generateRectPath, generateHolePath])

  const cutList = useMemo(() => {
    const list: { name: string; width: number; height: number; qty: number; material: string }[] = []
    
    panels.forEach(panel => {
      list.push({
        name: panel.name,
        width: panel.width,
        height: panel.height,
        qty: panel.quantity,
        material: panel.material,
      })
    })
    
    return list
  }, [panels])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    let offsetX = 50
    let offsetY = 50
    const padding = 20

    panels.forEach((panel) => {
      for (let q = 0; q < panel.quantity; q++) {
        panel.paths.forEach((path, pathIndex) => {
          const translatedPath = path.map(p => ({
            ...p,
            x: p.x + offsetX,
            y: p.y + offsetY,
          }))

          addObject({
            id: crypto.randomUUID(),
            layerId,
            name: `${panel.name}${panel.quantity > 1 ? ` (${q + 1})` : ''}${pathIndex > 0 ? ' hole' : ''}`,
            visible: true,
            locked: false,
            selected: false,
            transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
            style: {
              fillColor: null,
              fillOpacity: 1,
              strokeColor: pathIndex === 0 ? '#3b82f6' : '#ef4444',
              strokeWidth: 1,
              strokeOpacity: 1,
            },
            type: 'path',
            points: translatedPath,
            closed: true,
          } as VectorPath)
        })

        offsetX += panel.width + padding
        if (offsetX > 800) {
          offsetX = 50
          offsetY += panel.height + padding
        }
      }
    })

    onClose()
  }, [project, activeLayerId, panels, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      cabinetType: 'base',
      width: 600,
      height: 720,
      depth: 560,
      materialThickness: 18,
      backPanelThickness: 6,
      construction: 'frameless',
      doorCount: 2,
      doorOverlay: 'full',
      doorGap: 3,
      shelfCount: 1,
      shelfAdjustable: true,
      shelfHoleSpacing: 32,
      drawerCount: 0,
      drawerHeights: [150],
      hingeType: 'euro',
      hingeBoring: true,
      slideType: 'undermount',
      toeKick: true,
      toeKickHeight: 100,
      toeKickSetback: 50,
    })
  }, [])

  const previewScale = useMemo(() => {
    return Math.min(1, 300 / Math.max(config.width, config.height))
  }, [config.width, config.height])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[1000px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Archive className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Cabinet Designer Pro</h2>
                <span className="text-xs bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                  Premium
                </span>
              </div>
              <p className="text-sm text-muted-foreground">Design complete cabinet systems</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="dimensions">Size</TabsTrigger>
                <TabsTrigger value="doors">Doors</TabsTrigger>
                <TabsTrigger value="hardware">Hardware</TabsTrigger>
              </TabsList>

              <TabsContent value="dimensions" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Cabinet Type</Label>
                  <Select
                    value={config.cabinetType}
                    onValueChange={(v: string) => handleTypeChange(v as CabinetConfig['cabinetType'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="base">Base Cabinet</SelectItem>
                      <SelectItem value="wall">Wall Cabinet</SelectItem>
                      <SelectItem value="tall">Tall Cabinet</SelectItem>
                      <SelectItem value="drawer">Drawer Bank</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Width</Label>
                    <Input
                      type="number"
                      value={config.width}
                      onChange={(e) => updateConfig('width', Number(e.target.value))}
                      min={150}
                      max={1200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Height</Label>
                    <Input
                      type="number"
                      value={config.height}
                      onChange={(e) => updateConfig('height', Number(e.target.value))}
                      min={300}
                      max={2400}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Depth</Label>
                    <Input
                      type="number"
                      value={config.depth}
                      onChange={(e) => updateConfig('depth', Number(e.target.value))}
                      min={200}
                      max={700}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Construction</Label>
                  <Select
                    value={config.construction}
                    onValueChange={(v: string) => updateConfig('construction', v as 'frameless' | 'faceframe')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="frameless">Frameless (Euro)</SelectItem>
                      <SelectItem value="faceframe">Face Frame</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Material (mm)</Label>
                    <Select
                      value={config.materialThickness.toString()}
                      onValueChange={(v: string) => updateConfig('materialThickness', Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12">12mm (1/2")</SelectItem>
                        <SelectItem value="15">15mm (5/8")</SelectItem>
                        <SelectItem value="18">18mm (3/4")</SelectItem>
                        <SelectItem value="19">19mm (3/4")</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Back Panel</Label>
                    <Select
                      value={config.backPanelThickness.toString()}
                      onValueChange={(v: string) => updateConfig('backPanelThickness', Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3mm (1/8")</SelectItem>
                        <SelectItem value="6">6mm (1/4")</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Toe Kick</Label>
                  <Switch
                    checked={config.toeKick}
                    onCheckedChange={(v: boolean) => updateConfig('toeKick', v)}
                  />
                </div>

                {config.toeKick && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Height</Label>
                      <Input
                        type="number"
                        value={config.toeKickHeight}
                        onChange={(e) => updateConfig('toeKickHeight', Number(e.target.value))}
                        min={50}
                        max={150}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Setback</Label>
                      <Input
                        type="number"
                        value={config.toeKickSetback}
                        onChange={(e) => updateConfig('toeKickSetback', Number(e.target.value))}
                        min={25}
                        max={100}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="doors" className="space-y-4 mt-4">
                {config.cabinetType !== 'drawer' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Door Count</Label>
                      <Select
                        value={config.doorCount.toString()}
                        onValueChange={(v: string) => updateConfig('doorCount', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Doors</SelectItem>
                          <SelectItem value="1">1 Door</SelectItem>
                          <SelectItem value="2">2 Doors</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {config.doorCount > 0 && (
                      <>
                        <div className="space-y-2">
                          <Label>Door Overlay</Label>
                          <Select
                            value={config.doorOverlay}
                            onValueChange={(v: string) => updateConfig('doorOverlay', v as 'full' | 'half' | 'inset')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="full">Full Overlay</SelectItem>
                              <SelectItem value="half">Half Overlay</SelectItem>
                              <SelectItem value="inset">Inset</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Door Gap (mm)</Label>
                          <Slider
                            value={[config.doorGap]}
                            onValueChange={([v]) => updateConfig('doorGap', v)}
                            min={2}
                            max={6}
                            step={0.5}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label>Shelf Count</Label>
                      <Select
                        value={config.shelfCount.toString()}
                        onValueChange={(v: string) => updateConfig('shelfCount', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Shelves</SelectItem>
                          <SelectItem value="1">1 Shelf</SelectItem>
                          <SelectItem value="2">2 Shelves</SelectItem>
                          <SelectItem value="3">3 Shelves</SelectItem>
                          <SelectItem value="4">4 Shelves</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Adjustable Shelves</Label>
                      <Switch
                        checked={config.shelfAdjustable}
                        onCheckedChange={(v: boolean) => updateConfig('shelfAdjustable', v)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Drawer Count</Label>
                      <Select
                        value={config.drawerCount.toString()}
                        onValueChange={(v: string) => updateConfig('drawerCount', Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Drawers</SelectItem>
                          <SelectItem value="3">3 Drawers</SelectItem>
                          <SelectItem value="4">4 Drawers</SelectItem>
                          <SelectItem value="5">5 Drawers</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Slide Type</Label>
                      <Select
                        value={config.slideType}
                        onValueChange={(v: string) => updateConfig('slideType', v as 'sidemount' | 'undermount')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sidemount">Side Mount</SelectItem>
                          <SelectItem value="undermount">Undermount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="hardware" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Hinge Type</Label>
                  <Select
                    value={config.hingeType}
                    onValueChange={(v: string) => updateConfig('hingeType', v as 'euro' | 'traditional')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="euro">Euro (Concealed)</SelectItem>
                      <SelectItem value="traditional">Traditional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.hingeType === 'euro' && (
                  <div className="flex items-center justify-between">
                    <Label>Add 35mm Hinge Boring</Label>
                    <Switch
                      checked={config.hingeBoring}
                      onCheckedChange={(v: boolean) => updateConfig('hingeBoring', v)}
                    />
                  </div>
                )}

                {config.shelfAdjustable && (
                  <div className="space-y-2">
                    <Label>Shelf Pin Spacing (mm)</Label>
                    <Select
                      value={config.shelfHoleSpacing.toString()}
                      onValueChange={(v: string) => updateConfig('shelfHoleSpacing', Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="32">32mm (Euro Standard)</SelectItem>
                        <SelectItem value="25">25mm</SelectItem>
                        <SelectItem value="50">50mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
                <Button
                  variant={showCutList ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowCutList(!showCutList)}
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Cut List
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="flex-1 bg-muted/30 overflow-auto p-4">
              {showCutList ? (
                <div className="bg-background rounded-lg border border-border p-4">
                  <h3 className="font-medium mb-4">Cut List</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Part</th>
                        <th className="text-right py-2">Width</th>
                        <th className="text-right py-2">Height</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-left py-2 pl-4">Material</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cutList.map((item, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2">{item.name}</td>
                          <td className="text-right py-2">{item.width.toFixed(0)}</td>
                          <td className="text-right py-2">{item.height.toFixed(0)}</td>
                          <td className="text-right py-2">{item.qty}</td>
                          <td className="py-2 pl-4 text-muted-foreground">{item.material}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : showPreview ? (
                <div className="flex items-center justify-center h-full">
                  <svg
                    width={config.width * previewScale + 100}
                    height={config.height * previewScale + 100}
                    viewBox={`-50 -50 ${config.width + 100} ${config.height + 100}`}
                    className="bg-background rounded-lg border border-border"
                  >
                    <rect
                      x="0"
                      y={config.toeKick ? config.toeKickHeight : 0}
                      width={config.width}
                      height={config.height - (config.toeKick ? config.toeKickHeight : 0)}
                      fill="#f5f5f4"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    
                    {config.toeKick && (
                      <rect
                        x={config.toeKickSetback}
                        y={config.height - config.toeKickHeight + config.materialThickness}
                        width={config.width - 2 * config.toeKickSetback}
                        height={config.toeKickHeight - config.materialThickness}
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                      />
                    )}
                    
                    {config.doorCount > 0 && config.cabinetType !== 'drawer' && (
                      <>
                        {Array.from({ length: config.doorCount }).map((_, i) => {
                          const doorWidth = (config.width - (config.doorCount + 1) * config.doorGap) / config.doorCount
                          const x = config.doorGap + i * (doorWidth + config.doorGap)
                          const y = (config.toeKick ? config.toeKickHeight : 0) + config.doorGap
                          const h = config.height - (config.toeKick ? config.toeKickHeight : 0) - 2 * config.doorGap
                          
                          return (
                            <rect
                              key={i}
                              x={x}
                              y={y}
                              width={doorWidth}
                              height={h}
                              fill="#e5e7eb"
                              stroke="#9ca3af"
                              strokeWidth="1"
                            />
                          )
                        })}
                      </>
                    )}
                    
                    {config.cabinetType === 'drawer' && config.drawerCount > 0 && (
                      <>
                        {Array.from({ length: config.drawerCount }).map((_, i) => {
                          const drawerHeight = (config.height - (config.toeKick ? config.toeKickHeight : 0) - (config.drawerCount + 1) * config.doorGap) / config.drawerCount
                          const y = (config.toeKick ? config.toeKickHeight : 0) + config.doorGap + i * (drawerHeight + config.doorGap)
                          
                          return (
                            <rect
                              key={i}
                              x={config.doorGap}
                              y={y}
                              width={config.width - 2 * config.doorGap}
                              height={drawerHeight}
                              fill="#e5e7eb"
                              stroke="#9ca3af"
                              strokeWidth="1"
                            />
                          )
                        })}
                      </>
                    )}
                    
                    <text x={config.width / 2} y={-20} textAnchor="middle" fontSize="12" fill="currentColor">
                      {config.width}mm
                    </text>
                    <text x={-20} y={config.height / 2} textAnchor="middle" fontSize="12" fill="currentColor" transform={`rotate(-90, -20, ${config.height / 2})`}>
                      {config.height}mm
                    </text>
                  </svg>
                </div>
              ) : null}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {config.cabinetType.charAt(0).toUpperCase() + config.cabinetType.slice(1)} Cabinet
                </span>
                <span className="text-muted-foreground">
                  {panels.length} parts, {cutList.reduce((sum, item) => sum + item.qty, 0)} pieces total
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
              Export Cut List
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

export default CabinetDesigner
