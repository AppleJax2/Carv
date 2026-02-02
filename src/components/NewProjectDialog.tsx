import { useState, useCallback } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { useMachineStore, type DimensionSource } from '@/store/useMachineStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { 
  FolderPlus, 
  X,
  Ruler,
  FileText,
  Cpu,
  PenLine,
  Settings2,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewProjectDialogProps {
  onClose: () => void
  onCreated?: () => void
}

// Conversion constants
const MM_PER_INCH = 25.4

// Convert value between units
const convertUnits = (value: number, from: 'mm' | 'inch', to: 'mm' | 'inch'): number => {
  if (from === to) return value
  if (from === 'mm' && to === 'inch') return value / MM_PER_INCH
  if (from === 'inch' && to === 'mm') return value * MM_PER_INCH
  return value
}

// Round to reasonable precision based on unit
const roundForUnit = (value: number, unit: 'mm' | 'inch'): number => {
  if (unit === 'mm') return Math.round(value * 10) / 10 // 1 decimal place for mm
  return Math.round(value * 1000) / 1000 // 3 decimal places for inches
}

export function NewProjectDialog({ onClose, onCreated }: NewProjectDialogProps) {
  const { createNewProject } = useDesignStore()
  const { 
    savedMachines, 
    newProjectDefaults,
    setDimensionSource,
    setSelectedMachineId,
    setManualDimensions,
    setDefaultUnit,
    setDefaultMaterialThickness,
  } = useMachineStore()
  
  const [projectName, setProjectName] = useState('Untitled Project')
  const [dimensionSource, setLocalDimensionSource] = useState<DimensionSource>(newProjectDefaults.dimensionSource)
  const [selectedMachineId, setLocalSelectedMachineId] = useState<string | null>(newProjectDefaults.selectedMachineId)
  const [manualWidth, setManualWidth] = useState(newProjectDefaults.manualWidth)
  const [manualHeight, setManualHeight] = useState(newProjectDefaults.manualHeight)
  const [unit, setUnit] = useState<'mm' | 'inch'>(newProjectDefaults.unit)
  // Material thickness is stored in mm, convert to display unit on init
  const [materialThickness, setMaterialThickness] = useState(() => {
    const storedMm = newProjectDefaults.defaultMaterialThickness
    return newProjectDefaults.unit === 'inch' 
      ? roundForUnit(storedMm / MM_PER_INCH, 'inch')
      : storedMm
  })

  // Handle unit change with conversion
  const handleUnitChange = useCallback((newUnit: 'mm' | 'inch') => {
    if (newUnit === unit) return
    
    // Convert all values to the new unit
    setManualWidth(roundForUnit(convertUnits(manualWidth, unit, newUnit), newUnit))
    setManualHeight(roundForUnit(convertUnits(manualHeight, unit, newUnit), newUnit))
    setMaterialThickness(roundForUnit(convertUnits(materialThickness, unit, newUnit), newUnit))
    setUnit(newUnit)
  }, [unit, manualWidth, manualHeight, materialThickness])

  // Get dimensions based on source
  const getDimensions = () => {
    if (dimensionSource === 'machine' && selectedMachineId) {
      const machine = savedMachines.find(m => m.id === selectedMachineId)
      if (machine) {
        return {
          width: machine.config.workspace.width,
          height: machine.config.workspace.depth,
        }
      }
    }
    return { width: manualWidth, height: manualHeight }
  }

  const dimensions = getDimensions()

  const handleCreate = () => {
    // Persist preferences (store values in current display unit)
    setDimensionSource(dimensionSource)
    if (dimensionSource === 'machine') {
      setSelectedMachineId(selectedMachineId)
    } else {
      setManualDimensions(manualWidth, manualHeight)
      setDefaultUnit(unit)
    }
    // Store material thickness in mm for persistence
    const thicknessInMm = unit === 'inch' ? materialThickness * MM_PER_INCH : materialThickness
    setDefaultMaterialThickness(thicknessInMm)

    // Calculate final dimensions (always in mm for internal use)
    const finalWidth = unit === 'inch' && dimensionSource === 'manual' 
      ? dimensions.width * MM_PER_INCH 
      : dimensions.width
    const finalHeight = unit === 'inch' && dimensionSource === 'manual' 
      ? dimensions.height * MM_PER_INCH 
      : dimensions.height
    
    createNewProject(projectName, finalWidth, finalHeight)
    onCreated?.()
    onClose()
  }

  const selectedMachine = savedMachines.find(m => m.id === selectedMachineId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[550px]">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              New Project
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              className="w-full h-10 px-3 rounded-md bg-secondary border border-input text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              <Ruler className="w-4 h-4" />
              Workspace Dimensions
            </label>
            
            {/* Dimension Source Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setLocalDimensionSource('machine')}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                  dimensionSource === 'machine'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <Cpu className={cn(
                  'w-5 h-5',
                  dimensionSource === 'machine' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div>
                  <div className="text-sm font-medium">From Machine</div>
                  <div className="text-xs text-muted-foreground">Use saved machine dimensions</div>
                </div>
              </button>
              
              <button
                onClick={() => setLocalDimensionSource('manual')}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                  dimensionSource === 'manual'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <PenLine className={cn(
                  'w-5 h-5',
                  dimensionSource === 'manual' ? 'text-primary' : 'text-muted-foreground'
                )} />
                <div>
                  <div className="text-sm font-medium">Manual Entry</div>
                  <div className="text-xs text-muted-foreground">Specify custom dimensions</div>
                </div>
              </button>
            </div>

            {/* Machine Selection */}
            {dimensionSource === 'machine' && (
              <div className="space-y-2">
                {savedMachines.length === 0 ? (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <Settings2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">No machines configured yet</p>
                    <p className="text-xs text-muted-foreground">
                      Go to Machine Setup to add your CNC machine, or use manual dimensions.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {savedMachines.map((machine) => (
                      <button
                        key={machine.id}
                        onClick={() => setLocalSelectedMachineId(machine.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-lg border transition-all',
                          selectedMachineId === machine.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Cpu className={cn(
                            'w-4 h-4',
                            selectedMachineId === machine.id ? 'text-primary' : 'text-muted-foreground'
                          )} />
                          <div className="text-left">
                            <div className="text-sm font-medium">{machine.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {machine.config.workspace.width} × {machine.config.workspace.depth} mm
                            </div>
                          </div>
                        </div>
                        {selectedMachineId === machine.id && (
                          <ChevronRight className="w-4 h-4 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manual Dimensions */}
            {dimensionSource === 'manual' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Width</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={manualWidth}
                      onChange={(e) => setManualWidth(Number(e.target.value))}
                      min="10"
                      className="w-full h-8 px-2 rounded-l-md bg-secondary border border-input text-sm"
                    />
                    <span className="h-8 px-2 flex items-center bg-muted border border-l-0 border-input rounded-r-md text-xs text-muted-foreground">
                      {unit}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Height</label>
                  <div className="flex">
                    <input
                      type="number"
                      value={manualHeight}
                      onChange={(e) => setManualHeight(Number(e.target.value))}
                      min="10"
                      className="w-full h-8 px-2 rounded-l-md bg-secondary border border-input text-sm"
                    />
                    <span className="h-8 px-2 flex items-center bg-muted border border-l-0 border-input rounded-r-md text-xs text-muted-foreground">
                      {unit}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Units</label>
                  <select
                    value={unit}
                    onChange={(e) => handleUnitChange(e.target.value as 'mm' | 'inch')}
                    className="w-full h-8 px-2 rounded-md bg-secondary border border-input text-sm"
                  >
                    <option value="mm">Millimeters</option>
                    <option value="inch">Inches</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Material Thickness</label>
            <div className="flex">
              <input
                type="number"
                value={materialThickness}
                onChange={(e) => setMaterialThickness(Number(e.target.value))}
                min={unit === 'mm' ? 1 : 0.04}
                step={unit === 'mm' ? 0.5 : 0.0625}
                className="w-full h-8 px-2 rounded-l-md bg-secondary border border-input text-sm"
              />
              <select
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value as 'mm' | 'inch')}
                className="h-8 px-2 bg-muted border border-l-0 border-input rounded-r-md text-xs text-muted-foreground cursor-pointer hover:bg-muted/80"
              >
                <option value="mm">mm</option>
                <option value="inch">in</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-accent/50 rounded-lg text-sm text-muted-foreground">
            <div className="font-medium text-foreground mb-1">Project will be created with:</div>
            <ul className="space-y-1 text-xs">
              <li>• Workspace: {dimensions.width} × {dimensions.height} {dimensionSource === 'manual' ? unit : 'mm'}</li>
              {dimensionSource === 'machine' && selectedMachine && (
                <li>• Machine: {selectedMachine.name}</li>
              )}
              <li>• Material thickness: {materialThickness} {unit}</li>
              <li>• Auto-save enabled</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleCreate} 
              disabled={!projectName.trim() || (dimensionSource === 'machine' && !selectedMachineId && savedMachines.length > 0)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
