import { useState, useCallback, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
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
import { X, Image, RotateCcw, Download, Plus, Upload, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

// Import imagetracerjs - a proper vectorization library
// @ts-ignore - no types available
import ImageTracerLib from 'imagetracerjs'

interface ImageTracerProps {
  onClose: () => void
}

// Preset names from imagetracerjs
type PresetName = 'default' | 'posterized1' | 'posterized2' | 'posterized3' | 'curvy' | 'sharp' | 'detailed' | 'smoothed' | 'grayscale' | 'fixedpalette' | 'randomsampling1' | 'randomsampling2' | 'artistic1' | 'artistic2' | 'artistic3' | 'artistic4'

interface TracerConfig {
  preset: PresetName
  // Line tracing threshold
  ltres: number
  // Quadratic spline tracing threshold
  qtres: number
  // Edge node paths shorter than this will be discarded
  pathomit: number
  // Color sampling: 0=disabled, 1=random, 2=deterministic
  colorsampling: 0 | 1 | 2
  // Number of colors to use
  numberofcolors: number
  // Min color ratio for quantization
  mincolorratio: number
  // Color quantization cycles
  colorquantcycles: number
  // Blur radius
  blurradius: number
  // Blur delta
  blurdelta: number
  // SVG stroke width
  strokewidth: number
  // Output scale
  scale: number
  // Coordinate rounding
  roundcoords: number
  // Line threshold for control point removal
  lcpr: number
  // Quadratic threshold for control point removal
  qcpr: number
}

interface TracedPath {
  points: PathPoint[]
  color: string
  fillColor: string | null
}

const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  default: 'Balanced tracing for general use',
  posterized1: 'Posterized with 2 colors',
  posterized2: 'Posterized with 4 colors',
  posterized3: 'Posterized with 8 colors',
  curvy: 'Smooth curves, artistic look',
  sharp: 'Sharp edges, technical drawings',
  detailed: 'Maximum detail preservation',
  smoothed: 'Extra smoothing applied',
  grayscale: 'Grayscale output',
  fixedpalette: 'Fixed color palette',
  randomsampling1: 'Random color sampling v1',
  randomsampling2: 'Random color sampling v2',
  artistic1: 'Artistic style 1',
  artistic2: 'Artistic style 2',
  artistic3: 'Artistic style 3',
  artistic4: 'Artistic style 4',
}

export function ImageTracer({ onClose }: ImageTracerProps) {
  const { project, addObject, activeLayerId } = useDesignStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [config, setConfig] = useState<TracerConfig>({
    preset: 'default',
    ltres: 1,
    qtres: 1,
    pathomit: 8,
    colorsampling: 2,
    numberofcolors: 16,
    mincolorratio: 0,
    colorquantcycles: 3,
    blurradius: 0,
    blurdelta: 20,
    strokewidth: 1,
    scale: 1,
    roundcoords: 1,
    lcpr: 0,
    qcpr: 0,
  })

  const [imageData, setImageData] = useState<{
    src: string
    width: number
    height: number
    data: ImageData | null
  } | null>(null)

  const [tracedSvg, setTracedSvg] = useState<string>('')
  const [tracedPaths, setTracedPaths] = useState<TracedPath[]>([])
  const [isTracing, setIsTracing] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)
  const [showTraced, setShowTraced] = useState(true)
  const [usePreset, setUsePreset] = useState(true)

  const updateConfig = useCallback(<K extends keyof TracerConfig>(key: K, value: TracerConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, img.width, img.height)

        setImageData({
          src: event.target?.result as string,
          width: img.width,
          height: img.height,
          data,
        })
        setTracedSvg('')
        setTracedPaths([])
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }, [])

  // Parse SVG path data to our PathPoint format
  const parseSvgPath = useCallback((d: string): PathPoint[] => {
    const points: PathPoint[] = []
    const commands = d.match(/[MLQCZ][^MLQCZ]*/gi) || []
    
    let currentX = 0
    let currentY = 0
    
    for (const cmd of commands) {
      const type = cmd[0].toUpperCase()
      const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
      
      switch (type) {
        case 'M':
          currentX = coords[0] || 0
          currentY = coords[1] || 0
          points.push({ x: currentX, y: currentY, type: 'move' })
          break
        case 'L':
          currentX = coords[0] || currentX
          currentY = coords[1] || currentY
          points.push({ x: currentX, y: currentY, type: 'line' })
          break
        case 'Q':
          // Quadratic bezier - convert to line for simplicity
          currentX = coords[2] || currentX
          currentY = coords[3] || currentY
          points.push({ 
            x: currentX, 
            y: currentY, 
            type: 'curve',
            handleIn: { x: coords[0] || currentX, y: coords[1] || currentY }
          })
          break
        case 'C':
          // Cubic bezier
          currentX = coords[4] || currentX
          currentY = coords[5] || currentY
          points.push({ 
            x: currentX, 
            y: currentY, 
            type: 'curve',
            handleIn: { x: coords[0] || currentX, y: coords[1] || currentY },
            handleOut: { x: coords[2] || currentX, y: coords[3] || currentY }
          })
          break
        case 'Z':
          // Close path - handled by closed property
          break
      }
    }
    
    return points
  }, [])

  // Extract paths from SVG string
  const extractPathsFromSvg = useCallback((svgString: string): TracedPath[] => {
    const paths: TracedPath[] = []
    
    // Parse SVG to extract path elements
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'image/svg+xml')
    const pathElements = doc.querySelectorAll('path')
    
    pathElements.forEach((pathEl) => {
      const d = pathEl.getAttribute('d')
      const fill = pathEl.getAttribute('fill') || 'none'
      const stroke = pathEl.getAttribute('stroke') || '#000000'
      
      if (d) {
        const points = parseSvgPath(d)
        if (points.length > 1) {
          paths.push({
            points,
            color: stroke !== 'none' ? stroke : '#000000',
            fillColor: fill !== 'none' ? fill : null,
          })
        }
      }
    })
    
    return paths
  }, [parseSvgPath])

  const runTrace = useCallback(() => {
    if (!imageData?.data) return

    setIsTracing(true)

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        // Build options object
        const options = usePreset ? config.preset : {
          ltres: config.ltres,
          qtres: config.qtres,
          pathomit: config.pathomit,
          colorsampling: config.colorsampling,
          numberofcolors: config.numberofcolors,
          mincolorratio: config.mincolorratio,
          colorquantcycles: config.colorquantcycles,
          blurradius: config.blurradius,
          blurdelta: config.blurdelta,
          strokewidth: config.strokewidth,
          scale: config.scale,
          roundcoords: config.roundcoords,
          lcpr: config.lcpr,
          qcpr: config.qcpr,
        }

        // Use imagetracerjs to trace the image
        const svgString = ImageTracerLib.imagedataToSVG(imageData.data, options)
        
        setTracedSvg(svgString)
        
        // Extract paths for canvas export
        const paths = extractPathsFromSvg(svgString)
        setTracedPaths(paths)
        
      } catch (error) {
        console.error('Tracing error:', error)
      } finally {
        setIsTracing(false)
      }
    }, 50)
  }, [imageData, config, usePreset, extractPathsFromSvg])

  const handleAddToCanvas = useCallback(() => {
    if (!project || tracedPaths.length === 0) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = 50
    const offsetY = 50

    tracedPaths.forEach((traced, index) => {
      const translatedPoints = traced.points.map(p => ({
        ...p,
        x: p.x * config.scale + offsetX,
        y: p.y * config.scale + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: `Traced Path ${index + 1}`,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: traced.fillColor,
          fillOpacity: traced.fillColor ? 1 : 0,
          strokeColor: traced.color,
          strokeWidth: config.strokewidth,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedPoints,
        closed: true,
      } as VectorPath)
    })

    onClose()
  }, [project, activeLayerId, tracedPaths, config.scale, config.strokewidth, addObject, onClose])

  const handleExportSvg = useCallback(() => {
    if (!tracedSvg) return
    
    const blob = new Blob([tracedSvg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'traced-image.svg'
    a.click()
    URL.revokeObjectURL(url)
  }, [tracedSvg])

  const handleReset = useCallback(() => {
    setConfig({
      preset: 'default',
      ltres: 1,
      qtres: 1,
      pathomit: 8,
      colorsampling: 2,
      numberofcolors: 16,
      mincolorratio: 0,
      colorquantcycles: 3,
      blurradius: 0,
      blurdelta: 20,
      strokewidth: 1,
      scale: 1,
      roundcoords: 1,
      lcpr: 0,
      qcpr: 0,
    })
    setTracedSvg('')
    setTracedPaths([])
    setUsePreset(true)
  }, [])

  const previewScale = useMemo(() => {
    if (!imageData) return 1
    return Math.min(1, 400 / Math.max(imageData.width, imageData.height))
  }, [imageData])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[950px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Image Tracer</h2>
              <p className="text-sm text-muted-foreground">
                Powered by imagetracerjs - professional bitmap to vector conversion
              </p>
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
              >
                <Upload className="w-4 h-4 mr-2" />
                {imageData ? 'Change Image' : 'Upload Image'}
              </Button>

              {imageData && (
                <div className="text-xs text-muted-foreground">
                  {imageData.width} × {imageData.height} px
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Use Preset</h3>
                <Switch
                  checked={usePreset}
                  onCheckedChange={setUsePreset}
                />
              </div>

              {usePreset ? (
                <div className="space-y-2">
                  <Label>Tracing Preset</Label>
                  <Select
                    value={config.preset}
                    onValueChange={(v: string) => updateConfig('preset', v as PresetName)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRESET_DESCRIPTIONS).map(([key, desc]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex flex-col">
                            <span className="font-medium">{key}</span>
                            <span className="text-xs text-muted-foreground">{desc}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Line Threshold</Label>
                      <span className="text-xs text-muted-foreground">{config.ltres}</span>
                    </div>
                    <Slider
                      value={[config.ltres]}
                      onValueChange={([v]) => updateConfig('ltres', v)}
                      min={0.1}
                      max={10}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower = more detail, higher = smoother lines
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Curve Threshold</Label>
                      <span className="text-xs text-muted-foreground">{config.qtres}</span>
                    </div>
                    <Slider
                      value={[config.qtres]}
                      onValueChange={([v]) => updateConfig('qtres', v)}
                      min={0.1}
                      max={10}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Controls quadratic spline fitting
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Min Path Length</Label>
                      <span className="text-xs text-muted-foreground">{config.pathomit}px</span>
                    </div>
                    <Slider
                      value={[config.pathomit]}
                      onValueChange={([v]) => updateConfig('pathomit', v)}
                      min={0}
                      max={50}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paths shorter than this are discarded
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Number of Colors</Label>
                      <span className="text-xs text-muted-foreground">{config.numberofcolors}</span>
                    </div>
                    <Slider
                      value={[config.numberofcolors]}
                      onValueChange={([v]) => updateConfig('numberofcolors', v)}
                      min={2}
                      max={64}
                      step={1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Color Sampling</Label>
                    <Select
                      value={config.colorsampling.toString()}
                      onValueChange={(v: string) => updateConfig('colorsampling', Number(v) as 0 | 1 | 2)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Disabled</SelectItem>
                        <SelectItem value="1">Random</SelectItem>
                        <SelectItem value="2">Deterministic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Blur Radius</Label>
                      <span className="text-xs text-muted-foreground">{config.blurradius}</span>
                    </div>
                    <Slider
                      value={[config.blurradius]}
                      onValueChange={([v]) => updateConfig('blurradius', v)}
                      min={0}
                      max={5}
                      step={1}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Output</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Scale</Label>
                  <span className="text-xs text-muted-foreground">{config.scale}x</span>
                </div>
                <Slider
                  value={[config.scale]}
                  onValueChange={([v]) => updateConfig('scale', v)}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Stroke Width</Label>
                  <span className="text-xs text-muted-foreground">{config.strokewidth}px</span>
                </div>
                <Slider
                  value={[config.strokewidth]}
                  onValueChange={([v]) => updateConfig('strokewidth', v)}
                  min={0}
                  max={5}
                  step={0.5}
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={runTrace}
              disabled={!imageData || isTracing}
            >
              {isTracing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tracing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Trace Image
                </>
              )}
            </Button>

            {tracedPaths.length > 0 && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <div className="text-sm font-medium">Trace Results</div>
                <div className="text-xs text-muted-foreground">
                  {tracedPaths.length} paths extracted
                </div>
                <div className="text-xs text-muted-foreground">
                  {tracedPaths.reduce((sum, p) => sum + p.points.length, 0)} total points
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  variant={showOriginal ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  {showOriginal ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                  Original
                </Button>
                <Button
                  variant={showTraced ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowTraced(!showTraced)}
                >
                  {showTraced ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                  Traced
                </Button>
              </div>
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
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF, BMP supported</p>
                </div>
              ) : (
                <div className="relative">
                  {showOriginal && (
                    <img
                      src={imageData.src}
                      alt="Original"
                      style={{
                        width: imageData.width * previewScale,
                        height: imageData.height * previewScale,
                        opacity: showTraced && tracedSvg ? 0.3 : 1,
                      }}
                      className="rounded border border-border"
                    />
                  )}
                  
                  {showTraced && tracedSvg && (
                    <div
                      className="absolute top-0 left-0"
                      style={{
                        width: imageData.width * previewScale,
                        height: imageData.height * previewScale,
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: tracedSvg.replace(
                          /width="[^"]*"/,
                          `width="${imageData.width * previewScale}"`
                        ).replace(
                          /height="[^"]*"/,
                          `height="${imageData.height * previewScale}"`
                        )
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {tracedSvg && (
              <div className="p-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Preset: {usePreset ? config.preset : 'Custom'}
                  </span>
                  <span className="text-muted-foreground">
                    Output: {imageData ? `${Math.round(imageData.width * config.scale)} × ${Math.round(imageData.height * config.scale)}` : '-'}
                  </span>
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
            <Button 
              variant="outline" 
              onClick={handleExportSvg}
              disabled={!tracedSvg}
            >
              <Download className="w-4 h-4 mr-1" />
              Export SVG
            </Button>
            <Button onClick={handleAddToCanvas} disabled={!project || tracedPaths.length === 0}>
              <Plus className="w-4 h-4 mr-1" />
              Add to Canvas
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageTracer
