import { useState, useEffect } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { useMachineStore } from '@/store/useMachineStore'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  MACHINE_PRESETS,
  PRESETS_BY_BRAND,
  BRANDS,
  findPresetById,
  inchToMm,
  mmToInch,
  type MachinePreset,
} from '@/lib/machinePresets'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Search,
  Settings2,
  Zap,
  X,
  Monitor,
  Box,
  ArrowRight,
} from 'lucide-react'
import type { MachineConfig } from '@/types/machine'

interface QuickSetupWizardProps {
  onClose: () => void
  onComplete: (config: MachineConfig) => void
  onAdvancedSetup?: () => void
}

type Unit = 'mm' | 'in'

interface WizardState {
  step: number
  selectedPresetId: string | null
  customMode: boolean
  unit: Unit
  workArea: {
    x: number
    y: number
    z: number
  }
  machineName: string
  searchQuery: string
}

const STEPS = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with your CNC' },
  { id: 'machine', title: 'Select Machine', description: 'Choose your CNC model' },
  { id: 'dimensions', title: 'Work Area', description: 'Confirm dimensions' },
  { id: 'complete', title: 'Complete', description: 'Ready to carve!' },
]

export function QuickSetupWizard({ onClose, onComplete, onAdvancedSetup }: QuickSetupWizardProps) {
  const { setMachineConfig } = useDesignStore()
  const { addMachine } = useMachineStore()
  
  const [state, setState] = useState<WizardState>({
    step: 0,
    selectedPresetId: null,
    customMode: false,
    unit: 'mm',
    workArea: { x: 300, y: 300, z: 80 },
    machineName: '',
    searchQuery: '',
  })

  const [animating, setAnimating] = useState(false)

  const selectedPreset = state.selectedPresetId 
    ? findPresetById(state.selectedPresetId) 
    : null

  // Update work area when preset is selected
  useEffect(() => {
    if (selectedPreset) {
      setState(s => ({
        ...s,
        workArea: { ...selectedPreset.workArea },
        machineName: `${selectedPreset.brand} ${selectedPreset.model}`,
      }))
    }
  }, [selectedPreset])

  const convertToDisplay = (mm: number): number => {
    return state.unit === 'in' ? Math.round(mmToInch(mm) * 100) / 100 : Math.round(mm * 10) / 10
  }

  const convertFromDisplay = (value: number): number => {
    return state.unit === 'in' ? inchToMm(value) : value
  }

  const handleNext = () => {
    if (state.step < STEPS.length - 1) {
      setAnimating(true)
      setTimeout(() => {
        setState(s => ({ ...s, step: s.step + 1 }))
        setAnimating(false)
      }, 150)
    }
  }

  const handleBack = () => {
    if (state.step > 0) {
      setAnimating(true)
      setTimeout(() => {
        setState(s => ({ ...s, step: s.step - 1 }))
        setAnimating(false)
      }, 150)
    }
  }

  const handleSelectPreset = (presetId: string) => {
    setState(s => ({ ...s, selectedPresetId: presetId, customMode: false }))
  }

  const handleCustomMode = () => {
    setState(s => ({ 
      ...s, 
      selectedPresetId: null, 
      customMode: true,
      machineName: 'My Custom CNC',
    }))
  }

  const handleUnitChange = (unit: Unit) => {
    setState(s => ({ ...s, unit }))
  }

  const handleDimensionChange = (axis: 'x' | 'y' | 'z', displayValue: number) => {
    const mmValue = convertFromDisplay(displayValue)
    setState(s => ({
      ...s,
      workArea: { ...s.workArea, [axis]: mmValue },
    }))
  }

  const handleComplete = () => {
    const config: MachineConfig = {
      id: crypto.randomUUID(),
      name: state.machineName || 'My CNC',
      workspace: {
        width: state.workArea.x,
        depth: state.workArea.y,
        height: state.workArea.z,
        originPosition: 'front-left',
      },
      workArea: state.workArea,
      axes: {
        x: { maxTravel: state.workArea.x, maxRate: 5000, acceleration: 500, stepsPerMm: 80, invertDirection: false, invertLimitSwitch: false },
        y: { maxTravel: state.workArea.y, maxRate: 5000, acceleration: 500, stepsPerMm: 80, invertDirection: false, invertLimitSwitch: false },
        z: { maxTravel: state.workArea.z, maxRate: 3000, acceleration: 300, stepsPerMm: 400, invertDirection: false, invertLimitSwitch: false },
      },
      spindle: {
        type: 'manual',
        minRpm: 10000,
        maxRpm: 24000,
        pwmMinValue: 0,
        pwmMaxValue: 1000,
        spindleDelayMs: 3000,
        clockwise: 'M3',
      },
      homing: {
        enabled: true,
        direction: { x: 'max', y: 'max', z: 'max' },
        seekRate: 1500,
        feedRate: 500,
        pullOff: 3,
        sequence: 'z-first',
      },
      probe: {
        enabled: true,
        type: 'touch-plate',
        plateThickness: 15,
        diameter: 0,
        feedRate: 100,
        seekRate: 500,
        retract: 5,
      },
      limits: {
        softLimitsEnabled: true,
        hardLimitsEnabled: false,
      },
      rapids: {
        xy: selectedPreset?.maxFeedRate?.xy || 5000,
        z: selectedPreset?.maxFeedRate?.z || 3000,
      },
      safeHeight: 10,
      firmware: 'grbl',
      postProcessor: {
        name: 'GRBL',
        fileExtension: 'nc',
        lineEnding: '\n',
        programStart: ['G21', 'G90'],
        programEnd: ['M5', 'G0 Z10', 'M30'],
        toolChangeStart: [],
        toolChangeEnd: [],
        useLineNumbers: false,
        lineNumberIncrement: 10,
        arcSupport: true,
        arcPlane: 'G17',
        decimalPlaces: 3,
        spindleSpeedInHeader: true,
        coolantSupport: false,
      },
    }

    // Save to stores
    setMachineConfig(config)
    addMachine(state.machineName || 'My CNC', config)

    onComplete(config)
  }

  const filteredPresets = state.searchQuery
    ? MACHINE_PRESETS.filter(p =>
        p.brand.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        p.model.toLowerCase().includes(state.searchQuery.toLowerCase())
      )
    : MACHINE_PRESETS

  const canProceed = () => {
    switch (state.step) {
      case 0: return true
      case 1: return state.selectedPresetId !== null || state.customMode
      case 2: return state.workArea.x > 0 && state.workArea.y > 0 && state.workArea.z > 0
      case 3: return true
      default: return false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Quick Setup</h2>
              <p className="text-sm text-muted-foreground">
                {STEPS[state.step].description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 border-b border-border/50 bg-muted/30">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      index < state.step && "bg-primary text-primary-foreground",
                      index === state.step && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                      index > state.step && "bg-muted text-muted-foreground"
                    )}
                  >
                    {index < state.step ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className={cn(
                    "text-sm hidden sm:block",
                    index <= state.step ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className={cn(
          "flex-1 overflow-y-auto p-6 transition-opacity duration-150",
          animating && "opacity-0"
        )}>
          {/* Step 0: Welcome */}
          {state.step === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Monitor className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Welcome to Carv!</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Let's get your CNC machine set up. This quick wizard will help you configure 
                your workspace in just a few steps.
              </p>
              <div className="flex flex-col gap-3 max-w-xs mx-auto">
                <Button size="lg" onClick={handleNext} className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                {onAdvancedSetup && (
                  <Button variant="outline" onClick={onAdvancedSetup} className="w-full">
                    <Settings2 className="w-4 h-4 mr-2" />
                    Advanced Setup
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Select Machine */}
          {state.step === 1 && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search machines..."
                  value={state.searchQuery}
                  onChange={(e) => setState(s => ({ ...s, searchQuery: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Machine List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {state.searchQuery ? (
                  // Search results
                  <div className="grid gap-2">
                    {filteredPresets.map(preset => (
                      <MachineCard
                        key={preset.id}
                        preset={preset}
                        selected={state.selectedPresetId === preset.id}
                        onClick={() => handleSelectPreset(preset.id)}
                        unit={state.unit}
                      />
                    ))}
                    {filteredPresets.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No machines found matching "{state.searchQuery}"
                      </p>
                    )}
                  </div>
                ) : (
                  // Grouped by brand
                  BRANDS.map(brand => (
                    <div key={brand}>
                      <h4 className="text-sm font-semibold text-muted-foreground mb-2">{brand}</h4>
                      <div className="grid gap-2">
                        {PRESETS_BY_BRAND[brand].map(preset => (
                          <MachineCard
                            key={preset.id}
                            preset={preset}
                            selected={state.selectedPresetId === preset.id}
                            onClick={() => handleSelectPreset(preset.id)}
                            unit={state.unit}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Custom option */}
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={handleCustomMode}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 border-dashed text-left transition-all",
                      state.customMode
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Settings2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">Custom Machine</p>
                        <p className="text-sm text-muted-foreground">
                          Enter dimensions manually
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Unit Toggle */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Units:</span>
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => handleUnitChange('mm')}
                    className={cn(
                      "px-3 py-1 text-sm transition-colors",
                      state.unit === 'mm' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    mm
                  </button>
                  <button
                    onClick={() => handleUnitChange('in')}
                    className={cn(
                      "px-3 py-1 text-sm transition-colors",
                      state.unit === 'in' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    inches
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Confirm Dimensions */}
          {state.step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-1">Confirm Your Work Area</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPreset 
                    ? `Based on ${selectedPreset.brand} ${selectedPreset.model}. Adjust if needed.`
                    : 'Enter your machine\'s cutting dimensions.'}
                </p>
              </div>

              {/* Machine Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Machine Name</label>
                <input
                  type="text"
                  value={state.machineName}
                  onChange={(e) => setState(s => ({ ...s, machineName: e.target.value }))}
                  className="w-full px-4 py-2 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="My CNC Machine"
                />
              </div>

              {/* Unit Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Display Units</label>
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    onClick={() => handleUnitChange('mm')}
                    className={cn(
                      "px-4 py-1.5 text-sm transition-colors",
                      state.unit === 'mm' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    Millimeters
                  </button>
                  <button
                    onClick={() => handleUnitChange('in')}
                    className={cn(
                      "px-4 py-1.5 text-sm transition-colors",
                      state.unit === 'in' ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    Inches
                  </button>
                </div>
              </div>

              {/* Dimension Inputs */}
              <div className="grid grid-cols-3 gap-4">
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis}>
                    <label className="block text-sm font-medium mb-2 capitalize">
                      {axis === 'x' ? 'Width (X)' : axis === 'y' ? 'Depth (Y)' : 'Height (Z)'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={convertToDisplay(state.workArea[axis])}
                        onChange={(e) => handleDimensionChange(axis, parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 pr-12 bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg"
                        min={0}
                        step={state.unit === 'in' ? 0.5 : 10}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {state.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Visual Preview */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Box className="w-5 h-5 text-primary" />
                  <span className="font-medium">Work Area Preview</span>
                </div>
                <div className="flex items-end justify-center gap-8 h-32">
                  <div 
                    className="bg-primary/20 border-2 border-primary/50 rounded relative"
                    style={{
                      width: Math.min(200, state.workArea.x / 5),
                      height: Math.min(100, state.workArea.y / 10),
                    }}
                  >
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
                      {convertToDisplay(state.workArea.x)} × {convertToDisplay(state.workArea.y)} {state.unit}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="bg-primary/20 border-2 border-primary/50 rounded w-8"
                      style={{ height: Math.min(80, state.workArea.z) }}
                    />
                    <span className="text-xs text-muted-foreground mt-1">
                      Z: {convertToDisplay(state.workArea.z)} {state.unit}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Complete */}
          {state.step === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">You're All Set!</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Your machine is configured and ready to use. You can always adjust 
                these settings later in Machine Setup.
              </p>
              
              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-4 max-w-sm mx-auto text-left mb-6">
                <h4 className="font-medium mb-3">Configuration Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Machine:</span>
                    <span className="font-medium">{state.machineName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Work Area:</span>
                    <span className="font-medium">
                      {convertToDisplay(state.workArea.x)} × {convertToDisplay(state.workArea.y)} × {convertToDisplay(state.workArea.z)} {state.unit}
                    </span>
                  </div>
                  {selectedPreset && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Controller:</span>
                      <span className="font-medium">{selectedPreset.controller}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
          <div>
            {state.step > 0 && state.step < STEPS.length - 1 && (
              <Button variant="ghost" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {state.step < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                {state.step === 0 ? 'Get Started' : 'Continue'}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                <Check className="w-4 h-4 mr-1" />
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Machine Card Component
function MachineCard({ 
  preset, 
  selected, 
  onClick,
  unit,
}: { 
  preset: MachinePreset
  selected: boolean
  onClick: () => void
  unit: Unit
}) {
  const formatDimension = (mm: number) => {
    if (unit === 'in') {
      return `${Math.round(mmToInch(mm) * 10) / 10}"`
    }
    return `${Math.round(mm)}mm`
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg border text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{preset.model}</p>
          <p className="text-sm text-muted-foreground">
            {formatDimension(preset.workArea.x)} × {formatDimension(preset.workArea.y)} × {formatDimension(preset.workArea.z)}
          </p>
        </div>
        {selected && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  )
}
