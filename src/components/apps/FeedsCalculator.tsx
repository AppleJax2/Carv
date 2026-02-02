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
import { X, Calculator, RotateCcw, Save, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedsCalculatorProps {
  onClose: () => void
}

interface ToolConfig {
  diameter: number
  flutes: number
  type: 'endmill' | 'ballnose' | 'vbit' | 'drill'
  material: 'hss' | 'carbide' | 'coated-carbide'
}

interface MachineConfig {
  spindleMin: number
  spindleMax: number
  maxFeedRate: number
  rigidity: 'light' | 'medium' | 'heavy'
}

interface MaterialConfig {
  type: string
  chipLoad: { min: number; max: number; optimal: number }
  sfm: { min: number; max: number; optimal: number }
  depthFactor: number
  stepoverFactor: number
}

interface CutConfig {
  cutType: 'profile' | 'slot' | 'pocket' | 'drill'
  finishQuality: 'rough' | 'standard' | 'fine'
}

interface CalculatedFeeds {
  rpm: number
  feedRate: number
  depthPerPass: number
  stepover: number
  chipLoad: number
  mrr: number
  warnings: string[]
  status: 'optimal' | 'acceptable' | 'warning' | 'danger'
}

const MATERIALS: Record<string, MaterialConfig> = {
  softwood: {
    type: 'Softwood (Pine, Cedar)',
    chipLoad: { min: 0.1, max: 0.25, optimal: 0.15 },
    sfm: { min: 300, max: 600, optimal: 450 },
    depthFactor: 1.0,
    stepoverFactor: 0.5,
  },
  hardwood: {
    type: 'Hardwood (Oak, Maple)',
    chipLoad: { min: 0.08, max: 0.18, optimal: 0.12 },
    sfm: { min: 250, max: 500, optimal: 350 },
    depthFactor: 0.75,
    stepoverFactor: 0.45,
  },
  plywood: {
    type: 'Plywood',
    chipLoad: { min: 0.1, max: 0.2, optimal: 0.14 },
    sfm: { min: 300, max: 550, optimal: 400 },
    depthFactor: 0.9,
    stepoverFactor: 0.5,
  },
  mdf: {
    type: 'MDF',
    chipLoad: { min: 0.12, max: 0.28, optimal: 0.18 },
    sfm: { min: 350, max: 650, optimal: 500 },
    depthFactor: 1.0,
    stepoverFactor: 0.5,
  },
  acrylic: {
    type: 'Acrylic',
    chipLoad: { min: 0.05, max: 0.12, optimal: 0.08 },
    sfm: { min: 200, max: 400, optimal: 300 },
    depthFactor: 0.5,
    stepoverFactor: 0.4,
  },
  aluminum: {
    type: 'Aluminum',
    chipLoad: { min: 0.025, max: 0.08, optimal: 0.05 },
    sfm: { min: 200, max: 500, optimal: 350 },
    depthFactor: 0.25,
    stepoverFactor: 0.35,
  },
  hdpe: {
    type: 'HDPE Plastic',
    chipLoad: { min: 0.1, max: 0.25, optimal: 0.15 },
    sfm: { min: 300, max: 600, optimal: 450 },
    depthFactor: 0.75,
    stepoverFactor: 0.5,
  },
}

const RIGIDITY_FACTORS: Record<string, number> = {
  light: 0.6,
  medium: 0.85,
  heavy: 1.0,
}

const CUT_TYPE_FACTORS: Record<string, number> = {
  profile: 1.0,
  slot: 0.5,
  pocket: 0.8,
  drill: 0.3,
}

const FINISH_FACTORS: Record<string, { chipLoad: number; stepover: number }> = {
  rough: { chipLoad: 1.2, stepover: 1.2 },
  standard: { chipLoad: 1.0, stepover: 1.0 },
  fine: { chipLoad: 0.7, stepover: 0.6 },
}

export function FeedsCalculator({ onClose }: FeedsCalculatorProps) {
  const [tool, setTool] = useState<ToolConfig>({
    diameter: 6.35,
    flutes: 2,
    type: 'endmill',
    material: 'carbide',
  })

  const [machine, setMachine] = useState<MachineConfig>({
    spindleMin: 8000,
    spindleMax: 24000,
    maxFeedRate: 5000,
    rigidity: 'medium',
  })

  const [materialKey, setMaterialKey] = useState('softwood')
  
  const [cut, setCut] = useState<CutConfig>({
    cutType: 'profile',
    finishQuality: 'standard',
  })

  const material = MATERIALS[materialKey]

  const calculated = useMemo((): CalculatedFeeds => {
    const warnings: string[] = []
    
    const toolMaterialFactor = tool.material === 'hss' ? 0.6 : tool.material === 'carbide' ? 1.0 : 1.15
    const sfm = material.sfm.optimal * toolMaterialFactor
    
    let rpm = (sfm * 1000) / (Math.PI * tool.diameter)
    
    if (rpm < machine.spindleMin) {
      rpm = machine.spindleMin
      warnings.push('RPM limited by minimum spindle speed')
    } else if (rpm > machine.spindleMax) {
      rpm = machine.spindleMax
      warnings.push('RPM limited by maximum spindle speed')
    }
    
    rpm = Math.round(rpm / 100) * 100
    
    const rigidityFactor = RIGIDITY_FACTORS[machine.rigidity]
    const cutTypeFactor = CUT_TYPE_FACTORS[cut.cutType]
    const finishFactor = FINISH_FACTORS[cut.finishQuality]
    
    let chipLoad = material.chipLoad.optimal * rigidityFactor * cutTypeFactor * finishFactor.chipLoad
    
    if (tool.diameter < 3) {
      chipLoad *= 0.5
      warnings.push('Reduced chip load for small diameter tool')
    } else if (tool.diameter < 6) {
      chipLoad *= 0.75
    }
    
    let feedRate = rpm * tool.flutes * chipLoad
    
    if (feedRate > machine.maxFeedRate) {
      feedRate = machine.maxFeedRate
      chipLoad = feedRate / (rpm * tool.flutes)
      warnings.push('Feed rate limited by machine maximum')
    }
    
    feedRate = Math.round(feedRate)
    
    let depthPerPass = tool.diameter * material.depthFactor * rigidityFactor * cutTypeFactor
    
    if (cut.cutType === 'slot') {
      depthPerPass *= 0.5
    }
    
    depthPerPass = Math.round(depthPerPass * 10) / 10
    
    let stepover = tool.diameter * material.stepoverFactor * finishFactor.stepover
    
    if (cut.cutType === 'slot') {
      stepover = tool.diameter
    }
    
    stepover = Math.round(stepover * 10) / 10
    
    const mrr = (feedRate * depthPerPass * stepover) / 1000
    
    let status: CalculatedFeeds['status'] = 'optimal'
    
    if (chipLoad < material.chipLoad.min * 0.8) {
      warnings.push('Chip load too low - risk of rubbing and heat buildup')
      status = 'warning'
    } else if (chipLoad > material.chipLoad.max * 1.2) {
      warnings.push('Chip load too high - risk of tool breakage')
      status = 'danger'
    } else if (chipLoad < material.chipLoad.min || chipLoad > material.chipLoad.max) {
      status = 'acceptable'
    }
    
    if (depthPerPass > tool.diameter * 2) {
      warnings.push('Depth per pass exceeds recommended maximum')
      status = status === 'optimal' ? 'warning' : status
    }
    
    return {
      rpm,
      feedRate,
      depthPerPass,
      stepover,
      chipLoad: Math.round(chipLoad * 1000) / 1000,
      mrr: Math.round(mrr * 100) / 100,
      warnings,
      status,
    }
  }, [tool, machine, material, cut])

  const handleReset = useCallback(() => {
    setTool({
      diameter: 6.35,
      flutes: 2,
      type: 'endmill',
      material: 'carbide',
    })
    setMachine({
      spindleMin: 8000,
      spindleMax: 24000,
      maxFeedRate: 5000,
      rigidity: 'medium',
    })
    setMaterialKey('softwood')
    setCut({
      cutType: 'profile',
      finishQuality: 'standard',
    })
  }, [])

  const chipLoadStatus = useMemo(() => {
    const { chipLoad } = calculated
    const { min, max, optimal } = material.chipLoad
    
    if (chipLoad < min * 0.8) return { color: 'text-red-500', label: 'Too Low' }
    if (chipLoad > max * 1.2) return { color: 'text-red-500', label: 'Too High' }
    if (chipLoad < min) return { color: 'text-amber-500', label: 'Low' }
    if (chipLoad > max) return { color: 'text-amber-500', label: 'High' }
    if (Math.abs(chipLoad - optimal) < 0.02) return { color: 'text-green-500', label: 'Optimal' }
    return { color: 'text-blue-500', label: 'Good' }
  }, [calculated.chipLoad, material.chipLoad])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[850px] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Feeds & Speeds Calculator</h2>
              <p className="text-sm text-muted-foreground">Calculate optimal cutting parameters</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 border-r border-border p-4 overflow-y-auto space-y-5">
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs">1</span>
                Tool
              </h3>
              
              <div className="space-y-2">
                <Label>Tool Type</Label>
                <Select
                  value={tool.type}
                  onValueChange={(v: string) => setTool(t => ({ ...t, type: v as ToolConfig['type'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="endmill">End Mill</SelectItem>
                    <SelectItem value="ballnose">Ball Nose</SelectItem>
                    <SelectItem value="vbit">V-Bit</SelectItem>
                    <SelectItem value="drill">Drill</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Diameter (mm)</Label>
                  <Input
                    type="number"
                    value={tool.diameter}
                    onChange={(e) => setTool(t => ({ ...t, diameter: Number(e.target.value) }))}
                    min={0.5}
                    max={25}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Flutes</Label>
                  <Select
                    value={tool.flutes.toString()}
                    onValueChange={(v: string) => setTool(t => ({ ...t, flutes: Number(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Flute</SelectItem>
                      <SelectItem value="2">2 Flutes</SelectItem>
                      <SelectItem value="3">3 Flutes</SelectItem>
                      <SelectItem value="4">4 Flutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tool Material</Label>
                <Select
                  value={tool.material}
                  onValueChange={(v: string) => setTool(t => ({ ...t, material: v as ToolConfig['material'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hss">HSS</SelectItem>
                    <SelectItem value="carbide">Carbide</SelectItem>
                    <SelectItem value="coated-carbide">Coated Carbide</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs">2</span>
                Material
              </h3>
              
              <Select
                value={materialKey}
                onValueChange={setMaterialKey}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MATERIALS).map(([key, mat]) => (
                    <SelectItem key={key} value={key}>{mat.type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                <div className="flex justify-between">
                  <span>Chip Load Range:</span>
                  <span>{material.chipLoad.min} - {material.chipLoad.max} mm</span>
                </div>
                <div className="flex justify-between">
                  <span>Optimal Chip Load:</span>
                  <span>{material.chipLoad.optimal} mm</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs">3</span>
                Cut Settings
              </h3>
              
              <div className="space-y-2">
                <Label>Cut Type</Label>
                <Select
                  value={cut.cutType}
                  onValueChange={(v: string) => setCut(c => ({ ...c, cutType: v as CutConfig['cutType'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profile">Profiling</SelectItem>
                    <SelectItem value="slot">Slotting</SelectItem>
                    <SelectItem value="pocket">Pocketing</SelectItem>
                    <SelectItem value="drill">Drilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Finish Quality</Label>
                <Select
                  value={cut.finishQuality}
                  onValueChange={(v: string) => setCut(c => ({ ...c, finishQuality: v as CutConfig['finishQuality'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rough">Rough (Fast)</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="fine">Fine Finish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-xs">4</span>
                Machine
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Min RPM</Label>
                  <Input
                    type="number"
                    value={machine.spindleMin}
                    onChange={(e) => setMachine(m => ({ ...m, spindleMin: Number(e.target.value) }))}
                    min={1000}
                    max={50000}
                    step={1000}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max RPM</Label>
                  <Input
                    type="number"
                    value={machine.spindleMax}
                    onChange={(e) => setMachine(m => ({ ...m, spindleMax: Number(e.target.value) }))}
                    min={1000}
                    max={50000}
                    step={1000}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Feed Rate (mm/min)</Label>
                <Input
                  type="number"
                  value={machine.maxFeedRate}
                  onChange={(e) => setMachine(m => ({ ...m, maxFeedRate: Number(e.target.value) }))}
                  min={500}
                  max={20000}
                  step={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Machine Rigidity</Label>
                <Select
                  value={machine.rigidity}
                  onValueChange={(v: string) => setMachine(m => ({ ...m, rigidity: v as MachineConfig['rigidity'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light (Desktop CNC)</SelectItem>
                    <SelectItem value="medium">Medium (Hobby CNC)</SelectItem>
                    <SelectItem value="heavy">Heavy (Industrial)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <div className="flex items-center gap-2">
                {calculated.status === 'optimal' && (
                  <div className="flex items-center gap-1 text-green-500 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Optimal Settings
                  </div>
                )}
                {calculated.status === 'acceptable' && (
                  <div className="flex items-center gap-1 text-blue-500 text-sm">
                    <Info className="w-4 h-4" />
                    Acceptable Settings
                  </div>
                )}
                {calculated.status === 'warning' && (
                  <div className="flex items-center gap-1 text-amber-500 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Review Warnings
                  </div>
                )}
                {calculated.status === 'danger' && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Not Recommended
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={cn(
                  "p-4 rounded-lg border-2",
                  calculated.status === 'danger' ? 'border-red-500/50 bg-red-500/10' :
                  calculated.status === 'warning' ? 'border-amber-500/50 bg-amber-500/10' :
                  'border-green-500/50 bg-green-500/10'
                )}>
                  <div className="text-sm text-muted-foreground mb-1">Spindle Speed</div>
                  <div className="text-3xl font-bold">{calculated.rpm.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">RPM</div>
                </div>

                <div className={cn(
                  "p-4 rounded-lg border-2",
                  calculated.status === 'danger' ? 'border-red-500/50 bg-red-500/10' :
                  calculated.status === 'warning' ? 'border-amber-500/50 bg-amber-500/10' :
                  'border-green-500/50 bg-green-500/10'
                )}>
                  <div className="text-sm text-muted-foreground mb-1">Feed Rate</div>
                  <div className="text-3xl font-bold">{calculated.feedRate.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">mm/min</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Depth per Pass</div>
                  <div className="text-xl font-semibold">{calculated.depthPerPass}</div>
                  <div className="text-xs text-muted-foreground">mm</div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Stepover</div>
                  <div className="text-xl font-semibold">{calculated.stepover}</div>
                  <div className="text-xs text-muted-foreground">mm ({Math.round(calculated.stepover / tool.diameter * 100)}%)</div>
                </div>

                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">MRR</div>
                  <div className="text-xl font-semibold">{calculated.mrr}</div>
                  <div className="text-xs text-muted-foreground">cm³/min</div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Chip Load</span>
                  <span className={cn("text-sm font-medium", chipLoadStatus.color)}>
                    {chipLoadStatus.label}
                  </span>
                </div>
                <div className="text-2xl font-bold mb-2">{calculated.chipLoad} mm</div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute h-full bg-green-500/30"
                    style={{
                      left: `${(material.chipLoad.min / material.chipLoad.max) * 50}%`,
                      right: `${50 - (material.chipLoad.max / material.chipLoad.max) * 50}%`,
                    }}
                  />
                  <div 
                    className={cn(
                      "absolute w-2 h-2 rounded-full -translate-x-1/2",
                      chipLoadStatus.color.replace('text-', 'bg-')
                    )}
                    style={{
                      left: `${Math.min(100, Math.max(0, (calculated.chipLoad / (material.chipLoad.max * 1.5)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>{material.chipLoad.min}</span>
                  <span>{material.chipLoad.optimal}</span>
                  <span>{material.chipLoad.max}</span>
                </div>
              </div>

              {calculated.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Warnings</h4>
                  {calculated.warnings.map((warning, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">Plunge Rate</div>
                  <div className="text-muted-foreground">{Math.round(calculated.feedRate * 0.3)} mm/min</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">Ramp Angle</div>
                  <div className="text-muted-foreground">3-5°</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">Direction</div>
                  <div className="text-muted-foreground">Climb</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="font-medium">Coolant</div>
                  <div className="text-muted-foreground">{materialKey === 'aluminum' ? 'Required' : 'Optional'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <Save className="w-4 h-4 mr-1" />
              Save Preset
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedsCalculator
