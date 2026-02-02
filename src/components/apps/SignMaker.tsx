import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
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
import { X, Type, RotateCcw, Download, Plus, Eye, EyeOff, AlignCenter, AlignLeft, AlignRight } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint, TextObject } from '@/types/design'

interface SignMakerProps {
  onClose: () => void
}

interface SignConfig {
  text: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  letterSpacing: number
  lineHeight: number
  width: number
  height: number
  borderStyle: 'none' | 'simple' | 'double' | 'rounded' | 'decorative'
  borderWidth: number
  borderRadius: number
  borderPadding: number
  mountingHoles: boolean
  holeCount: 2 | 4
  holeDiameter: number
  holeInset: number
  carvingStyle: 'outline' | 'pocket' | 'vcarve'
}

const FONT_PRESETS = [
  { value: 'serif', label: 'Serif', family: 'Georgia, serif' },
  { value: 'sans-serif', label: 'Sans Serif', family: 'Arial, sans-serif' },
  { value: 'script', label: 'Script', family: 'Brush Script MT, cursive' },
  { value: 'display', label: 'Display', family: 'Impact, sans-serif' },
  { value: 'monospace', label: 'Monospace', family: 'Courier New, monospace' },
]

const SIZE_PRESETS = [
  { label: '6" × 24" (152 × 610mm)', width: 610, height: 152 },
  { label: '12" × 12" (305 × 305mm)', width: 305, height: 305 },
  { label: '18" × 24" (457 × 610mm)', width: 610, height: 457 },
  { label: '24" × 36" (610 × 914mm)', width: 914, height: 610 },
  { label: 'Custom', width: 0, height: 0 },
]

export function SignMaker({ onClose }: SignMakerProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  const textMeasureRef = useRef<SVGTextElement>(null)
  
  const [config, setConfig] = useState<SignConfig>({
    text: 'Welcome',
    fontFamily: 'serif',
    fontSize: 48,
    fontWeight: 'normal',
    textAlign: 'center',
    letterSpacing: 0,
    lineHeight: 1.2,
    width: 300,
    height: 100,
    borderStyle: 'simple',
    borderWidth: 3,
    borderRadius: 0,
    borderPadding: 15,
    mountingHoles: true,
    holeCount: 2,
    holeDiameter: 6,
    holeInset: 15,
    carvingStyle: 'vcarve',
  })

  const [showPreview, setShowPreview] = useState(true)
  const [textBounds, setTextBounds] = useState({ width: 0, height: 0 })

  const updateConfig = useCallback(<K extends keyof SignConfig>(key: K, value: SignConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const fontStyle = useMemo(() => {
    const preset = FONT_PRESETS.find(f => f.value === config.fontFamily)
    return preset?.family || 'serif'
  }, [config.fontFamily])

  useEffect(() => {
    if (textMeasureRef.current) {
      const bbox = textMeasureRef.current.getBBox()
      setTextBounds({ width: bbox.width, height: bbox.height })
    }
  }, [config.text, config.fontSize, config.fontFamily, config.fontWeight, config.letterSpacing])

  const generateBorderPath = useCallback((): PathPoint[] => {
    const { width, height, borderStyle, borderRadius, borderWidth } = config
    
    if (borderStyle === 'none') return []
    
    const r = Math.min(borderRadius, width / 2, height / 2)
    
    if (borderStyle === 'rounded' || r > 0) {
      return [
        { x: r, y: 0, type: 'move' },
        { x: width - r, y: 0, type: 'line' },
        { x: width, y: 0, type: 'curve', handleIn: { x: width - r, y: 0 }, handleOut: { x: width, y: r } },
        { x: width, y: r, type: 'line' },
        { x: width, y: height - r, type: 'line' },
        { x: width, y: height, type: 'curve', handleIn: { x: width, y: height - r }, handleOut: { x: width - r, y: height } },
        { x: width - r, y: height, type: 'line' },
        { x: r, y: height, type: 'line' },
        { x: 0, y: height, type: 'curve', handleIn: { x: r, y: height }, handleOut: { x: 0, y: height - r } },
        { x: 0, y: height - r, type: 'line' },
        { x: 0, y: r, type: 'line' },
        { x: 0, y: 0, type: 'curve', handleIn: { x: 0, y: r }, handleOut: { x: r, y: 0 } },
        { x: r, y: 0, type: 'line' },
      ]
    }
    
    return [
      { x: 0, y: 0, type: 'move' },
      { x: width, y: 0, type: 'line' },
      { x: width, y: height, type: 'line' },
      { x: 0, y: height, type: 'line' },
      { x: 0, y: 0, type: 'line' },
    ]
  }, [config])

  const generateDoubleBorderPath = useCallback((): PathPoint[] | null => {
    if (config.borderStyle !== 'double') return null
    
    const { width, height, borderWidth } = config
    const inset = borderWidth * 2
    
    return [
      { x: inset, y: inset, type: 'move' },
      { x: width - inset, y: inset, type: 'line' },
      { x: width - inset, y: height - inset, type: 'line' },
      { x: inset, y: height - inset, type: 'line' },
      { x: inset, y: inset, type: 'line' },
    ]
  }, [config])

  const generateDecorativeBorder = useCallback((): PathPoint[][] => {
    if (config.borderStyle !== 'decorative') return []
    
    const { width, height, borderWidth } = config
    const paths: PathPoint[][] = []
    
    paths.push([
      { x: 0, y: 0, type: 'move' },
      { x: width, y: 0, type: 'line' },
      { x: width, y: height, type: 'line' },
      { x: 0, y: height, type: 'line' },
      { x: 0, y: 0, type: 'line' },
    ])
    
    const cornerSize = 15
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ]
    
    corners.forEach((corner, i) => {
      const dx = i === 0 || i === 3 ? 1 : -1
      const dy = i === 0 || i === 1 ? 1 : -1
      
      paths.push([
        { x: corner.x, y: corner.y + dy * cornerSize, type: 'move' },
        { x: corner.x + dx * cornerSize * 0.3, y: corner.y + dy * cornerSize * 0.3, type: 'line' },
        { x: corner.x + dx * cornerSize, y: corner.y, type: 'line' },
      ])
    })
    
    return paths
  }, [config])

  const generateMountingHoles = useCallback((): PathPoint[][] => {
    if (!config.mountingHoles) return []
    
    const { width, height, holeCount, holeDiameter, holeInset } = config
    const radius = holeDiameter / 2
    const holes: PathPoint[][] = []
    
    const generateCircle = (cx: number, cy: number): PathPoint[] => {
      const points: PathPoint[] = []
      const segments = 24
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        points.push({
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          type: i === 0 ? 'move' : 'line',
        })
      }
      return points
    }
    
    if (holeCount === 2) {
      holes.push(generateCircle(holeInset, height / 2))
      holes.push(generateCircle(width - holeInset, height / 2))
    } else {
      holes.push(generateCircle(holeInset, holeInset))
      holes.push(generateCircle(width - holeInset, holeInset))
      holes.push(generateCircle(holeInset, height - holeInset))
      holes.push(generateCircle(width - holeInset, height - holeInset))
    }
    
    return holes
  }, [config])

  const textPosition = useMemo(() => {
    const { width, height, textAlign, borderPadding } = config
    
    let x: number
    if (textAlign === 'left') {
      x = borderPadding
    } else if (textAlign === 'right') {
      x = width - borderPadding
    } else {
      x = width / 2
    }
    
    const y = height / 2
    
    return { x, y }
  }, [config])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    const borderPath = generateBorderPath()
    if (borderPath.length > 0) {
      const translatedBorder = borderPath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: 'Sign Border',
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#3b82f6',
          strokeWidth: config.borderWidth,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedBorder,
        closed: true,
      } as VectorPath)
    }

    const doubleBorder = generateDoubleBorderPath()
    if (doubleBorder) {
      const translatedDouble = doubleBorder.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: 'Sign Border Inner',
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#3b82f6',
          strokeWidth: config.borderWidth,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedDouble,
        closed: true,
      } as VectorPath)
    }

    const decorativePaths = generateDecorativeBorder()
    decorativePaths.forEach((path, i) => {
      const translatedPath = path.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: i === 0 ? 'Sign Border' : `Corner Detail ${i}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#3b82f6',
          strokeWidth: config.borderWidth,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedPath,
        closed: i === 0,
      } as VectorPath)
    })

    const holes = generateMountingHoles()
    holes.forEach((hole, i) => {
      const translatedHole = hole.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: `Mounting Hole ${i + 1}`,
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
        points: translatedHole,
        closed: true,
      } as VectorPath)
    })

    const textObject: TextObject = {
      id: crypto.randomUUID(),
      layerId,
      name: 'Sign Text',
      visible: true,
      locked: false,
      selected: false,
      transform: { 
        x: offsetX + textPosition.x, 
        y: offsetY + textPosition.y, 
        rotation: 0, 
        scaleX: 1, 
        scaleY: 1 
      },
      style: {
        fillColor: '#000000',
        fillOpacity: 1,
        strokeColor: null,
        strokeWidth: 0,
        strokeOpacity: 1,
      },
      type: 'text',
      content: config.text,
      fontFamily: fontStyle,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      fontStyle: 'normal',
      textAlign: config.textAlign,
      letterSpacing: config.letterSpacing,
      lineHeight: config.lineHeight,
      convertedToPath: false,
    }

    addObject(textObject)

    onClose()
  }, [project, activeLayerId, config, fontStyle, textPosition, generateBorderPath, generateDoubleBorderPath, generateDecorativeBorder, generateMountingHoles, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      text: 'Welcome',
      fontFamily: 'serif',
      fontSize: 48,
      fontWeight: 'normal',
      textAlign: 'center',
      letterSpacing: 0,
      lineHeight: 1.2,
      width: 300,
      height: 100,
      borderStyle: 'simple',
      borderWidth: 3,
      borderRadius: 0,
      borderPadding: 15,
      mountingHoles: true,
      holeCount: 2,
      holeDiameter: 6,
      holeInset: 15,
      carvingStyle: 'vcarve',
    })
  }, [])

  const handleSizePreset = useCallback((preset: typeof SIZE_PRESETS[0]) => {
    if (preset.width > 0) {
      updateConfig('width', preset.width)
      updateConfig('height', preset.height)
    }
  }, [updateConfig])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map((p) => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      if (p.type === 'curve' && p.handleIn && p.handleOut) {
        return `Q ${p.handleIn.x} ${p.handleIn.y} ${p.x} ${p.y}`
      }
      return `L ${p.x} ${p.y}`
    }).join(' ')
  }, [])

  const previewScale = useMemo(() => {
    return Math.min(1, 400 / Math.max(config.width, config.height))
  }, [config.width, config.height])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[950px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Type className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Sign Maker</h2>
              <p className="text-sm text-muted-foreground">Create custom signs with text and borders</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="size">Size</TabsTrigger>
                <TabsTrigger value="border">Border</TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Sign Text</Label>
                  <Input
                    value={config.text}
                    onChange={(e) => updateConfig('text', e.target.value)}
                    placeholder="Enter sign text..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Font</Label>
                  <Select
                    value={config.fontFamily}
                    onValueChange={(v: string) => updateConfig('fontFamily', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_PRESETS.map(font => (
                        <SelectItem key={font.value} value={font.value}>
                          <span style={{ fontFamily: font.family }}>{font.label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Size (mm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.fontSize}
                      onChange={(e) => updateConfig('fontSize', Number(e.target.value))}
                      min={10}
                      max={200}
                      className="w-20"
                    />
                    <Slider
                      value={[config.fontSize]}
                      onValueChange={([v]) => updateConfig('fontSize', v)}
                      min={10}
                      max={150}
                      step={1}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Font Weight</Label>
                  <Select
                    value={config.fontWeight}
                    onValueChange={(v: string) => updateConfig('fontWeight', v as 'normal' | 'bold')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Text Alignment</Label>
                  <div className="flex gap-1">
                    <Button
                      variant={config.textAlign === 'left' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateConfig('textAlign', 'left')}
                    >
                      <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={config.textAlign === 'center' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateConfig('textAlign', 'center')}
                    >
                      <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={config.textAlign === 'right' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateConfig('textAlign', 'right')}
                    >
                      <AlignRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Letter Spacing</Label>
                  <Slider
                    value={[config.letterSpacing]}
                    onValueChange={([v]) => updateConfig('letterSpacing', v)}
                    min={-5}
                    max={20}
                    step={0.5}
                  />
                </div>
              </TabsContent>

              <TabsContent value="size" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Size Presets</Label>
                  <div className="grid grid-cols-1 gap-1">
                    {SIZE_PRESETS.slice(0, -1).map(preset => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        className="justify-start text-xs"
                        onClick={() => handleSizePreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={config.width}
                      onChange={(e) => updateConfig('width', Number(e.target.value))}
                      min={50}
                      max={1200}
                      className="w-20"
                    />
                    <Slider
                      value={[config.width]}
                      onValueChange={([v]) => updateConfig('width', v)}
                      min={50}
                      max={1000}
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
                      min={25}
                      max={600}
                      className="w-20"
                    />
                    <Slider
                      value={[config.height]}
                      onValueChange={([v]) => updateConfig('height', v)}
                      min={25}
                      max={500}
                      step={10}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Border Padding (mm)</Label>
                  <Slider
                    value={[config.borderPadding]}
                    onValueChange={([v]) => updateConfig('borderPadding', v)}
                    min={5}
                    max={50}
                    step={1}
                  />
                </div>
              </TabsContent>

              <TabsContent value="border" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Border Style</Label>
                  <Select
                    value={config.borderStyle}
                    onValueChange={(v: string) => updateConfig('borderStyle', v as SignConfig['borderStyle'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="double">Double Line</SelectItem>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="decorative">Decorative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.borderStyle !== 'none' && (
                  <>
                    <div className="space-y-2">
                      <Label>Border Width (mm)</Label>
                      <Slider
                        value={[config.borderWidth]}
                        onValueChange={([v]) => updateConfig('borderWidth', v)}
                        min={1}
                        max={10}
                        step={0.5}
                      />
                    </div>

                    {config.borderStyle === 'rounded' && (
                      <div className="space-y-2">
                        <Label>Corner Radius (mm)</Label>
                        <Slider
                          value={[config.borderRadius]}
                          onValueChange={([v]) => updateConfig('borderRadius', v)}
                          min={0}
                          max={50}
                          step={1}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="pt-4 border-t border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Mounting Holes</Label>
                    <Switch
                      checked={config.mountingHoles}
                      onCheckedChange={(v: boolean) => updateConfig('mountingHoles', v)}
                    />
                  </div>

                  {config.mountingHoles && (
                    <>
                      <div className="space-y-2">
                        <Label>Hole Count</Label>
                        <Select
                          value={config.holeCount.toString()}
                          onValueChange={(v: string) => updateConfig('holeCount', Number(v) as 2 | 4)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Holes (sides)</SelectItem>
                            <SelectItem value="4">4 Holes (corners)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Hole Diameter (mm)</Label>
                        <Input
                          type="number"
                          value={config.holeDiameter}
                          onChange={(e) => updateConfig('holeDiameter', Number(e.target.value))}
                          min={3}
                          max={15}
                          step={0.5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Hole Inset (mm)</Label>
                        <Slider
                          value={[config.holeInset]}
                          onValueChange={([v]) => updateConfig('holeInset', v)}
                          min={10}
                          max={50}
                          step={1}
                        />
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
                  width={config.width * previewScale + 40}
                  height={config.height * previewScale + 40}
                  viewBox={`-20 -20 ${config.width + 40} ${config.height + 40}`}
                  className="bg-background rounded-lg border border-border"
                >
                  <defs>
                    <pattern id="signGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                    </pattern>
                  </defs>
                  <rect x="-20" y="-20" width={config.width + 40} height={config.height + 40} fill="url(#signGrid)" />
                  
                  {config.borderStyle !== 'none' && config.borderStyle !== 'decorative' && (
                    <path
                      d={pathToSvg(generateBorderPath()) + ' Z'}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={config.borderWidth}
                    />
                  )}
                  
                  {generateDoubleBorderPath() && (
                    <path
                      d={pathToSvg(generateDoubleBorderPath()!) + ' Z'}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={config.borderWidth}
                    />
                  )}
                  
                  {generateDecorativeBorder().map((path, i) => (
                    <path
                      key={i}
                      d={pathToSvg(path) + (i === 0 ? ' Z' : '')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={config.borderWidth}
                    />
                  ))}
                  
                  {generateMountingHoles().map((hole, i) => (
                    <path
                      key={i}
                      d={pathToSvg(hole) + ' Z'}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth={1}
                    />
                  ))}
                  
                  <text
                    ref={textMeasureRef}
                    x={textPosition.x}
                    y={textPosition.y}
                    textAnchor={config.textAlign === 'left' ? 'start' : config.textAlign === 'right' ? 'end' : 'middle'}
                    dominantBaseline="middle"
                    fontFamily={fontStyle}
                    fontSize={config.fontSize}
                    fontWeight={config.fontWeight}
                    letterSpacing={config.letterSpacing}
                    fill="#000"
                  >
                    {config.text}
                  </text>
                </svg>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Size: {config.width} × {config.height} mm
                </span>
                <span className="text-muted-foreground">
                  {config.mountingHoles ? `${config.holeCount} mounting holes` : 'No mounting holes'}
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
            <Button onClick={handleAddToCanvas} disabled={!project || !config.text.trim()}>
              <Plus className="w-4 h-4 mr-1" />
              Add to Canvas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignMaker
