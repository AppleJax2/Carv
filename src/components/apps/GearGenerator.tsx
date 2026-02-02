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
import { X, Cog, RotateCcw, Download, Plus, Eye, EyeOff } from 'lucide-react'
import { useDesignStore } from '@/store/useDesignStore'
import type { VectorPath, PathPoint } from '@/types/design'

interface GearGeneratorProps {
  onClose: () => void
}

interface GearConfig {
  gearType: 'spur' | 'internal' | 'rack'
  module: number
  teeth: number
  pressureAngle: number
  profileShift: number
  clearance: number
  backlash: number
  hubDiameter: number
  hubEnabled: boolean
  keyway: boolean
  keywayWidth: number
  keywayDepth: number
  spokes: number
  spokeWidth: number
  rimWidth: number
  lightweightEnabled: boolean
  // For rack
  rackLength: number
  rackHeight: number
  // For gear pairs
  matingTeeth: number
  showMating: boolean
  centerDistance: number
}

// Involute gear tooth profile generation using proper involute mathematics
function generateInvolutePoint(baseRadius: number, angle: number): { x: number; y: number } {
  // Involute: x = r*(cos(t) + t*sin(t)), y = r*(sin(t) - t*cos(t))
  const x = baseRadius * (Math.cos(angle) + angle * Math.sin(angle))
  const y = baseRadius * (Math.sin(angle) - angle * Math.cos(angle))
  return { x, y }
}

function rotatePoint(x: number, y: number, angle: number): { x: number; y: number } {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  }
}

export function GearGenerator({ onClose }: GearGeneratorProps) {
  const { project, addObject, activeLayerId } = useDesignStore()

  const [config, setConfig] = useState<GearConfig>({
    gearType: 'spur',
    module: 2,
    teeth: 20,
    pressureAngle: 20,
    profileShift: 0,
    clearance: 0.25,
    backlash: 0.05,
    hubDiameter: 10,
    hubEnabled: true,
    keyway: false,
    keywayWidth: 3,
    keywayDepth: 1.5,
    spokes: 0,
    spokeWidth: 5,
    rimWidth: 3,
    lightweightEnabled: false,
    rackLength: 100,
    rackHeight: 10,
    matingTeeth: 30,
    showMating: false,
    centerDistance: 0,
  })

  const [showPreview, setShowPreview] = useState(true)

  const updateConfig = useCallback(<K extends keyof GearConfig>(key: K, value: GearConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])

  // Calculate gear dimensions
  const gearDimensions = useMemo(() => {
    const m = config.module
    const z = config.teeth
    const alpha = (config.pressureAngle * Math.PI) / 180
    const x = config.profileShift

    // Standard gear formulas
    const pitchDiameter = m * z
    const baseDiameter = pitchDiameter * Math.cos(alpha)
    const addendum = m * (1 + x)
    const dedendum = m * (1.25 - x)
    const outsideDiameter = pitchDiameter + 2 * addendum
    const rootDiameter = pitchDiameter - 2 * dedendum
    const toothThickness = (Math.PI * m) / 2 + 2 * x * m * Math.tan(alpha)

    // Mating gear
    const matingPitchDiameter = m * config.matingTeeth
    const centerDist = (pitchDiameter + matingPitchDiameter) / 2

    return {
      pitchDiameter,
      baseDiameter,
      outsideDiameter,
      rootDiameter,
      addendum,
      dedendum,
      toothThickness,
      circularPitch: Math.PI * m,
      matingPitchDiameter,
      centerDistance: centerDist,
    }
  }, [config.module, config.teeth, config.pressureAngle, config.profileShift, config.matingTeeth])

  // Generate involute gear tooth profile
  const generateToothProfile = useCallback((
    baseRadius: number,
    rootRadius: number,
    outsideRadius: number,
    toothAngle: number,
    pressureAngle: number
  ): { x: number; y: number }[] => {
    const points: { x: number; y: number }[] = []
    const alpha = pressureAngle

    // Calculate involute parameters
    const involuteAtPitch = Math.tan(alpha) - alpha
    const pitchRadius = baseRadius / Math.cos(alpha)

    // Angle at outside diameter
    const outsideAngle = Math.sqrt((outsideRadius / baseRadius) ** 2 - 1)
    const involuteAtOutside = Math.tan(outsideAngle) - Math.atan(outsideAngle)

    // Generate right side of tooth (involute curve)
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const angle = t * outsideAngle

      if (baseRadius * Math.sqrt(1 + angle * angle) >= rootRadius) {
        const pt = generateInvolutePoint(baseRadius, angle)
        // Rotate to align with tooth center
        const rotated = rotatePoint(pt.x, pt.y, -involuteAtPitch + toothAngle / 4)
        points.push(rotated)
      }
    }

    // Top land (arc at outside diameter)
    const topLandAngle = toothAngle * 0.1 // Approximate
    const topSteps = 5
    const lastPt = points[points.length - 1]
    const startAngle = Math.atan2(lastPt.y, lastPt.x)

    for (let i = 1; i <= topSteps; i++) {
      const a = startAngle + (i / topSteps) * topLandAngle
      points.push({
        x: outsideRadius * Math.cos(a),
        y: outsideRadius * Math.sin(a),
      })
    }

    // Generate left side of tooth (mirror of involute)
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      const angle = t * outsideAngle

      if (baseRadius * Math.sqrt(1 + angle * angle) >= rootRadius) {
        const pt = generateInvolutePoint(baseRadius, angle)
        // Mirror and rotate
        const mirrored = { x: pt.x, y: -pt.y }
        const rotated = rotatePoint(mirrored.x, mirrored.y, involuteAtPitch + toothAngle / 4 + toothAngle / 2)
        points.push(rotated)
      }
    }

    return points
  }, [])

  // Generate complete gear path
  const gearPath = useMemo((): PathPoint[] => {
    if (config.gearType === 'rack') {
      return generateRackPath()
    }

    const { baseDiameter, rootDiameter, outsideDiameter } = gearDimensions
    const baseRadius = baseDiameter / 2
    const rootRadius = rootDiameter / 2
    const outsideRadius = outsideDiameter / 2
    const toothAngle = (2 * Math.PI) / config.teeth
    const alpha = (config.pressureAngle * Math.PI) / 180

    const points: PathPoint[] = []
    const isInternal = config.gearType === 'internal'

    for (let i = 0; i < config.teeth; i++) {
      const baseAngle = i * toothAngle

      // Generate tooth profile
      const toothPoints = generateToothProfile(
        baseRadius,
        rootRadius,
        outsideRadius,
        toothAngle,
        alpha
      )

      // Rotate tooth to position
      toothPoints.forEach((pt, idx) => {
        const rotated = rotatePoint(pt.x, pt.y, baseAngle)

        if (isInternal) {
          // Flip for internal gear
          rotated.x = -rotated.x
        }

        points.push({
          x: rotated.x,
          y: rotated.y,
          type: i === 0 && idx === 0 ? 'move' : 'line',
        })
      })

      // Root fillet (simplified as arc)
      const nextBaseAngle = (i + 1) * toothAngle
      const rootArcSteps = 5
      const lastTooth = toothPoints[toothPoints.length - 1]
      const lastAngle = Math.atan2(lastTooth.y, lastTooth.x) + baseAngle

      // Connect to next tooth root
      const nextToothStart = generateToothProfile(baseRadius, rootRadius, outsideRadius, toothAngle, alpha)[0]
      const nextStartRotated = rotatePoint(nextToothStart.x, nextToothStart.y, nextBaseAngle)
      const nextStartAngle = Math.atan2(nextStartRotated.y, nextStartRotated.x)

      for (let j = 1; j <= rootArcSteps; j++) {
        const t = j / rootArcSteps
        const a = lastAngle + t * (nextStartAngle - lastAngle)
        let x = rootRadius * Math.cos(a)
        let y = rootRadius * Math.sin(a)

        if (isInternal) {
          x = -x
        }

        points.push({ x, y, type: 'line' })
      }
    }

    // Close the path
    if (points.length > 0) {
      points.push({ ...points[0], type: 'line' })
    }

    return points
  }, [config, gearDimensions, generateToothProfile])

  // Generate rack path
  const generateRackPath = useCallback((): PathPoint[] => {
    const m = config.module
    const alpha = (config.pressureAngle * Math.PI) / 180
    const toothHeight = 2.25 * m
    const addendum = m
    const dedendum = 1.25 * m
    const pitch = Math.PI * m
    const toothCount = Math.floor(config.rackLength / pitch)

    const points: PathPoint[] = []
    const y0 = 0

    // Start at bottom left
    points.push({ x: 0, y: y0 - dedendum, type: 'move' })

    for (let i = 0; i < toothCount; i++) {
      const x0 = i * pitch

      // Left flank
      points.push({ x: x0 + pitch * 0.25 - addendum * Math.tan(alpha), y: y0 - dedendum, type: 'line' })
      points.push({ x: x0 + pitch * 0.25 + addendum * Math.tan(alpha), y: y0 + addendum, type: 'line' })

      // Top land
      points.push({ x: x0 + pitch * 0.75 - addendum * Math.tan(alpha), y: y0 + addendum, type: 'line' })

      // Right flank
      points.push({ x: x0 + pitch * 0.75 + addendum * Math.tan(alpha), y: y0 - dedendum, type: 'line' })

      // Root
      if (i < toothCount - 1) {
        points.push({ x: x0 + pitch + pitch * 0.25 - addendum * Math.tan(alpha), y: y0 - dedendum, type: 'line' })
      }
    }

    // Complete the rack outline
    const lastX = (toothCount - 1) * pitch + pitch * 0.75 + addendum * Math.tan(alpha)
    points.push({ x: lastX, y: y0 - dedendum, type: 'line' })
    points.push({ x: lastX, y: y0 - config.rackHeight, type: 'line' })
    points.push({ x: 0, y: y0 - config.rackHeight, type: 'line' })
    points.push({ x: 0, y: y0 - dedendum, type: 'line' })

    return points
  }, [config.module, config.pressureAngle, config.rackLength, config.rackHeight])

  // Generate hub/bore path
  const hubPath = useMemo((): PathPoint[] | null => {
    if (!config.hubEnabled || config.gearType === 'rack') return null

    const points: PathPoint[] = []
    const r = config.hubDiameter / 2
    const segments = 32

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push({
        x: r * Math.cos(angle),
        y: r * Math.sin(angle),
        type: i === 0 ? 'move' : 'line',
      })
    }

    return points
  }, [config.hubEnabled, config.hubDiameter, config.gearType])

  // Generate keyway path
  const keywayPath = useMemo((): PathPoint[] | null => {
    if (!config.keyway || !config.hubEnabled || config.gearType === 'rack') return null

    const r = config.hubDiameter / 2
    const w = config.keywayWidth / 2
    const d = config.keywayDepth

    return [
      { x: -w, y: r, type: 'move' },
      { x: -w, y: r + d, type: 'line' },
      { x: w, y: r + d, type: 'line' },
      { x: w, y: r, type: 'line' },
    ]
  }, [config.keyway, config.hubEnabled, config.hubDiameter, config.keywayWidth, config.keywayDepth, config.gearType])

  // Generate mating gear path
  const matingGearPath = useMemo((): PathPoint[] | null => {
    if (!config.showMating || config.gearType !== 'spur') return null

    const m = config.module
    const z = config.matingTeeth
    const alpha = (config.pressureAngle * Math.PI) / 180

    const pitchDiameter = m * z
    const baseDiameter = pitchDiameter * Math.cos(alpha)
    const addendum = m
    const dedendum = 1.25 * m
    const outsideDiameter = pitchDiameter + 2 * addendum
    const rootDiameter = pitchDiameter - 2 * dedendum

    const baseRadius = baseDiameter / 2
    const rootRadius = rootDiameter / 2
    const outsideRadius = outsideDiameter / 2
    const toothAngle = (2 * Math.PI) / z

    const points: PathPoint[] = []
    const offsetX = gearDimensions.centerDistance

    for (let i = 0; i < z; i++) {
      const baseAngle = i * toothAngle + Math.PI // Offset by 180 degrees for meshing

      const toothPoints = generateToothProfile(baseRadius, rootRadius, outsideRadius, toothAngle, alpha)

      toothPoints.forEach((pt, idx) => {
        const rotated = rotatePoint(pt.x, pt.y, baseAngle)
        points.push({
          x: rotated.x + offsetX,
          y: rotated.y,
          type: i === 0 && idx === 0 ? 'move' : 'line',
        })
      })

      // Root connection
      const nextBaseAngle = (i + 1) * toothAngle + Math.PI
      const rootArcSteps = 5
      const lastTooth = toothPoints[toothPoints.length - 1]
      const lastAngle = Math.atan2(lastTooth.y, lastTooth.x) + baseAngle

      const nextToothStart = generateToothProfile(baseRadius, rootRadius, outsideRadius, toothAngle, alpha)[0]
      const nextStartRotated = rotatePoint(nextToothStart.x, nextToothStart.y, nextBaseAngle)
      const nextStartAngle = Math.atan2(nextStartRotated.y, nextStartRotated.x)

      for (let j = 1; j <= rootArcSteps; j++) {
        const t = j / rootArcSteps
        const a = lastAngle + t * (nextStartAngle - lastAngle)
        points.push({
          x: rootRadius * Math.cos(a) + offsetX,
          y: rootRadius * Math.sin(a),
          type: 'line',
        })
      }
    }

    if (points.length > 0) {
      points.push({ ...points[0], type: 'line' })
    }

    return points
  }, [config.showMating, config.gearType, config.module, config.matingTeeth, config.pressureAngle, gearDimensions, generateToothProfile])

  const handleAddToCanvas = useCallback(() => {
    if (!project) return

    const layerId = activeLayerId || project.layers[0]?.id || 'default'
    const offsetX = config.gearType === 'rack' ? 50 : 150
    const offsetY = config.gearType === 'rack' ? 100 : 150

    // Add main gear
    const translatedGear = gearPath.map(p => ({
      ...p,
      x: p.x + offsetX,
      y: p.y + offsetY,
    }))

    addObject({
      id: crypto.randomUUID(),
      layerId,
      name: `${config.gearType === 'rack' ? 'Rack' : config.gearType === 'internal' ? 'Internal Gear' : 'Spur Gear'} ${config.teeth}T M${config.module}`,
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
      points: translatedGear,
      closed: config.gearType !== 'rack',
    } as VectorPath)

    // Add hub
    if (hubPath) {
      const translatedHub = hubPath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: 'Gear Hub',
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
        points: translatedHub,
        closed: true,
      } as VectorPath)
    }

    // Add keyway
    if (keywayPath) {
      const translatedKeyway = keywayPath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: 'Keyway',
        visible: true,
        locked: false,
        selected: false,
        transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: {
          fillColor: null,
          fillOpacity: 1,
          strokeColor: '#f97316',
          strokeWidth: 1,
          strokeOpacity: 1,
        },
        type: 'path',
        points: translatedKeyway,
        closed: true,
      } as VectorPath)
    }

    // Add mating gear
    if (matingGearPath) {
      const translatedMating = matingGearPath.map(p => ({
        ...p,
        x: p.x + offsetX,
        y: p.y + offsetY,
      }))

      addObject({
        id: crypto.randomUUID(),
        layerId,
        name: `Mating Gear ${config.matingTeeth}T`,
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
        points: translatedMating,
        closed: true,
      } as VectorPath)
    }

    onClose()
  }, [project, activeLayerId, gearPath, hubPath, keywayPath, matingGearPath, config, addObject, onClose])

  const handleReset = useCallback(() => {
    setConfig({
      gearType: 'spur',
      module: 2,
      teeth: 20,
      pressureAngle: 20,
      profileShift: 0,
      clearance: 0.25,
      backlash: 0.05,
      hubDiameter: 10,
      hubEnabled: true,
      keyway: false,
      keywayWidth: 3,
      keywayDepth: 1.5,
      spokes: 0,
      spokeWidth: 5,
      rimWidth: 3,
      lightweightEnabled: false,
      rackLength: 100,
      rackHeight: 10,
      matingTeeth: 30,
      showMating: false,
      centerDistance: 0,
    })
  }, [])

  const previewScale = useMemo(() => {
    const maxDim = Math.max(
      gearDimensions.outsideDiameter,
      config.showMating ? gearDimensions.centerDistance + gearDimensions.matingPitchDiameter / 2 + 20 : 0
    )
    return Math.min(1, 350 / maxDim)
  }, [gearDimensions, config.showMating])

  const pathToSvg = useCallback((points: PathPoint[]): string => {
    return points.map(p => {
      if (p.type === 'move') return `M ${p.x} ${p.y}`
      return `L ${p.x} ${p.y}`
    }).join(' ')
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[950px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Cog className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Gear Generator</h2>
              <p className="text-sm text-muted-foreground">Create involute spur gears, internal gears, and racks</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Gear Type</h3>
              <Select
                value={config.gearType}
                onValueChange={(v: string) => updateConfig('gearType', v as GearConfig['gearType'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spur">Spur Gear (External)</SelectItem>
                  <SelectItem value="internal">Internal Gear</SelectItem>
                  <SelectItem value="rack">Rack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Parameters</h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Module (mm)</Label>
                  <Input
                    type="number"
                    value={config.module}
                    onChange={(e) => updateConfig('module', Number(e.target.value))}
                    min={0.5}
                    max={10}
                    step={0.5}
                  />
                </div>
                {config.gearType !== 'rack' && (
                  <div className="space-y-2">
                    <Label>Teeth</Label>
                    <Input
                      type="number"
                      value={config.teeth}
                      onChange={(e) => updateConfig('teeth', Number(e.target.value))}
                      min={8}
                      max={200}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Pressure Angle</Label>
                  <span className="text-xs text-muted-foreground">{config.pressureAngle}°</span>
                </div>
                <Slider
                  value={[config.pressureAngle]}
                  onValueChange={([v]) => updateConfig('pressureAngle', v)}
                  min={14.5}
                  max={25}
                  step={0.5}
                />
                <p className="text-xs text-muted-foreground">Standard: 20° or 14.5°</p>
              </div>

              {config.gearType !== 'rack' && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Profile Shift</Label>
                    <span className="text-xs text-muted-foreground">{config.profileShift}</span>
                  </div>
                  <Slider
                    value={[config.profileShift]}
                    onValueChange={([v]) => updateConfig('profileShift', v)}
                    min={-0.5}
                    max={0.5}
                    step={0.05}
                  />
                </div>
              )}

              {config.gearType === 'rack' && (
                <>
                  <div className="space-y-2">
                    <Label>Rack Length (mm)</Label>
                    <Input
                      type="number"
                      value={config.rackLength}
                      onChange={(e) => updateConfig('rackLength', Number(e.target.value))}
                      min={20}
                      max={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rack Height (mm)</Label>
                    <Input
                      type="number"
                      value={config.rackHeight}
                      onChange={(e) => updateConfig('rackHeight', Number(e.target.value))}
                      min={5}
                      max={50}
                    />
                  </div>
                </>
              )}
            </div>

            {config.gearType !== 'rack' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Hub & Bore</h3>

                <div className="flex items-center justify-between">
                  <Label>Center Bore</Label>
                  <Switch
                    checked={config.hubEnabled}
                    onCheckedChange={(v: boolean) => updateConfig('hubEnabled', v)}
                  />
                </div>

                {config.hubEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Bore Diameter (mm)</Label>
                      <Input
                        type="number"
                        value={config.hubDiameter}
                        onChange={(e) => updateConfig('hubDiameter', Number(e.target.value))}
                        min={1}
                        max={gearDimensions.rootDiameter - 5}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Keyway</Label>
                      <Switch
                        checked={config.keyway}
                        onCheckedChange={(v: boolean) => updateConfig('keyway', v)}
                      />
                    </div>

                    {config.keyway && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Width (mm)</Label>
                          <Input
                            type="number"
                            value={config.keywayWidth}
                            onChange={(e) => updateConfig('keywayWidth', Number(e.target.value))}
                            min={1}
                            max={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Depth (mm)</Label>
                          <Input
                            type="number"
                            value={config.keywayDepth}
                            onChange={(e) => updateConfig('keywayDepth', Number(e.target.value))}
                            min={0.5}
                            max={5}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {config.gearType === 'spur' && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Mating Gear</h3>

                <div className="flex items-center justify-between">
                  <Label>Show Mating Gear</Label>
                  <Switch
                    checked={config.showMating}
                    onCheckedChange={(v: boolean) => updateConfig('showMating', v)}
                  />
                </div>

                {config.showMating && (
                  <div className="space-y-2">
                    <Label>Mating Teeth</Label>
                    <Input
                      type="number"
                      value={config.matingTeeth}
                      onChange={(e) => updateConfig('matingTeeth', Number(e.target.value))}
                      min={8}
                      max={200}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pitch Diameter:</span>
                <span className="font-medium">{gearDimensions.pitchDiameter.toFixed(2)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Outside Diameter:</span>
                <span className="font-medium">{gearDimensions.outsideDiameter.toFixed(2)} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Root Diameter:</span>
                <span className="font-medium">{gearDimensions.rootDiameter.toFixed(2)} mm</span>
              </div>
              {config.showMating && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Center Distance:</span>
                  <span className="font-medium">{gearDimensions.centerDistance.toFixed(2)} mm</span>
                </div>
              )}
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
                  width={400}
                  height={400}
                  viewBox={config.gearType === 'rack'
                    ? `-10 -50 ${config.rackLength + 20} ${config.rackHeight + 100}`
                    : `${-gearDimensions.outsideDiameter * 0.7} ${-gearDimensions.outsideDiameter * 0.7} ${(config.showMating ? gearDimensions.centerDistance + gearDimensions.matingPitchDiameter : gearDimensions.outsideDiameter) * 1.4} ${gearDimensions.outsideDiameter * 1.4}`
                  }
                  className="bg-background rounded-lg border border-border"
                >
                  <defs>
                    <pattern id="gearGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" opacity="0.2" />
                    </pattern>
                  </defs>

                  <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#gearGrid)" />

                  {/* Pitch circle */}
                  {config.gearType !== 'rack' && (
                    <circle
                      cx="0"
                      cy="0"
                      r={gearDimensions.pitchDiameter / 2}
                      fill="none"
                      stroke="#6b7280"
                      strokeWidth="0.5"
                      strokeDasharray="4,4"
                    />
                  )}

                  {/* Main gear */}
                  <path
                    d={pathToSvg(gearPath) + (config.gearType !== 'rack' ? ' Z' : '')}
                    fill="hsl(var(--primary) / 0.1)"
                    stroke="hsl(var(--primary))"
                    strokeWidth="1"
                  />

                  {/* Hub */}
                  {hubPath && (
                    <path
                      d={pathToSvg(hubPath) + ' Z'}
                      fill="hsl(var(--background))"
                      stroke="#ef4444"
                      strokeWidth="1"
                    />
                  )}

                  {/* Keyway */}
                  {keywayPath && (
                    <path
                      d={pathToSvg(keywayPath) + ' Z'}
                      fill="hsl(var(--background))"
                      stroke="#f97316"
                      strokeWidth="1"
                    />
                  )}

                  {/* Mating gear */}
                  {matingGearPath && (
                    <>
                      <circle
                        cx={gearDimensions.centerDistance}
                        cy="0"
                        r={gearDimensions.matingPitchDiameter / 2}
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="0.5"
                        strokeDasharray="4,4"
                      />
                      <path
                        d={pathToSvg(matingGearPath) + ' Z'}
                        fill="hsl(var(--success) / 0.1)"
                        stroke="hsl(var(--success))"
                        strokeWidth="1"
                      />
                    </>
                  )}

                  {/* Center marks */}
                  {config.gearType !== 'rack' && (
                    <>
                      <line x1="-5" y1="0" x2="5" y2="0" stroke="#6b7280" strokeWidth="0.5" />
                      <line x1="0" y1="-5" x2="0" y2="5" stroke="#6b7280" strokeWidth="0.5" />
                    </>
                  )}
                </svg>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {config.gearType === 'rack' ? 'Rack' : `${config.teeth} teeth`} • Module {config.module}
                </span>
                <span className="text-muted-foreground">
                  Pressure angle: {config.pressureAngle}°
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

export default GearGenerator
