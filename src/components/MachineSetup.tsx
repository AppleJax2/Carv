import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { 
  Settings2, Cpu, Crosshair, Gauge, 
  ArrowUpDown, Save, ChevronRight,
  Box, Home, AlertTriangle
} from 'lucide-react'
import { 
  MachineConfig, 
  DEFAULT_MACHINE_PRESETS,
  SpindleConfig,
  PostProcessorConfig 
} from '@/types/machine'
import { cn } from '@/lib/utils'

interface MachineSetupProps {
  config: MachineConfig | null
  onSave: (config: MachineConfig) => void
  onClose: () => void
}

type SetupTab = 'workspace' | 'axes' | 'spindle' | 'homing' | 'probe' | 'post'

export function MachineSetup({ config, onSave, onClose }: MachineSetupProps) {
  const [activeTab, setActiveTab] = useState<SetupTab>('workspace')
  const [machineConfig, setMachineConfig] = useState<Partial<MachineConfig>>(
    config || {
      name: 'My CNC Machine',
      workspace: { width: 300, depth: 300, height: 100, originPosition: 'front-left' },
      axes: {
        x: { stepsPerMm: 80, maxRate: 5000, acceleration: 500, maxTravel: 300, invertDirection: false, invertLimitSwitch: false },
        y: { stepsPerMm: 80, maxRate: 5000, acceleration: 500, maxTravel: 300, invertDirection: false, invertLimitSwitch: false },
        z: { stepsPerMm: 80, maxRate: 2000, acceleration: 200, maxTravel: 100, invertDirection: false, invertLimitSwitch: false },
      },
      spindle: { type: 'pwm', minRpm: 0, maxRpm: 24000, pwmMinValue: 0, pwmMaxValue: 255, spindleDelayMs: 2000, clockwise: 'M3' },
      homing: { enabled: true, direction: { x: 'min', y: 'min', z: 'max' }, seekRate: 1500, feedRate: 500, pullOff: 3, sequence: 'z-first' },
      probe: { enabled: true, type: 'touch-plate', plateThickness: 15, diameter: 0, feedRate: 100, seekRate: 500, retract: 2 },
      limits: { softLimitsEnabled: true, hardLimitsEnabled: true },
      rapids: { xy: 5000, z: 2000 },
      safeHeight: 10,
      firmware: 'grbl',
    }
  )

  const tabs: { id: SetupTab; label: string; icon: React.ReactNode }[] = [
    { id: 'workspace', label: 'Workspace', icon: <Box className="w-4 h-4" /> },
    { id: 'axes', label: 'Axes', icon: <ArrowUpDown className="w-4 h-4" /> },
    { id: 'spindle', label: 'Spindle', icon: <Gauge className="w-4 h-4" /> },
    { id: 'homing', label: 'Homing', icon: <Home className="w-4 h-4" /> },
    { id: 'probe', label: 'Probe', icon: <Crosshair className="w-4 h-4" /> },
    { id: 'post', label: 'Post Processor', icon: <Cpu className="w-4 h-4" /> },
  ]

  const updateConfig = <K extends keyof MachineConfig>(
    key: K, 
    value: MachineConfig[K]
  ) => {
    setMachineConfig(prev => ({ ...prev, [key]: value }))
  }

  const handlePresetSelect = (preset: Partial<MachineConfig>) => {
    setMachineConfig(prev => ({ ...prev, ...preset }))
  }

  const handleSave = () => {
    onSave(machineConfig as MachineConfig)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[900px] max-h-[80vh] flex flex-col">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Machine Setup
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-border p-2 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                  activeTab === tab.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-accent'
                )}
              >
                {tab.icon}
                {tab.label}
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </button>
            ))}
            
            <div className="pt-4 border-t border-border mt-4">
              <div className="text-xs text-muted-foreground px-3 py-2">Presets</div>
              {DEFAULT_MACHINE_PRESETS.map((preset, i) => (
                <button
                  key={i}
                  onClick={() => handlePresetSelect(preset)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent rounded-md transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-6">
            {activeTab === 'workspace' && (
              <WorkspaceTab config={machineConfig} updateConfig={updateConfig} />
            )}
            {activeTab === 'axes' && (
              <AxesTab config={machineConfig} updateConfig={updateConfig} />
            )}
            {activeTab === 'spindle' && (
              <SpindleTab config={machineConfig} updateConfig={updateConfig} />
            )}
            {activeTab === 'homing' && (
              <HomingTab config={machineConfig} updateConfig={updateConfig} />
            )}
            {activeTab === 'probe' && (
              <ProbeTab config={machineConfig} updateConfig={updateConfig} />
            )}
            {activeTab === 'post' && (
              <PostProcessorTab config={machineConfig} updateConfig={updateConfig} />
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  )
}

interface TabProps {
  config: Partial<MachineConfig>
  updateConfig: <K extends keyof MachineConfig>(key: K, value: MachineConfig[K]) => void
}

function WorkspaceTab({ config, updateConfig }: TabProps) {
  const workspace = config.workspace || { width: 300, depth: 300, height: 100, originPosition: 'front-left' as const }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Machine Name</h3>
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => updateConfig('name', e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
          placeholder="My CNC Machine"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Workspace Dimensions</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Width (X) mm</label>
            <input
              type="number"
              value={workspace.width}
              onChange={(e) => updateConfig('workspace', { ...workspace, width: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Depth (Y) mm</label>
            <input
              type="number"
              value={workspace.depth}
              onChange={(e) => updateConfig('workspace', { ...workspace, depth: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Height (Z) mm</label>
            <input
              type="number"
              value={workspace.height}
              onChange={(e) => updateConfig('workspace', { ...workspace, height: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Origin Position</h3>
        <p className="text-sm text-muted-foreground mb-3">Where is your machine's origin (0,0) located?</p>
        <div className="grid grid-cols-3 gap-2 w-48">
          {(['back-left', 'back-right', 'front-left', 'front-right', 'center'] as const).map(pos => (
            <button
              key={pos}
              onClick={() => updateConfig('workspace', { ...workspace, originPosition: pos })}
              className={cn(
                'p-3 rounded-md border text-xs transition-colors',
                pos === 'center' ? 'col-span-3' : '',
                workspace.originPosition === pos 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'border-border hover:bg-accent'
              )}
            >
              {pos.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Rapid Speeds</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">X/Y Rapid (mm/min)</label>
            <input
              type="number"
              value={config.rapids?.xy || 5000}
              onChange={(e) => updateConfig('rapids', { ...config.rapids!, xy: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Z Rapid (mm/min)</label>
            <input
              type="number"
              value={config.rapids?.z || 2000}
              onChange={(e) => updateConfig('rapids', { ...config.rapids!, z: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Safe Height</h3>
        <p className="text-sm text-muted-foreground mb-3">Z height for safe travel moves above workpiece</p>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={config.safeHeight || 10}
            onChange={(e) => updateConfig('safeHeight', Number(e.target.value))}
            className="w-32 h-10 px-3 rounded-md bg-secondary border border-input"
          />
          <span className="text-sm text-muted-foreground">mm</span>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Firmware</h3>
        <select
          value={config.firmware || 'grbl'}
          onChange={(e) => updateConfig('firmware', e.target.value as MachineConfig['firmware'])}
          className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
        >
          <option value="grbl">GRBL</option>
          <option value="grbl-hal">grblHAL</option>
          <option value="marlin">Marlin</option>
          <option value="fluid-nc">FluidNC</option>
        </select>
      </div>
    </div>
  )
}

function AxesTab({ config, updateConfig }: TabProps) {
  const axes = config.axes || {
    x: { stepsPerMm: 80, maxRate: 5000, acceleration: 500, maxTravel: 300, invertDirection: false, invertLimitSwitch: false },
    y: { stepsPerMm: 80, maxRate: 5000, acceleration: 500, maxTravel: 300, invertDirection: false, invertLimitSwitch: false },
    z: { stepsPerMm: 80, maxRate: 2000, acceleration: 200, maxTravel: 100, invertDirection: false, invertLimitSwitch: false },
  }

  const axisLabels = ['X', 'Y', 'Z'] as const

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <span className="text-sm">These settings should match your GRBL configuration ($100-$132)</span>
      </div>

      {axisLabels.map(axis => {
        const axisKey = axis.toLowerCase() as 'x' | 'y' | 'z'
        const axisConfig = axes[axisKey]
        
        return (
          <div key={axis} className="p-4 border border-border rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                axis === 'X' ? 'bg-red-500/20 text-red-400' :
                axis === 'Y' ? 'bg-green-500/20 text-green-400' :
                'bg-blue-500/20 text-blue-400'
              )}>
                {axis}
              </span>
              {axis} Axis
            </h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Steps/mm</label>
                <input
                  type="number"
                  value={axisConfig.stepsPerMm}
                  onChange={(e) => updateConfig('axes', {
                    ...axes,
                    [axisKey]: { ...axisConfig, stepsPerMm: Number(e.target.value) }
                  })}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Max Rate (mm/min)</label>
                <input
                  type="number"
                  value={axisConfig.maxRate}
                  onChange={(e) => updateConfig('axes', {
                    ...axes,
                    [axisKey]: { ...axisConfig, maxRate: Number(e.target.value) }
                  })}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Acceleration (mm/s²)</label>
                <input
                  type="number"
                  value={axisConfig.acceleration}
                  onChange={(e) => updateConfig('axes', {
                    ...axes,
                    [axisKey]: { ...axisConfig, acceleration: Number(e.target.value) }
                  })}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Max Travel (mm)</label>
                <input
                  type="number"
                  value={axisConfig.maxTravel}
                  onChange={(e) => updateConfig('axes', {
                    ...axes,
                    [axisKey]: { ...axisConfig, maxTravel: Number(e.target.value) }
                  })}
                  className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Invert Direction</label>
                <button
                  onClick={() => updateConfig('axes', {
                    ...axes,
                    [axisKey]: { ...axisConfig, invertDirection: !axisConfig.invertDirection }
                  })}
                  className={cn(
                    'w-full h-9 px-3 rounded-md border text-sm transition-colors',
                    axisConfig.invertDirection 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-secondary border-input'
                  )}
                >
                  {axisConfig.invertDirection ? 'Inverted' : 'Normal'}
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Invert Limit Switch</label>
                <button
                  onClick={() => updateConfig('axes', {
                    ...axes,
                    [axisKey]: { ...axisConfig, invertLimitSwitch: !axisConfig.invertLimitSwitch }
                  })}
                  className={cn(
                    'w-full h-9 px-3 rounded-md border text-sm transition-colors',
                    axisConfig.invertLimitSwitch 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-secondary border-input'
                  )}
                >
                  {axisConfig.invertLimitSwitch ? 'Inverted' : 'Normal'}
                </button>
              </div>
            </div>
          </div>
        )
      })}

      <div>
        <h3 className="text-lg font-semibold mb-4">Soft Limits</h3>
        <div className="flex gap-4">
          <button
            onClick={() => updateConfig('limits', { ...config.limits!, softLimitsEnabled: !config.limits?.softLimitsEnabled })}
            className={cn(
              'px-4 py-2 rounded-md border text-sm transition-colors',
              config.limits?.softLimitsEnabled 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-secondary border-input'
            )}
          >
            Soft Limits {config.limits?.softLimitsEnabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={() => updateConfig('limits', { ...config.limits!, hardLimitsEnabled: !config.limits?.hardLimitsEnabled })}
            className={cn(
              'px-4 py-2 rounded-md border text-sm transition-colors',
              config.limits?.hardLimitsEnabled 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-secondary border-input'
            )}
          >
            Hard Limits {config.limits?.hardLimitsEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SpindleTab({ config, updateConfig }: TabProps) {
  const spindle: SpindleConfig = config.spindle || {
    type: 'pwm',
    minRpm: 0,
    maxRpm: 24000,
    pwmMinValue: 0,
    pwmMaxValue: 255,
    spindleDelayMs: 2000,
    clockwise: 'M3',
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Spindle Type</h3>
        <div className="grid grid-cols-4 gap-2">
          {(['pwm', 'relay', 'vfd', 'manual'] as const).map(type => (
            <button
              key={type}
              onClick={() => updateConfig('spindle', { ...spindle, type })}
              className={cn(
                'px-4 py-3 rounded-md border text-sm transition-colors capitalize',
                spindle.type === type 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-secondary border-input hover:bg-accent'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Minimum RPM</label>
          <input
            type="number"
            value={spindle.minRpm}
            onChange={(e) => updateConfig('spindle', { ...spindle, minRpm: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Maximum RPM</label>
          <input
            type="number"
            value={spindle.maxRpm}
            onChange={(e) => updateConfig('spindle', { ...spindle, maxRpm: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
          />
        </div>
      </div>

      {spindle.type === 'pwm' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">PWM Min Value</label>
            <input
              type="number"
              value={spindle.pwmMinValue}
              onChange={(e) => updateConfig('spindle', { ...spindle, pwmMinValue: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">PWM Max Value</label>
            <input
              type="number"
              value={spindle.pwmMaxValue}
              onChange={(e) => updateConfig('spindle', { ...spindle, pwmMaxValue: Number(e.target.value) })}
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Spindle Delay (ms)</label>
        <p className="text-xs text-muted-foreground">Time to wait for spindle to reach speed before cutting</p>
        <input
          type="number"
          value={spindle.spindleDelayMs}
          onChange={(e) => updateConfig('spindle', { ...spindle, spindleDelayMs: Number(e.target.value) })}
          className="w-48 h-10 px-3 rounded-md bg-secondary border border-input"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Spindle Direction</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateConfig('spindle', { ...spindle, clockwise: 'M3' })}
            className={cn(
              'px-4 py-2 rounded-md border text-sm transition-colors',
              spindle.clockwise === 'M3' 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-secondary border-input'
            )}
          >
            M3 (Clockwise)
          </button>
          <button
            onClick={() => updateConfig('spindle', { ...spindle, clockwise: 'M4' })}
            className={cn(
              'px-4 py-2 rounded-md border text-sm transition-colors',
              spindle.clockwise === 'M4' 
                ? 'bg-primary text-primary-foreground border-primary' 
                : 'bg-secondary border-input'
            )}
          >
            M4 (Counter-Clockwise)
          </button>
        </div>
      </div>
    </div>
  )
}

function HomingTab({ config, updateConfig }: TabProps) {
  const homing = config.homing || {
    enabled: true,
    direction: { x: 'min' as const, y: 'min' as const, z: 'max' as const },
    seekRate: 1500,
    feedRate: 500,
    pullOff: 3,
    sequence: 'z-first' as const,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Homing Enabled</h3>
          <p className="text-sm text-muted-foreground">Enable automatic homing cycle</p>
        </div>
        <button
          onClick={() => updateConfig('homing', { ...homing, enabled: !homing.enabled })}
          className={cn(
            'px-4 py-2 rounded-md border text-sm transition-colors',
            homing.enabled 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-secondary border-input'
          )}
        >
          {homing.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {homing.enabled && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-4">Homing Direction</h3>
            <div className="grid grid-cols-3 gap-4">
              {(['x', 'y', 'z'] as const).map(axis => (
                <div key={axis} className="space-y-2">
                  <label className="text-sm text-muted-foreground uppercase">{axis} Axis</label>
                  <div className="flex gap-1">
                    <button
                      onClick={() => updateConfig('homing', {
                        ...homing,
                        direction: { ...homing.direction, [axis]: 'min' }
                      })}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-md border text-xs transition-colors',
                        homing.direction[axis] === 'min'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary border-input'
                      )}
                    >
                      Min (-)
                    </button>
                    <button
                      onClick={() => updateConfig('homing', {
                        ...homing,
                        direction: { ...homing.direction, [axis]: 'max' }
                      })}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-md border text-xs transition-colors',
                        homing.direction[axis] === 'max'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary border-input'
                      )}
                    >
                      Max (+)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Homing Sequence</h3>
            <div className="flex gap-2">
              {(['z-first', 'xy-first', 'all-together'] as const).map(seq => (
                <button
                  key={seq}
                  onClick={() => updateConfig('homing', { ...homing, sequence: seq })}
                  className={cn(
                    'px-4 py-2 rounded-md border text-sm transition-colors capitalize',
                    homing.sequence === seq
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-input'
                  )}
                >
                  {seq.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Seek Rate (mm/min)</label>
              <input
                type="number"
                value={homing.seekRate}
                onChange={(e) => updateConfig('homing', { ...homing, seekRate: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Feed Rate (mm/min)</label>
              <input
                type="number"
                value={homing.feedRate}
                onChange={(e) => updateConfig('homing', { ...homing, feedRate: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Pull-Off (mm)</label>
              <input
                type="number"
                value={homing.pullOff}
                onChange={(e) => updateConfig('homing', { ...homing, pullOff: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ProbeTab({ config, updateConfig }: TabProps) {
  const probe = config.probe || {
    enabled: true,
    type: 'touch-plate' as const,
    plateThickness: 15,
    diameter: 0,
    feedRate: 100,
    seekRate: 500,
    retract: 2,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Probing Enabled</h3>
          <p className="text-sm text-muted-foreground">Enable touch probe / touch plate functionality</p>
        </div>
        <button
          onClick={() => updateConfig('probe', { ...probe, enabled: !probe.enabled })}
          className={cn(
            'px-4 py-2 rounded-md border text-sm transition-colors',
            probe.enabled 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-secondary border-input'
          )}
        >
          {probe.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      {probe.enabled && (
        <>
          <div>
            <h3 className="text-lg font-semibold mb-4">Probe Type</h3>
            <div className="flex gap-2">
              {(['touch-plate', 'touch-probe', 'none'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => updateConfig('probe', { ...probe, type })}
                  className={cn(
                    'px-4 py-2 rounded-md border text-sm transition-colors capitalize',
                    probe.type === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary border-input'
                  )}
                >
                  {type.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          {probe.type === 'touch-plate' && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Touch Plate Thickness (mm)</label>
              <input
                type="number"
                step="0.1"
                value={probe.plateThickness}
                onChange={(e) => updateConfig('probe', { ...probe, plateThickness: Number(e.target.value) })}
                className="w-48 h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
          )}

          {probe.type === 'touch-probe' && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Probe Tip Diameter (mm)</label>
              <input
                type="number"
                step="0.1"
                value={probe.diameter}
                onChange={(e) => updateConfig('probe', { ...probe, diameter: Number(e.target.value) })}
                className="w-48 h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Seek Rate (mm/min)</label>
              <input
                type="number"
                value={probe.seekRate}
                onChange={(e) => updateConfig('probe', { ...probe, seekRate: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Feed Rate (mm/min)</label>
              <input
                type="number"
                value={probe.feedRate}
                onChange={(e) => updateConfig('probe', { ...probe, feedRate: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Retract (mm)</label>
              <input
                type="number"
                step="0.5"
                value={probe.retract}
                onChange={(e) => updateConfig('probe', { ...probe, retract: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PostProcessorTab({ config, updateConfig }: TabProps) {
  const post: PostProcessorConfig = (config as any).postProcessor || {
    name: 'GRBL',
    fileExtension: 'nc',
    lineEnding: '\n',
    programStart: ['G21 ; mm', 'G90 ; absolute'],
    programEnd: ['M5 ; spindle off', 'G0 Z10 ; raise Z', 'M30 ; end'],
    toolChangeStart: [],
    toolChangeEnd: [],
    useLineNumbers: false,
    lineNumberIncrement: 10,
    arcSupport: true,
    arcPlane: 'G17',
    decimalPlaces: 3,
    spindleSpeedInHeader: true,
    coolantSupport: false,
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Post Processor Name</label>
          <input
            type="text"
            value={post.name}
            onChange={(e) => updateConfig('postProcessor' as any, { ...post, name: e.target.value })}
            className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">File Extension</label>
          <input
            type="text"
            value={post.fileExtension}
            onChange={(e) => updateConfig('postProcessor' as any, { ...post, fileExtension: e.target.value })}
            className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Program Start</h3>
        <textarea
          value={post.programStart.join('\n')}
          onChange={(e) => updateConfig('postProcessor' as any, { ...post, programStart: e.target.value.split('\n') })}
          className="w-full h-24 px-3 py-2 rounded-md bg-secondary border border-input font-mono text-sm"
          placeholder="G-code commands to run at program start"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Program End</h3>
        <textarea
          value={post.programEnd.join('\n')}
          onChange={(e) => updateConfig('postProcessor' as any, { ...post, programEnd: e.target.value.split('\n') })}
          className="w-full h-24 px-3 py-2 rounded-md bg-secondary border border-input font-mono text-sm"
          placeholder="G-code commands to run at program end"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Decimal Places</label>
          <input
            type="number"
            min="1"
            max="6"
            value={post.decimalPlaces}
            onChange={(e) => updateConfig('postProcessor' as any, { ...post, decimalPlaces: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-md bg-secondary border border-input"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Arc Support</label>
          <button
            onClick={() => updateConfig('postProcessor' as any, { ...post, arcSupport: !post.arcSupport })}
            className={cn(
              'w-full h-10 px-3 rounded-md border text-sm transition-colors',
              post.arcSupport
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-input'
            )}
          >
            {post.arcSupport ? 'G2/G3 Arcs Enabled' : 'Linear Only'}
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => updateConfig('postProcessor' as any, { ...post, useLineNumbers: !post.useLineNumbers })}
          className={cn(
            'px-4 py-2 rounded-md border text-sm transition-colors',
            post.useLineNumbers
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary border-input'
          )}
        >
          Line Numbers {post.useLineNumbers ? 'On' : 'Off'}
        </button>
        <button
          onClick={() => updateConfig('postProcessor' as any, { ...post, coolantSupport: !post.coolantSupport })}
          className={cn(
            'px-4 py-2 rounded-md border text-sm transition-colors',
            post.coolantSupport
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary border-input'
          )}
        >
          Coolant {post.coolantSupport ? 'Supported' : 'Not Used'}
        </button>
      </div>
    </div>
  )
}
