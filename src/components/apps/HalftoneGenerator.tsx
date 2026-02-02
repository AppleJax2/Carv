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
import { X, Circle, RotateCcw, Download, Plus, Eye, EyeOff, Upload, Loader2 } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface HalftoneGeneratorProps {
  onClose: () => void
}

interface HalftoneConfig {
  dotShape: 'circle' | 'square' | 'diamond' | 'line' | 'cross' | 'hexagon'
  gridType: 'square' | 'hexagonal' | 'random'
  outputWidth: number
  outputHeight: number
  dotSpacing: number
  minDotSize: number
  maxDotSize: number
  angle: number
  invert: boolean
  contrast: number
  brightness: number
  threshold: number
  // For line mode
  lineAngle: number
  // Border
  includeBorder: boolean
}

interface DotData {
  x: number
  y: number
  size: number
  brightness: number
}

export function HalftoneGenerator({ onClose }: HalftoneGeneratorProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [config, setConfig] = useState<HalftoneConfig>({
    dotShape: 'circle',
    gridType: 'square',
    outputWidth: 200,
    outputHeight: 200,
    dotSpacing: 5,
    minDotSize: 0.5,
    maxDotSize: 4,
    angle: 0,
    invert: false,
    contrast: 1,
    brightness: 0,
    threshold: 0,
    lineAngle: 45,
    includeBorder: true,
  })

  const [imageData, setImageData] = useState<{
    src: string
    width: number
    height: number
    data: ImageData | null
  } | null>(null)

  const [isProcessing, setIsProcessing] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  const updateConfig = useCallback(<K extends keyof HalftoneConfig>(key: K, value: HalftoneConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) {
          setIsProcessing(false)
          return
        }

        // Scale image to reasonable size for processing
        const maxDim = 500
        let w = img.width
        let h = img.height
        if (w > maxDim || h > maxDim) {
          const scale = maxDim / Math.max(w, h)
          w = Math.floor(w * scale)
          h = Math.floor(h * scale)
        }

        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setIsProcessing(false)
          return
        }

        ctx.drawImage(img, 0, 0, w, h)
        const data = ctx.getImageData(0, 0, w, h)

        // Update output dimensions to match aspect ratio
        const aspectRatio = w / h
        const newHeight = Math.round(config.outputWidth / aspectRatio)

        setImageData({
          src: event.target?.result as string,
          width: w,
          height: h,
          data,
        })

        updateConfig('outputHeight', newHeight)
        setIsProcessing(false)
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [config.outputWidth, updateConfig])

  // Get brightness at a point in the image
  const getBrightness = useCallback((x: number, y: number): number => {
    if (!imageData?.data) return 1

    const imgX = Math.floor((x / config.outputWidth) * imageData.width)
    const imgY = Math.floor((y / config.outputHeight) * imageData.height)

    if (imgX < 0 || imgX >= imageData.width || imgY < 0 || imgY >= imageData.height) {
      return 1
    }

    const idx = (imgY * imageData.width + imgX) * 4
    const r = imageData.data.data[idx]
    const g = imageData.data.data[idx + 1]
    const b = imageData.data.data[idx + 2]

    // Convert to grayscale using luminance formula
    let brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    // Apply contrast and brightness adjustments
    brightness = (brightness - 0.5) * config.contrast + 0.5 + config.brightness

    // Clamp
    brightness = Math.max(0, Math.min(1, brightness))

    // Apply threshold
    if (config.threshold > 0) {
      brightness = brightness > config.threshold ? 1 : 0
    }

    // Invert if needed
    if (config.invert) {
      brightness = 1 - brightness
    }

    return brightness
  }, [imageData, config])

  // Generate dot data
  const dots = useMemo((): DotData[] => {
    if (!imageData?.data) return []

    const result: DotData[] = []
    const { outputWidth, outputHeight, dotSpacing, gridType, angle } = config
    const angleRad = (angle * Math.PI) / 180

    if (gridType === 'square') {
      const cols = Math.ceil(outputWidth / dotSpacing)
      const rows = Math.ceil(outputHeight / dotSpacing)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let x = col * dotSpacing + dotSpacing / 2
          let y = row * dotSpacing + dotSpacing / 2

          // Apply rotation around center
          if (angle !== 0) {
            const cx = outputWidth / 2
            const cy = outputHeight / 2
            const dx = x - cx
            const dy = y - cy
            x = cx + dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
            y = cy + dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
          }

          if (x >= 0 && x <= outputWidth && y >= 0 && y <= outputHeight) {
            const brightness = getBrightness(x, y)
            result.push({ x, y, size: 0, brightness })
          }
        }
      }
    } else if (gridType === 'hexagonal') {
      const cols = Math.ceil(outputWidth / dotSpacing) + 1
      const rowSpacing = dotSpacing * Math.sqrt(3) / 2
      const rows = Math.ceil(outputHeight / rowSpacing) + 1

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let x = col * dotSpacing + (row % 2 === 1 ? dotSpacing / 2 : 0)
          let y = row * rowSpacing

          if (angle !== 0) {
            const cx = outputWidth / 2
            const cy = outputHeight / 2
            const dx = x - cx
            const dy = y - cy
            x = cx + dx * Math.cos(angleRad) - dy * Math.sin(angleRad)
            y = cy + dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
          }

          if (x >= 0 && x <= outputWidth && y >= 0 && y <= outputHeight) {
            const brightness = getBrightness(x, y)
            result.push({ x, y, size: 0, brightness })
          }
        }
      }
    } else if (gridType === 'random') {
      const numDots = Math.floor((outputWidth * outputHeight) / (dotSpacing * dotSpacing))

      for (let i = 0; i < numDots; i++) {
        const x = Math.random() * outputWidth
        const y = Math.random() * outputHeight
        const brightness = getBrightness(x, y)
        result.push({ x, y, size: 0, brightness })
      }
    }

    // Calculate dot sizes based on brightness
    const { minDotSize, maxDotSize } = config
    result.forEach(dot => {
      // Darker = larger dot
      dot.size = minDotSize + (1 - dot.brightness) * (maxDotSize - minDotSize)
    })

    return result
  }, [imageData, config, getBrightness])

  // Generate shape path for a dot
  const generateDotPath = useCallback((dot: DotData): PathPoint[] => {
    const { x, y, size } = dot
    const { dotShape } = config

    if (size < 0.1) return [] // Skip very small dots

    const points: PathPoint[] = []
    const r = size / 2

    switch (dotShape) {
      case 'circle': {
        const segments = Math.max(8, Math.floor(size * 4))
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2
          points.push({
            x: x + Math.cos(angle) * r,
            y: y + Math.sin(angle) * r,
            type: i === 0 ? 'move' : 'line',
          })
        }
        break
      }

      case 'square':
        points.push({ x: x - r, y: y - r, type: 'move' })
        points.push({ x: x + r, y: y - r, type: 'line' })
        points.push({ x: x + r, y: y + r, type: 'line' })
        points.push({ x: x - r, y: y + r, type: 'line' })
        points.push({ x: x - r, y: y - r, type: 'line' })
        break

      case 'diamond':
        points.push({ x: x, y: y - r, type: 'move' })
        points.push({ x: x + r, y: y, type: 'line' })
        points.push({ x: x, y: y + r, type: 'line' })
        points.push({ x: x - r, y: y, type: 'line' })
        points.push({ x: x, y: y - r, type: 'line' })
        break

      case 'hexagon': {
        for (let i = 0; i <= 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
          points.push({
            x: x + Math.cos(angle) * r,
            y: y + Math.sin(angle) * r,
            type: i === 0 ? 'move' : 'line',
          })
        }
        break
      }

      case 'cross': {
        const arm = r * 0.3
        points.push({ x: x - arm, y: y - r, type: 'move' })
        points.push({ x: x + arm, y: y - r, type: 'line' })
        points.push({ x: x + arm, y: y - arm, type: 'line' })
        points.push({ x: x + r, y: y - arm, type: 'line' })
        points.push({ x: x + r, y: y + arm, type: 'line' })
        points.push({ x: x + arm, y: y + arm, type: 'line' })
        points.push({ x: x + arm, y: y + r, type: 'line' })
        points.push({ x: x - arm, y: y + r, type: 'line' })
        points.push({ x: x - arm, y: y + arm, type: 'line' })
        points.push({ x: x - r, y: y + arm, type: 'line' })
        points.push({ x: x - r, y: y - arm, type: 'line' })
        points.push({ x: x - arm, y: y - arm, type: 'line' })
        points.push({ x: x - arm, y: y - r, type: 'line' })
        break
      }

      case 'line': {
        const lineAngleRad = (config.lineAngle * Math.PI) / 180
        const dx = Math.cos(lineAngleRad) * r
        const dy = Math.sin(lineAngleRad) * r
        points.push({ x: x - dx, y: y - dy, type: 'move' })
        points.push({ x: x + dx, y: y + dy, type: 'line' })
        break
      }
    }

    return points
  }, [config])

  // Generate all dot paths
  const dotPaths = useMemo((): PathPoint[][] => {
    return dots.map(dot => generateDotPath(dot)).filter(p => p.length > 0)
  }, [dots, generateDotPath])

  const handleAddToCanvas = useCallback(() => {
    if (!project || dotPaths.length === 0) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    // Add border
    if (config.includeBorder) {
      const borderPath: PathPoint[] = [
        { x: offsetX, y: offsetY, type: 'move' },
        { x: offsetX + config.outputWidth, y: offsetY, type: 'line' },
        { x: offsetX + config.outputWidth, y: offsetY + config.outputHeight, type: 'line' },
        { x: offsetX, y: offsetY + config.outputHeight, type: 'line' },
        { x: offsetX, y: offsetY, type: 'line' },
      ]

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: 'Halftone Border',
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
        points: borderPath,
        closed: true,
      } as VectorPath)
    }

    // Add dots (batch into groups for performance)
    const batchSize = 100
    for (let i = 0; i < dotPaths.length; i += batchSize) {
      const batch = dotPaths.slice(i, i + batchSize)

      batch.forEach((dotPath, idx) => {
        const translatedPath = dotPath.map(p => ({
          ...p,
          x: p.x + offsetX,
          y: p.y + offsetY,
        }))

        addObject({
          id: crypto.randomUUID(),
          layerId,
          name: `Halftone Dot ${i + idx + 1}`,
          visible: true,
          locked: false,
          selected: false,
          transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
          style: {
            fillColor: '#000000',
            fillOpacity: 1,
            strokeColor: null,
            strokeWidth: 0,
            strokeOpacity: 0,
          },
          type: 'path',
          points: translatedPath,
          closed: config.dotShape !== 'line',
        } as VectorPath)
      })
    }

    onClose()
  }, [project, activeLayerId, dotPaths, config, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      dotShape: 'circle',
      gridType: 'square',
      outputWidth: 200,
      outputHeight: 200,
      dotSpacing: 5,
      minDotSize: 0.5,
      maxDotSize: 4,
      angle: 0,
      invert: false,
      contrast: 1,
      brightness: 0,
      threshold: 0,
      lineAngle: 45,
      includeBorder: true,
    })
    setImageData(null)
  }, [])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map(p => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      return `L ${p.x} ${p.y}`
    }).join(' ') + (config.dotShape !== 'line' ? ' Z' : '')
  }, [config.dotShape])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[1000px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Circle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Halftone Generator</h2>
              <p className="text-sm text-muted-foreground">Convert images to CNC-ready halftone patterns</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Image</h3>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {imageData ? 'Change Image' : 'Upload Image'}
              </Button>

              {imageData && (
                <div className="text-xs text-muted-foreground">
                  Source: {imageData.width} × {imageData.height} px
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Output Size</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={config.outputWidth}
                    onChange={(e) => updateConfig('outputWidth', Number(e.target.value))}
                    min={50}
                    max={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (mm)</Label>
                  <Input
                    type="number"
                    value={config.outputHeight}
                    onChange={(e) => updateConfig('outputHeight', Number(e.target.value))}
                    min={50}
                    max={500}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Dot Pattern</h3>

              <div className="space-y-2">
                <Label>Dot Shape</Label>
                <Select
                  value={config.dotShape}
                  onValueChange={(v: string) => updateConfig('dotShape', v as HalftoneConfig['dotShape'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle">Circle</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="diamond">Diamond</SelectItem>
                    <SelectItem value="hexagon">Hexagon</SelectItem>
                    <SelectItem value="cross">Cross</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grid Type</Label>
                <Select
                  value={config.gridType}
                  onValueChange={(v: string) => updateConfig('gridType', v as HalftoneConfig['gridType'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square Grid</SelectItem>
                    <SelectItem value="hexagonal">Hexagonal Grid</SelectItem>
                    <SelectItem value="random">Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Dot Spacing</Label>
                  <span className="text-xs text-muted-foreground">{config.dotSpacing}mm</span>
                </div>
                <Slider
                  value={[config.dotSpacing]}
                  onValueChange={([v]) => updateConfig('dotSpacing', v)}
                  min={2}
                  max={15}
                  step={0.5}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min Size</Label>
                  <Input
                    type="number"
                    value={config.minDotSize}
                    onChange={(e) => updateConfig('minDotSize', Number(e.target.value))}
                    min={0}
                    max={config.maxDotSize}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Size</Label>
                  <Input
                    type="number"
                    value={config.maxDotSize}
                    onChange={(e) => updateConfig('maxDotSize', Number(e.target.value))}
                    min={config.minDotSize}
                    max={config.dotSpacing}
                    step={0.1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Grid Angle</Label>
                  <span className="text-xs text-muted-foreground">{config.angle}°</span>
                </div>
                <Slider
                  value={[config.angle]}
                  onValueChange={([v]) => updateConfig('angle', v)}
                  min={0}
                  max={90}
                  step={5}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Image Adjustments</h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Contrast</Label>
                  <span className="text-xs text-muted-foreground">{config.contrast.toFixed(1)}</span>
                </div>
                <Slider
                  value={[config.contrast]}
                  onValueChange={([v]) => updateConfig('contrast', v)}
                  min={0.5}
                  max={2}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Brightness</Label>
                  <span className="text-xs text-muted-foreground">{config.brightness.toFixed(2)}</span>
                </div>
                <Slider
                  value={[config.brightness]}
                  onValueChange={([v]) => updateConfig('brightness', v)}
                  min={-0.5}
                  max={0.5}
                  step={0.05}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Invert</Label>
                <Switch
                  checked={config.invert}
                  onCheckedChange={(v: boolean) => updateConfig('invert', v)}
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

            {imageData && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <div className="text-sm font-medium">Statistics</div>
                <div className="text-xs text-muted-foreground">
                  {dots.length} dots generated
                </div>
                <div className="text-xs text-muted-foreground">
                  ~{dots.filter(d => d.size > 0.1).length} visible dots
                </div>
              </div>
            )}
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
              <canvas ref={canvasRef} className="hidden" />

              {!imageData ? (
                <div
                  className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Click to upload an image</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF supported</p>
                </div>
              ) : showPreview ? (
                <svg
                  width={Math.min(500, config.outputWidth * 2)}
                  height={Math.min(400, config.outputHeight * 2)}
                  viewBox={`-5 -5 ${config.outputWidth + 10} ${config.outputHeight + 10}`}
                  className="bg-white rounded-lg border border-border"
                >
                  {/* Border */}
                  {config.includeBorder && (
                    <rect
                      x="0"
                      y="0"
                      width={config.outputWidth}
                      height={config.outputHeight}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="0.5"
                    />
                  )}

                  {/* Dots */}
                  {dotPaths.slice(0, 2000).map((dotPath, idx) => (
                    <path
                      key={idx}
                      d={pathToSvg(dotPath)}
                      fill="#000000"
                      stroke="none"
                    />
                  ))}

                  {dotPaths.length > 2000 && (
                    <text
                      x={config.outputWidth / 2}
                      y={config.outputHeight + 8}
                      textAnchor="middle"
                      fontSize="3"
                      fill="#6b7280"
                    >
                      Preview limited to 2000 dots ({dotPaths.length} total)
                    </text>
                  )}
                </svg>
              ) : (
                <div className="text-muted-foreground">Preview disabled</div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {config.outputWidth} × {config.outputHeight}mm
                </span>
                <span className="text-muted-foreground">
                  {config.dotShape} • {config.gridType} grid
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
            <Button onClick={handleAddToCanvas} disabled={!project || dotPaths.length === 0}>
              <Plus className="w-4 h-4 mr-1" />
              Add to Canvas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HalftoneGenerator
