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
import { X, Layers, RotateCcw, Download, Plus, Eye, EyeOff } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface DovetailGeneratorProps {
  onClose: () => void
}

interface DovetailConfig {
  jointType: 'through' | 'half-blind' | 'sliding' | 'box-joint'
  boardWidth: number
  boardThickness: number
  numTails: number
  tailAngle: number
  pinRatio: number
  halfPinRatio: number
  kerf: number
  bitDiameter: number
  generateBothPieces: boolean
  // Sliding dovetail specific
  slideLength: number
  slideDepth: number
  // Box joint specific
  fingerWidth: number
}

interface JointPiece {
  name: string
  path: PathPoint[]
  color: string
}

export function DovetailGenerator({ onClose }: DovetailGeneratorProps) {
  const { project, addObject, activeLayerId } = useDesignStore()

  const [config, setConfig] = useState<DovetailConfig>({
    jointType: 'through',
    boardWidth: 150,
    boardThickness: 18,
    numTails: 4,
    tailAngle: 8,
    pinRatio: 0.5,
    halfPinRatio: 0.5,
    kerf: 0.1,
    bitDiameter: 6.35,
    generateBothPieces: true,
    slideLength: 100,
    slideDepth: 9,
    fingerWidth: 12,
  })

  const [showPreview, setShowPreview] = useState(true)
  const [selectedPiece, setSelectedPiece] = useState<'tail' | 'pin'>('tail')

  const updateConfig = useCallback(<K extends keyof DovetailConfig>(key: K, value: DovetailConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  // Calculate dovetail dimensions
  const jointDimensions = useMemo(() => {
    const { boardWidth, boardThickness, numTails, tailAngle, pinRatio, halfPinRatio } = config

    // Calculate tail and pin widths
    const angleRad = (tailAngle * Math.PI) / 180
    const slope = Math.tan(angleRad)

    // Total width available for tails and pins
    const totalWidth = boardWidth

    // Half pins at edges
    const halfPinWidth = boardThickness * halfPinRatio

    // Remaining width for full tails and pins
    const remainingWidth = totalWidth - 2 * halfPinWidth

    // Each tail-pin pair
    const pairWidth = remainingWidth / numTails

    // Pin width at narrow point
    const pinNarrowWidth = pairWidth * pinRatio

    // Tail width at wide point (bottom)
    const tailWideWidth = pairWidth - pinNarrowWidth

    // Tail width at narrow point (top) - affected by angle
    const tailNarrowWidth = tailWideWidth - 2 * boardThickness * slope

    // Pin width at wide point
    const pinWideWidth = pinNarrowWidth + 2 * boardThickness * slope

    return {
      halfPinWidth,
      tailWideWidth,
      tailNarrowWidth,
      pinNarrowWidth,
      pinWideWidth,
      pairWidth,
      slope,
    }
  }, [config])

  // Generate through dovetail tail board
  const generateTailBoard = useCallback((): PathPoint[] => {
    const { boardWidth, boardThickness, numTails, kerf } = config
    const { halfPinWidth, tailWideWidth, slope, pairWidth } = jointDimensions
    const k = kerf / 2

    const points: PathPoint[] = []

    // Start at bottom left
    points.push({ x: 0, y: 0, type: 'move' })

    // Bottom edge
    points.push({ x: boardWidth, y: 0, type: 'line' })

    // Right edge up
    points.push({ x: boardWidth, y: boardThickness, type: 'line' })

    // Generate tail profile from right to left
    let x = boardWidth

    // Right half pin (socket)
    x -= halfPinWidth
    points.push({ x: x + k, y: boardThickness, type: 'line' })
    points.push({ x: x + halfPinWidth * slope + k, y: 0, type: 'line' })
    points.push({ x: x - halfPinWidth * slope - k, y: 0, type: 'line' })
    points.push({ x: x - k, y: boardThickness, type: 'line' })

    // Full tails
    for (let i = 0; i < numTails; i++) {
      // Tail (protrusion)
      const tailStart = x - (pairWidth - tailWideWidth) / 2
      const tailEnd = tailStart - tailWideWidth

      points.push({ x: tailStart + k, y: boardThickness, type: 'line' })
      points.push({ x: tailStart - slope * boardThickness + k, y: boardThickness * 2, type: 'line' })
      points.push({ x: tailEnd + slope * boardThickness - k, y: boardThickness * 2, type: 'line' })
      points.push({ x: tailEnd - k, y: boardThickness, type: 'line' })

      x -= pairWidth

      // Pin socket (if not last)
      if (i < numTails - 1) {
        const pinStart = tailEnd
        const pinEnd = pinStart - (pairWidth - tailWideWidth)

        points.push({ x: pinStart + k, y: boardThickness, type: 'line' })
        points.push({ x: pinStart + slope * boardThickness + k, y: 0, type: 'line' })
        points.push({ x: pinEnd - slope * boardThickness - k, y: 0, type: 'line' })
        points.push({ x: pinEnd - k, y: boardThickness, type: 'line' })
      }
    }

    // Left half pin (socket)
    points.push({ x: halfPinWidth + k, y: boardThickness, type: 'line' })
    points.push({ x: halfPinWidth + halfPinWidth * slope + k, y: 0, type: 'line' })
    points.push({ x: -k, y: 0, type: 'line' })
    points.push({ x: 0, y: boardThickness, type: 'line' })

    // Left edge down
    points.push({ x: 0, y: 0, type: 'line' })

    return points
  }, [config, jointDimensions])

  // Generate through dovetail pin board
  const generatePinBoard = useCallback((): PathPoint[] => {
    const { boardWidth, boardThickness, numTails, kerf } = config
    const { halfPinWidth, tailWideWidth, slope, pairWidth } = jointDimensions
    const k = kerf / 2

    const points: PathPoint[] = []

    // Start at bottom left
    points.push({ x: 0, y: 0, type: 'move' })

    // Bottom edge
    points.push({ x: boardWidth, y: 0, type: 'line' })

    // Right edge up
    points.push({ x: boardWidth, y: boardThickness, type: 'line' })

    // Generate pin profile from right to left
    let x = boardWidth

    // Right half pin (protrusion)
    points.push({ x: x, y: boardThickness, type: 'line' })
    points.push({ x: x, y: boardThickness * 2, type: 'line' })
    x -= halfPinWidth
    points.push({ x: x - halfPinWidth * slope - k, y: boardThickness * 2, type: 'line' })
    points.push({ x: x + k, y: boardThickness, type: 'line' })

    // Full pins and tail sockets
    for (let i = 0; i < numTails; i++) {
      // Tail socket
      const tailStart = x - (pairWidth - tailWideWidth) / 2
      const tailEnd = tailStart - tailWideWidth

      points.push({ x: tailStart - k, y: boardThickness, type: 'line' })
      points.push({ x: tailStart - slope * boardThickness - k, y: 0, type: 'line' })
      points.push({ x: tailEnd + slope * boardThickness + k, y: 0, type: 'line' })
      points.push({ x: tailEnd + k, y: boardThickness, type: 'line' })

      x -= pairWidth

      // Pin (protrusion) - if not last
      if (i < numTails - 1) {
        const pinWidth = pairWidth - tailWideWidth
        const pinStart = tailEnd
        const pinEnd = pinStart - pinWidth

        points.push({ x: pinStart - k, y: boardThickness, type: 'line' })
        points.push({ x: pinStart + slope * boardThickness - k, y: boardThickness * 2, type: 'line' })
        points.push({ x: pinEnd - slope * boardThickness + k, y: boardThickness * 2, type: 'line' })
        points.push({ x: pinEnd + k, y: boardThickness, type: 'line' })
      }
    }

    // Left half pin (protrusion)
    points.push({ x: halfPinWidth - k, y: boardThickness, type: 'line' })
    points.push({ x: halfPinWidth + halfPinWidth * slope - k, y: boardThickness * 2, type: 'line' })
    points.push({ x: 0, y: boardThickness * 2, type: 'line' })
    points.push({ x: 0, y: boardThickness, type: 'line' })

    // Left edge down
    points.push({ x: 0, y: 0, type: 'line' })

    return points
  }, [config, jointDimensions])

  // Generate box joint finger board
  const generateBoxJointBoard = useCallback((isFirst: boolean): PathPoint[] => {
    const { boardWidth, boardThickness, fingerWidth, kerf } = config
    const k = kerf / 2

    const numFingers = Math.floor(boardWidth / fingerWidth)
    const actualFingerWidth = boardWidth / numFingers

    const points: PathPoint[] = []

    points.push({ x: 0, y: 0, type: 'move' })
    points.push({ x: boardWidth, y: 0, type: 'line' })
    points.push({ x: boardWidth, y: boardThickness, type: 'line' })

    // Generate fingers from right to left
    for (let i = numFingers - 1; i >= 0; i--) {
      const fingerStart = (i + 1) * actualFingerWidth
      const fingerEnd = i * actualFingerWidth
      const isProtrusion = isFirst ? i % 2 === 0 : i % 2 === 1

      if (isProtrusion) {
        // Finger protrusion
        points.push({ x: fingerStart - k, y: boardThickness, type: 'line' })
        points.push({ x: fingerStart - k, y: boardThickness * 2, type: 'line' })
        points.push({ x: fingerEnd + k, y: boardThickness * 2, type: 'line' })
        points.push({ x: fingerEnd + k, y: boardThickness, type: 'line' })
      } else {
        // Finger socket
        points.push({ x: fingerStart + k, y: boardThickness, type: 'line' })
        points.push({ x: fingerStart + k, y: 0, type: 'line' })
        points.push({ x: fingerEnd - k, y: 0, type: 'line' })
        points.push({ x: fingerEnd - k, y: boardThickness, type: 'line' })
      }
    }

    points.push({ x: 0, y: boardThickness, type: 'line' })
    points.push({ x: 0, y: 0, type: 'line' })

    return points
  }, [config])

  // Generate sliding dovetail
  const generateSlidingDovetail = useCallback((isMale: boolean): PathPoint[] => {
    const { slideLength, slideDepth, boardThickness, tailAngle, kerf } = config
    const k = kerf / 2
    const angleRad = (tailAngle * Math.PI) / 180
    const slope = Math.tan(angleRad)

    const dovetailWidth = slideDepth * 2 + boardThickness * 0.5
    const narrowWidth = dovetailWidth - 2 * slideDepth * slope

    const points: PathPoint[] = []

    if (isMale) {
      // Male (tongue) piece
      points.push({ x: 0, y: 0, type: 'move' })
      points.push({ x: slideLength, y: 0, type: 'line' })
      points.push({ x: slideLength, y: boardThickness, type: 'line' })

      // Dovetail tongue
      const centerY = boardThickness + slideDepth / 2
      points.push({ x: slideLength, y: boardThickness, type: 'line' })
      points.push({ x: slideLength, y: centerY - narrowWidth / 2 + k, type: 'line' })
      points.push({ x: slideLength - slideDepth, y: centerY - dovetailWidth / 2 + k, type: 'line' })
      points.push({ x: 0, y: centerY - dovetailWidth / 2 + k, type: 'line' })
      points.push({ x: 0, y: centerY + dovetailWidth / 2 - k, type: 'line' })
      points.push({ x: slideLength - slideDepth, y: centerY + dovetailWidth / 2 - k, type: 'line' })
      points.push({ x: slideLength, y: centerY + narrowWidth / 2 - k, type: 'line' })

      points.push({ x: slideLength, y: boardThickness * 2 + slideDepth, type: 'line' })
      points.push({ x: 0, y: boardThickness * 2 + slideDepth, type: 'line' })
      points.push({ x: 0, y: 0, type: 'line' })
    } else {
      // Female (groove) piece
      const grooveWidth = dovetailWidth + kerf
      const grooveNarrowWidth = narrowWidth + kerf

      points.push({ x: 0, y: 0, type: 'move' })
      points.push({ x: slideLength, y: 0, type: 'line' })
      points.push({ x: slideLength, y: boardThickness, type: 'line' })

      // Dovetail groove
      const centerX = slideLength / 2
      const grooveTop = boardThickness
      const grooveBottom = boardThickness + slideDepth

      points.push({ x: centerX + grooveNarrowWidth / 2, y: grooveTop, type: 'line' })
      points.push({ x: centerX + grooveWidth / 2, y: grooveBottom, type: 'line' })
      points.push({ x: centerX - grooveWidth / 2, y: grooveBottom, type: 'line' })
      points.push({ x: centerX - grooveNarrowWidth / 2, y: grooveTop, type: 'line' })

      points.push({ x: 0, y: boardThickness, type: 'line' })
      points.push({ x: 0, y: 0, type: 'line' })
    }

    return points
  }, [config])

  // Generate all joint pieces
  const jointPieces = useMemo((): JointPiece[] => {
    const pieces: JointPiece[] = []

    switch (config.jointType) {
      case 'through':
      case 'half-blind':
        pieces.push({
          name: 'Tail Board',
          path: generateTailBoard(),
          color: '#3b82f6',
        })
        if (config.generateBothPieces) {
          pieces.push({
            name: 'Pin Board',
            path: generatePinBoard(),
            color: '#22c55e',
          })
        }
        break

      case 'box-joint':
        pieces.push({
          name: 'Board A',
          path: generateBoxJointBoard(true),
          color: '#3b82f6',
        })
        if (config.generateBothPieces) {
          pieces.push({
            name: 'Board B',
            path: generateBoxJointBoard(false),
            color: '#22c55e',
          })
        }
        break

      case 'sliding':
        pieces.push({
          name: 'Tongue (Male)',
          path: generateSlidingDovetail(true),
          color: '#3b82f6',
        })
        if (config.generateBothPieces) {
          pieces.push({
            name: 'Groove (Female)',
            path: generateSlidingDovetail(false),
            color: '#22c55e',
          })
        }
        break
    }

    return pieces
  }, [config, generateTailBoard, generatePinBoard, generateBoxJointBoard, generateSlidingDovetail])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    let offsetY = 50

    jointPieces.forEach((piece) => {
      const translatedPath = piece.path.map(p => ({
        ...p,
        x: p.x + 50,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: piece.name,
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: piece.color,
          strokeWidth: 1,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedPath,
        closed: true,
      } as VectorPath)

      offsetY += config.boardThickness * 3 + 30
    })

    onClose()
  }, [project, activeLayerId, jointPieces, config.boardThickness, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      jointType: 'through',
      boardWidth: 150,
      boardThickness: 18,
      numTails: 4,
      tailAngle: 8,
      pinRatio: 0.5,
      halfPinRatio: 0.5,
      kerf: 0.1,
      bitDiameter: 6.35,
      generateBothPieces: true,
      slideLength: 100,
      slideDepth: 9,
      fingerWidth: 12,
    })
  }, [])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map(p => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      return `L ${p.x} ${p.y}`
    }).join(' ') + ' Z'
  }, [])

  const previewBounds = useMemo(() => {
    let maxX = 0, maxY = 0
    jointPieces.forEach(piece => {
      piece.path.forEach(p => {
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      })
    })
    return { width: maxX + 20, height: maxY * jointPieces.length + 40 }
  }, [jointPieces])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[950px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Dovetail Joint Generator</h2>
              <p className="text-sm text-muted-foreground">Create dovetails, box joints, and sliding dovetails</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Joint Type</h3>
              <Select
                value={config.jointType}
                onValueChange={(v: string) => updateConfig('jointType', v as DovetailConfig['jointType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="through">Through Dovetail</SelectItem>
                  <SelectItem value="half-blind">Half-Blind Dovetail</SelectItem>
                  <SelectItem value="sliding">Sliding Dovetail</SelectItem>
                  <SelectItem value="box-joint">Box Joint (Finger Joint)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Board Dimensions</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Width (mm)</Label>
                  <Input
                    type="number"
                    value={config.boardWidth}
                    onChange={(e) => updateConfig('boardWidth', Number(e.target.value))}
                    min={50}
                    max={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thickness (mm)</Label>
                  <Input
                    type="number"
                    value={config.boardThickness}
                    onChange={(e) => updateConfig('boardThickness', Number(e.target.value))}
                    min={6}
                    max={50}
                  />
                </div>
              </div>
            </div>

            {(config.jointType === 'through' || config.jointType === 'half-blind') && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Dovetail Parameters</h3>

                <div className="space-y-2">
                  <Label>Number of Tails</Label>
                  <Input
                    type="number"
                    value={config.numTails}
                    onChange={(e) => updateConfig('numTails', Number(e.target.value))}
                    min={1}
                    max={12}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Tail Angle</Label>
                    <span className="text-xs text-muted-foreground">{config.tailAngle}°</span>
                  </div>
                  <Slider
                    value={[config.tailAngle]}
                    onValueChange={([v]) => updateConfig('tailAngle', v)}
                    min={5}
                    max={15}
                    step={0.5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Softwood: 8-10° | Hardwood: 6-8°
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Pin Ratio</Label>
                    <span className="text-xs text-muted-foreground">{(config.pinRatio * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[config.pinRatio]}
                    onValueChange={([v]) => updateConfig('pinRatio', v)}
                    min={0.2}
                    max={0.8}
                    step={0.05}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Half Pin Ratio</Label>
                    <span className="text-xs text-muted-foreground">{(config.halfPinRatio * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[config.halfPinRatio]}
                    onValueChange={([v]) => updateConfig('halfPinRatio', v)}
                    min={0.25}
                    max={1}
                    step={0.05}
                  />
                </div>
              </div>
            )}

            {config.jointType === 'box-joint' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Box Joint Parameters</h3>

                <div className="space-y-2">
                  <Label>Finger Width (mm)</Label>
                  <Input
                    type="number"
                    value={config.fingerWidth}
                    onChange={(e) => updateConfig('fingerWidth', Number(e.target.value))}
                    min={3}
                    max={30}
                  />
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-sm">
                  <div className="font-medium mb-1">Calculated</div>
                  <div className="text-muted-foreground">
                    {Math.floor(config.boardWidth / config.fingerWidth)} fingers
                  </div>
                </div>
              </div>
            )}

            {config.jointType === 'sliding' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Sliding Dovetail Parameters</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Slide Length (mm)</Label>
                    <Input
                      type="number"
                      value={config.slideLength}
                      onChange={(e) => updateConfig('slideLength', Number(e.target.value))}
                      min={30}
                      max={300}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slide Depth (mm)</Label>
                    <Input
                      type="number"
                      value={config.slideDepth}
                      onChange={(e) => updateConfig('slideDepth', Number(e.target.value))}
                      min={3}
                      max={config.boardThickness * 0.75}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Dovetail Angle</Label>
                    <span className="text-xs text-muted-foreground">{config.tailAngle}°</span>
                  </div>
                  <Slider
                    value={[config.tailAngle]}
                    onValueChange={([v]) => updateConfig('tailAngle', v)}
                    min={5}
                    max={15}
                    step={0.5}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-medium">CNC Settings</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Kerf (mm)</Label>
                  <Input
                    type="number"
                    value={config.kerf}
                    onChange={(e) => updateConfig('kerf', Number(e.target.value))}
                    min={0}
                    max={1}
                    step={0.05}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bit Ø (mm)</Label>
                  <Input
                    type="number"
                    value={config.bitDiameter}
                    onChange={(e) => updateConfig('bitDiameter', Number(e.target.value))}
                    min={1}
                    max={12}
                    step={0.1}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Generate Both Pieces</Label>
                <Switch
                  checked={config.generateBothPieces}
                  onCheckedChange={(v: boolean) => updateConfig('generateBothPieces', v)}
                />
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
                  width={Math.min(500, previewBounds.width * 2)}
                  height={Math.min(400, previewBounds.height)}
                  viewBox={`-10 -10 ${previewBounds.width + 20} ${previewBounds.height + 20}`}
                  className="bg-background rounded-lg border border-border"
                >
                  <defs>
                    <pattern id="jointGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" opacity="0.2" />
                    </pattern>
                  </defs>

                  <rect x="-100" y="-100" width="1000" height="1000" fill="url(#jointGrid)" />

                  {jointPieces.map((piece, idx) => (
                    <g key={piece.name} transform={`translate(0, ${idx * (config.boardThickness * 3 + 20)})`}>
                      <path
                        d={pathToSvg(piece.path)}
                        fill={`${piece.color}20`}
                        stroke={piece.color}
                        strokeWidth="1"
                      />
                      <text
                        x="5"
                        y="-5"
                        fontSize="10"
                        fill={piece.color}
                      >
                        {piece.name}
                      </text>
                    </g>
                  ))}
                </svg>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {config.jointType === 'box-joint' ? 'Box Joint' : 'Dovetail'} • {config.boardWidth}mm wide
                </span>
                <span className="text-muted-foreground">
                  {jointPieces.length} piece{jointPieces.length > 1 ? 's' : ''}
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
              Export DXF
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

export default DovetailGenerator
