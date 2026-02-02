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
import { X, Box, RotateCcw, Download, Plus, Eye, EyeOff } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface BoxMakerProps {
  onClose: () => void
}

interface BoxConfig {
  innerWidth: number
  innerDepth: number
  innerHeight: number
  materialThickness: number
  fingerWidth: number
  fingerCount: 'auto' | number
  lidType: 'none' | 'inset' | 'sliding' | 'hinged'
  lidInset: number
  dividerCountX: number
  dividerCountY: number
  kerf: number
  cornerRadius: number
  bottomInset: boolean
  generateNested: boolean
}

interface BoxPanel {
  id: string
  name: string
  width: number
  height: number
  paths: PathPoint[][]
  color: string
}

const MATERIAL_PRESETS = [
  { label: '1/8" (3.175mm)', value: 3.175 },
  { label: '1/4" (6.35mm)', value: 6.35 },
  { label: '3/8" (9.525mm)', value: 9.525 },
  { label: '1/2" (12.7mm)', value: 12.7 },
  { label: '3/4" (19.05mm)', value: 19.05 },
  { label: '3mm', value: 3 },
  { label: '6mm', value: 6 },
  { label: '12mm', value: 12 },
  { label: '18mm', value: 18 },
]

const PANEL_COLORS: Record<string, string> = {
  front: '#ef4444',
  back: '#f97316',
  left: '#eab308',
  right: '#22c55e',
  bottom: '#3b82f6',
  top: '#8b5cf6',
  dividerX: '#ec4899',
  dividerY: '#06b6d4',
}

export function BoxMaker({ onClose }: BoxMakerProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  
  const [config, setConfig] = useState<BoxConfig>({
    innerWidth: 100,
    innerDepth: 80,
    innerHeight: 50,
    materialThickness: 6,
    fingerWidth: 12,
    fingerCount: 'auto',
    lidType: 'none',
    lidInset: 3,
    dividerCountX: 0,
    dividerCountY: 0,
    kerf: 0.1,
    cornerRadius: 0,
    bottomInset: true,
    generateNested: true,
  })

  const [showPreview, setShowPreview] = useState(true)
  const [previewMode, setPreviewMode] = useState<'flat' | '3d'>('flat')
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null)

  const updateConfig = useCallback(<K extends keyof BoxConfig>(key: K, value: BoxConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const calculateFingerCount = useCallback((length: number, fingerWidth: number): number => {
    const count = Math.floor(length / fingerWidth)
    return count % 2 === 0 ? count - 1 : count
  }, [])

  const generateRectanglePath = useCallback((
    width: number,
    height: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): PathPoint[] => {
    return [
      { x: offsetX, y: offsetY, type: 'move' },
      { x: offsetX + width, y: offsetY, type: 'line' },
      { x: offsetX + width, y: offsetY + height, type: 'line' },
      { x: offsetX, y: offsetY + height, type: 'line' },
      { x: offsetX, y: offsetY, type: 'line' },
    ]
  }, [])

  const generatePanelWithFingers = useCallback((
    width: number,
    height: number,
    thickness: number,
    fingerWidth: number,
    kerf: number,
    edges: { top: boolean; bottom: boolean; left: boolean; right: boolean }
  ): PathPoint[] => {
    const points: PathPoint[] = []
    const k = kerf / 2

    points.push({ x: 0, y: 0, type: 'move' })

    if (edges.top) {
      const count = calculateFingerCount(width, fingerWidth)
      const fw = width / count
      let x = 0
      for (let i = 0; i < count; i++) {
        const isTab = i % 2 === 0
        if (isTab) {
          points.push({ x: x + k, y: -thickness + k, type: 'line' })
          points.push({ x: x + fw - k, y: -thickness + k, type: 'line' })
          points.push({ x: x + fw - k, y: 0, type: 'line' })
        } else {
          points.push({ x: x + fw, y: 0, type: 'line' })
        }
        x += fw
      }
    } else {
      points.push({ x: width, y: 0, type: 'line' })
    }

    if (edges.right) {
      const count = calculateFingerCount(height, fingerWidth)
      const fh = height / count
      let y = 0
      for (let i = 0; i < count; i++) {
        const isTab = i % 2 === 0
        if (isTab) {
          points.push({ x: width + thickness - k, y: y + k, type: 'line' })
          points.push({ x: width + thickness - k, y: y + fh - k, type: 'line' })
          points.push({ x: width, y: y + fh, type: 'line' })
        } else {
          points.push({ x: width, y: y + fh, type: 'line' })
        }
        y += fh
      }
    } else {
      points.push({ x: width, y: height, type: 'line' })
    }

    if (edges.bottom) {
      const count = calculateFingerCount(width, fingerWidth)
      const fw = width / count
      let x = width
      for (let i = 0; i < count; i++) {
        const isTab = i % 2 === 0
        if (isTab) {
          points.push({ x: x - k, y: height + thickness - k, type: 'line' })
          points.push({ x: x - fw + k, y: height + thickness - k, type: 'line' })
          points.push({ x: x - fw + k, y: height, type: 'line' })
        } else {
          points.push({ x: x - fw, y: height, type: 'line' })
        }
        x -= fw
      }
    } else {
      points.push({ x: 0, y: height, type: 'line' })
    }

    if (edges.left) {
      const count = calculateFingerCount(height, fingerWidth)
      const fh = height / count
      let y = height
      for (let i = 0; i < count; i++) {
        const isTab = i % 2 === 0
        if (isTab) {
          points.push({ x: -thickness + k, y: y - k, type: 'line' })
          points.push({ x: -thickness + k, y: y - fh + k, type: 'line' })
          points.push({ x: 0, y: y - fh, type: 'line' })
        } else {
          points.push({ x: 0, y: y - fh, type: 'line' })
        }
        y -= fh
      }
    } else {
      points.push({ x: 0, y: 0, type: 'line' })
    }

    return points
  }, [calculateFingerCount])

  const generateSlotPath = useCallback((
    slotWidth: number,
    slotHeight: number,
    offsetX: number,
    offsetY: number,
    kerf: number
  ): PathPoint[] => {
    const k = kerf / 2
    return [
      { x: offsetX + k, y: offsetY + k, type: 'move' },
      { x: offsetX + slotWidth - k, y: offsetY + k, type: 'line' },
      { x: offsetX + slotWidth - k, y: offsetY + slotHeight - k, type: 'line' },
      { x: offsetX + k, y: offsetY + slotHeight - k, type: 'line' },
      { x: offsetX + k, y: offsetY + k, type: 'line' },
    ]
  }, [])

  const panels = useMemo((): BoxPanel[] => {
    const {
      innerWidth,
      innerDepth,
      innerHeight,
      materialThickness: t,
      fingerWidth,
      kerf,
      lidType,
      dividerCountX,
      dividerCountY,
      bottomInset,
    } = config

    const boxHeight = lidType === 'none' ? innerHeight : innerHeight

    const result: BoxPanel[] = []

    const frontBackWidth = innerWidth
    const frontBackHeight = boxHeight
    const frontPath = generatePanelWithFingers(
      frontBackWidth,
      frontBackHeight,
      t,
      fingerWidth,
      kerf,
      { top: lidType !== 'none', bottom: bottomInset, left: true, right: true }
    )
    result.push({
      id: 'front',
      name: 'Front',
      width: frontBackWidth + 2 * t,
      height: frontBackHeight + (lidType !== 'none' ? t : 0) + (bottomInset ? t : 0),
      paths: [frontPath],
      color: PANEL_COLORS.front,
    })

    result.push({
      id: 'back',
      name: 'Back',
      width: frontBackWidth + 2 * t,
      height: frontBackHeight + (lidType !== 'none' ? t : 0) + (bottomInset ? t : 0),
      paths: [frontPath],
      color: PANEL_COLORS.back,
    })

    const sideWidth = innerDepth
    const sideHeight = boxHeight
    const sidePath = generatePanelWithFingers(
      sideWidth,
      sideHeight,
      t,
      fingerWidth,
      kerf,
      { top: lidType !== 'none', bottom: bottomInset, left: false, right: false }
    )
    result.push({
      id: 'left',
      name: 'Left',
      width: sideWidth,
      height: sideHeight + (lidType !== 'none' ? t : 0) + (bottomInset ? t : 0),
      paths: [sidePath],
      color: PANEL_COLORS.left,
    })

    result.push({
      id: 'right',
      name: 'Right',
      width: sideWidth,
      height: sideHeight + (lidType !== 'none' ? t : 0) + (bottomInset ? t : 0),
      paths: [sidePath],
      color: PANEL_COLORS.right,
    })

    const bottomWidth = innerWidth
    const bottomDepth = innerDepth
    const bottomPath = bottomInset
      ? generateRectanglePath(bottomWidth, bottomDepth)
      : generatePanelWithFingers(bottomWidth, bottomDepth, t, fingerWidth, kerf, {
          top: true, bottom: true, left: true, right: true
        })
    result.push({
      id: 'bottom',
      name: 'Bottom',
      width: bottomWidth,
      height: bottomDepth,
      paths: [bottomPath],
      color: PANEL_COLORS.bottom,
    })

    if (lidType === 'inset') {
      const lidWidth = innerWidth - config.lidInset * 2
      const lidDepth = innerDepth - config.lidInset * 2
      const lidPath = generateRectanglePath(lidWidth, lidDepth)
      result.push({
        id: 'top',
        name: 'Lid (Inset)',
        width: lidWidth,
        height: lidDepth,
        paths: [lidPath],
        color: PANEL_COLORS.top,
      })
    } else if (lidType === 'sliding') {
      const lidWidth = innerWidth + t * 2 + 10
      const lidDepth = innerDepth
      const lidPath = generateRectanglePath(lidWidth, lidDepth)
      result.push({
        id: 'top',
        name: 'Lid (Sliding)',
        width: lidWidth,
        height: lidDepth,
        paths: [lidPath],
        color: PANEL_COLORS.top,
      })
    } else if (lidType === 'hinged') {
      const lidWidth = innerWidth + t * 2
      const lidDepth = innerDepth + t * 2
      const lidPath = generateRectanglePath(lidWidth, lidDepth)
      result.push({
        id: 'top',
        name: 'Lid (Hinged)',
        width: lidWidth,
        height: lidDepth,
        paths: [lidPath],
        color: PANEL_COLORS.top,
      })
    }

    if (dividerCountX > 0) {
      const dividerWidth = innerDepth
      const dividerHeight = innerHeight - t
      const slotCount = dividerCountY
      const dividerPaths: PathPoint[][] = [generateRectanglePath(dividerWidth, dividerHeight)]
      
      if (slotCount > 0) {
        const slotSpacing = dividerWidth / (slotCount + 1)
        for (let i = 0; i < slotCount; i++) {
          const slotX = slotSpacing * (i + 1) - t / 2
          dividerPaths.push(generateSlotPath(t + kerf, dividerHeight / 2, slotX, 0, kerf))
        }
      }

      for (let i = 0; i < dividerCountX; i++) {
        result.push({
          id: `dividerX-${i}`,
          name: `Divider X ${i + 1}`,
          width: dividerWidth,
          height: dividerHeight,
          paths: dividerPaths,
          color: PANEL_COLORS.dividerX,
        })
      }
    }

    if (dividerCountY > 0) {
      const dividerWidth = innerWidth
      const dividerHeight = innerHeight - t
      const slotCount = dividerCountX
      const dividerPaths: PathPoint[][] = [generateRectanglePath(dividerWidth, dividerHeight)]
      
      if (slotCount > 0) {
        const slotSpacing = dividerWidth / (slotCount + 1)
        for (let i = 0; i < slotCount; i++) {
          const slotX = slotSpacing * (i + 1) - t / 2
          dividerPaths.push(generateSlotPath(t + kerf, dividerHeight / 2, slotX, dividerHeight / 2, kerf))
        }
      }

      for (let i = 0; i < dividerCountY; i++) {
        result.push({
          id: `dividerY-${i}`,
          name: `Divider Y ${i + 1}`,
          width: dividerWidth,
          height: dividerHeight,
          paths: dividerPaths,
          color: PANEL_COLORS.dividerY,
        })
      }
    }

    return result
  }, [config, generatePanelWithFingers, generateRectanglePath, generateSlotPath])

  const nestedLayout = useMemo(() => {
    const padding = 5
    let currentX = padding
    let currentY = padding
    let rowHeight = 0
    const maxWidth = 600

    return panels.map(panel => {
      if (currentX + panel.width + padding > maxWidth) {
        currentX = padding
        currentY += rowHeight + padding
        rowHeight = 0
      }

      const position = { x: currentX, y: currentY }
      currentX += panel.width + padding
      rowHeight = Math.max(rowHeight, panel.height)

      return { ...panel, position }
    })
  }, [panels])

  const totalMaterialUsage = useMemo(() => {
    let totalArea = 0
    panels.forEach(panel => {
      totalArea += panel.width * panel.height
    })
    return totalArea
  }, [panels])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    let offsetX = 50
    let offsetY = 50

    if (config.generateNested) {
      nestedLayout.forEach((panel) => {
        panel.paths.forEach((pathPoints, pathIndex) => {
          const translatedPoints = pathPoints.map(p => ({
            ...p,
            x: p.x + panel.position.x + offsetX,
            y: p.y + panel.position.y + offsetY,
          }))

          const pathObject: VectorPath = {
            id: crypto.randomUUID(),
            layerId,
            name: `${panel.name}${pathIndex > 0 ? ` Slot ${pathIndex}` : ''}`,
            visible: true,
            locked: false,
            selected: false,
            transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
            style: {
              fillColor: null,
              fillOpacity: 1,
              strokeColor: panel.color,
              strokeWidth: 1,
              strokeOpacity: 1,
            },
            type: 'path',
            points: translatedPoints,
            closed: true,
          }

          addObject(pathObject)
        })
      })
    } else {
      panels.forEach((panel) => {
        panel.paths.forEach((pathPoints, pathIndex) => {
          const translatedPoints = pathPoints.map(p => ({
            ...p,
            x: p.x + offsetX,
            y: p.y + offsetY,
          }))

          const pathObject: VectorPath = {
            id: crypto.randomUUID(),
            layerId,
            name: `${panel.name}${pathIndex > 0 ? ` Slot ${pathIndex}` : ''}`,
            visible: true,
            locked: false,
            selected: false,
            transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
            style: {
              fillColor: null,
              fillOpacity: 1,
              strokeColor: panel.color,
              strokeWidth: 1,
              strokeOpacity: 1,
            },
            type: 'path',
            points: translatedPoints,
            closed: true,
          }

          addObject(pathObject)
        })

        offsetY += panel.height + 10
      })
    }

    onClose()
  }, [project, activeLayerId, config.generateNested, nestedLayout, panels, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      innerWidth: 100,
      innerDepth: 80,
      innerHeight: 50,
      materialThickness: 6,
      fingerWidth: 12,
      fingerCount: 'auto',
      lidType: 'none',
      lidInset: 3,
      dividerCountX: 0,
      dividerCountY: 0,
      kerf: 0.1,
      cornerRadius: 0,
      bottomInset: true,
      generateNested: true,
    })
  }, [])

  const previewScale = useMemo(() => {
    const maxDim = Math.max(
      ...nestedLayout.map(p => p.position.x + p.width),
      ...nestedLayout.map(p => p.position.y + p.height)
    )
    return Math.min(1, 400 / maxDim)
  }, [nestedLayout])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[1000px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Box Maker Classic</h2>
              <p className="text-sm text-muted-foreground">Create finger joint boxes</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-6">
            <Tabs defaultValue="dimensions" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="dimensions">Size</TabsTrigger>
                <TabsTrigger value="joints">Joints</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
              </TabsList>

              <TabsContent value="dimensions" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Inner Width (mm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.innerWidth}
                      onChange={(e) => updateConfig('innerWidth', Number(e.target.value))}
                      min={20}
                      max={1000}
                    />
                    <Slider
                      value={[config.innerWidth]}
                      onValueChange={([v]) => updateConfig('innerWidth', v)}
                      min={20}
                      max={500}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Inner Depth (mm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.innerDepth}
                      onChange={(e) => updateConfig('innerDepth', Number(e.target.value))}
                      min={20}
                      max={1000}
                    />
                    <Slider
                      value={[config.innerDepth]}
                      onValueChange={([v]) => updateConfig('innerDepth', v)}
                      min={20}
                      max={500}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Inner Height (mm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.innerHeight}
                      onChange={(e) => updateConfig('innerHeight', Number(e.target.value))}
                      min={10}
                      max={500}
                    />
                    <Slider
                      value={[config.innerHeight]}
                      onValueChange={([v]) => updateConfig('innerHeight', v)}
                      min={10}
                      max={300}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Material Thickness</Label>
                  <Select
                    value={config.materialThickness.toString()}
                    onValueChange={(v: string) => updateConfig('materialThickness', Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_PRESETS.map(preset => (
                        <SelectItem key={preset.value} value={preset.value.toString()}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={config.materialThickness}
                    onChange={(e) => updateConfig('materialThickness', Number(e.target.value))}
                    min={1}
                    max={25}
                    step={0.1}
                    className="mt-1"
                  />
                </div>
              </TabsContent>

              <TabsContent value="joints" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Finger Width (mm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.fingerWidth}
                      onChange={(e) => updateConfig('fingerWidth', Number(e.target.value))}
                      min={3}
                      max={50}
                    />
                    <Slider
                      value={[config.fingerWidth]}
                      onValueChange={([v]) => updateConfig('fingerWidth', v)}
                      min={3}
                      max={50}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Recommended: 1.5-3x material thickness
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Kerf Compensation (mm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.kerf}
                      onChange={(e) => updateConfig('kerf', Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                    <Slider
                      value={[config.kerf * 100]}
                      onValueChange={([v]) => updateConfig('kerf', v / 100)}
                      min={0}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Typical: 0.1-0.2mm for tight fit
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Inset Bottom Panel</Label>
                  <Switch
                    checked={config.bottomInset}
                    onCheckedChange={(v: boolean) => updateConfig('bottomInset', v)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="options" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Lid Type</Label>
                  <Select
                    value={config.lidType}
                    onValueChange={(v: string) => updateConfig('lidType', v as BoxConfig['lidType'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Lid</SelectItem>
                      <SelectItem value="inset">Inset Lid</SelectItem>
                      <SelectItem value="sliding">Sliding Lid</SelectItem>
                      <SelectItem value="hinged">Hinged Lid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.lidType === 'inset' && (
                  <div className="space-y-2">
                    <Label>Lid Inset (mm)</Label>
                    <Input
                      type="number"
                      value={config.lidInset}
                      onChange={(e) => updateConfig('lidInset', Number(e.target.value))}
                      min={1}
                      max={10}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Dividers (Width Direction)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.dividerCountX}
                      onChange={(e) => updateConfig('dividerCountX', Number(e.target.value))}
                      min={0}
                      max={10}
                    />
                    <Slider
                      value={[config.dividerCountX]}
                      onValueChange={([v]) => updateConfig('dividerCountX', v)}
                      min={0}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Dividers (Depth Direction)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.dividerCountY}
                      onChange={(e) => updateConfig('dividerCountY', Number(e.target.value))}
                      min={0}
                      max={10}
                    />
                    <Slider
                      value={[config.dividerCountY]}
                      onValueChange={([v]) => updateConfig('dividerCountY', v)}
                      min={0}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Generate Nested Layout</Label>
                  <Switch
                    checked={config.generateNested}
                    onCheckedChange={(v: boolean) => updateConfig('generateNested', v)}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Panels:</span>
                <span className="font-medium">{panels.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Material Area:</span>
                <span className="font-medium">{(totalMaterialUsage / 100).toFixed(1)} cm²</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outer Size:</span>
                <span className="font-medium">
                  {config.innerWidth + 2 * config.materialThickness} × {config.innerDepth + 2 * config.materialThickness} × {config.innerHeight} mm
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
                <div className="flex rounded-md border border-border overflow-hidden">
                  <Button
                    variant={previewMode === 'flat' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-0"
                    onClick={() => setPreviewMode('flat')}
                  >
                    Flat
                  </Button>
                  <Button
                    variant={previewMode === '3d' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-0"
                    onClick={() => setPreviewMode('3d')}
                  >
                    3D
                  </Button>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="flex-1 bg-muted/30 overflow-auto p-4">
              {showPreview && previewMode === 'flat' && (
                <svg
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${600} ${400}`}
                  className="bg-background rounded-lg border border-border"
                >
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                  
                  <g transform={`scale(${previewScale})`}>
                    {nestedLayout.map((panel) => (
                      <g
                        key={panel.id}
                        transform={`translate(${panel.position.x}, ${panel.position.y})`}
                        onClick={() => setSelectedPanel(panel.id)}
                        className="cursor-pointer"
                      >
                        {panel.paths.map((path, pathIndex) => (
                          <path
                            key={pathIndex}
                            d={path.map((p, i) => 
                              `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                            ).join(' ') + ' Z'}
                            fill={selectedPanel === panel.id ? `${panel.color}20` : 'none'}
                            stroke={panel.color}
                            strokeWidth={selectedPanel === panel.id ? 2 : 1}
                          />
                        ))}
                        <text
                          x={panel.width / 2}
                          y={panel.height / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="10"
                          fill={panel.color}
                          className="pointer-events-none"
                        >
                          {panel.name}
                        </text>
                      </g>
                    ))}
                  </g>
                </svg>
              )}

              {showPreview && previewMode === '3d' && (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    width="400"
                    height="300"
                    viewBox="-50 -50 200 150"
                    className="bg-background rounded-lg border border-border"
                  >
                    <g transform="skewY(-15) skewX(-15)">
                      <rect
                        x="0"
                        y="0"
                        width={config.innerWidth * 0.3}
                        height={config.innerDepth * 0.3}
                        fill={PANEL_COLORS.bottom}
                        fillOpacity="0.3"
                        stroke={PANEL_COLORS.bottom}
                        strokeWidth="1"
                      />
                      
                      <rect
                        x="0"
                        y={-config.innerHeight * 0.3}
                        width={config.innerWidth * 0.3}
                        height={config.innerHeight * 0.3}
                        fill={PANEL_COLORS.front}
                        fillOpacity="0.3"
                        stroke={PANEL_COLORS.front}
                        strokeWidth="1"
                      />
                      
                      <rect
                        x={config.innerWidth * 0.3}
                        y={-config.innerHeight * 0.3}
                        width={config.innerDepth * 0.15}
                        height={config.innerHeight * 0.3}
                        fill={PANEL_COLORS.right}
                        fillOpacity="0.3"
                        stroke={PANEL_COLORS.right}
                        strokeWidth="1"
                        transform={`skewY(30)`}
                      />
                    </g>
                    
                    <text x="50" y="120" textAnchor="middle" fontSize="10" fill="currentColor">
                      {config.innerWidth} × {config.innerDepth} × {config.innerHeight} mm
                    </text>
                  </svg>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex flex-wrap gap-2 mb-3">
                {panels.map(panel => (
                  <div
                    key={panel.id}
                    className={`px-2 py-1 rounded text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                      selectedPanel === panel.id ? 'ring-2 ring-primary' : ''
                    }`}
                    style={{ backgroundColor: `${panel.color}20`, color: panel.color }}
                    onClick={() => setSelectedPanel(panel.id === selectedPanel ? null : panel.id)}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: panel.color }} />
                    {panel.name}
                  </div>
                ))}
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

export default BoxMaker
