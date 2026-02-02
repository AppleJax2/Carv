import { useState } from 'react'
import { useProjectStore } from '@/store/useProjectStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Box, 
  Layers, 
  Target, 
  Ruler, 
  Plus, 
  Trash2, 
  Copy,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Settings2,
} from 'lucide-react'
import type { Setup, StockDefinition, WorkCoordinateSystem, OriginPosition } from '@/types/project'
import { cn } from '@/lib/utils'

interface SetupPanelProps {
  onClose?: () => void
}

export function SetupPanel({ onClose }: SetupPanelProps) {
  const { 
    project, 
    activeSetupId, 
    setActiveSetup,
    addSetup,
    updateSetup,
    deleteSetup,
    duplicateSetup,
    updateStock,
    updateWCS,
    materials,
  } = useProjectStore()

  const [expandedSetups, setExpandedSetups] = useState<Set<string>>(new Set([activeSetupId || '']))

  if (!project) return null

  const activeSetup = project.setups.find(s => s.id === activeSetupId)

  const toggleSetupExpanded = (id: string) => {
    const newExpanded = new Set(expandedSetups)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedSetups(newExpanded)
  }

  const handleAddSetup = () => {
    const setup = addSetup()
    setActiveSetup(setup.id)
    setExpandedSetups(new Set([...expandedSetups, setup.id]))
  }

  const handleDuplicateSetup = (id: string) => {
    const setup = duplicateSetup(id)
    setActiveSetup(setup.id)
    setExpandedSetups(new Set([...expandedSetups, setup.id]))
  }

  const handleDeleteSetup = (id: string) => {
    if (project.setups.length <= 1) return
    deleteSetup(id)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Setups
        </h2>
        <Button variant="ghost" size="icon-sm" onClick={handleAddSetup}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {project.setups.map((setup, index) => (
          <div 
            key={setup.id}
            className={cn(
              'border-b border-border',
              activeSetupId === setup.id && 'bg-accent/50'
            )}
          >
            <div 
              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent/30"
              onClick={() => {
                setActiveSetup(setup.id)
                toggleSetupExpanded(setup.id)
              }}
            >
              <GripVertical className="w-3 h-3 text-muted-foreground" />
              <button onClick={(e) => { e.stopPropagation(); toggleSetupExpanded(setup.id) }}>
                {expandedSetups.has(setup.id) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
              <span className="flex-1 text-sm font-medium">{setup.name}</span>
              <span className="text-xs text-muted-foreground">
                {setup.operations.length} ops
              </span>
              <Button 
                variant="ghost" 
                size="icon-sm"
                onClick={(e) => { e.stopPropagation(); handleDuplicateSetup(setup.id) }}
              >
                <Copy className="w-3 h-3" />
              </Button>
              {project.setups.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="icon-sm"
                  onClick={(e) => { e.stopPropagation(); handleDeleteSetup(setup.id) }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>

            {expandedSetups.has(setup.id) && (
              <div className="p-3 bg-background/50">
                <Tabs defaultValue="stock" className="w-full">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="stock" className="text-xs">
                      <Box className="w-3 h-3 mr-1" />
                      Stock
                    </TabsTrigger>
                    <TabsTrigger value="wcs" className="text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      Origin
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs">
                      <Settings2 className="w-3 h-3 mr-1" />
                      Settings
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="stock" className="mt-3 space-y-3">
                    <StockEditor 
                      stock={setup.stock} 
                      onChange={(stock) => updateStock(setup.id, stock)}
                      materials={materials}
                    />
                  </TabsContent>

                  <TabsContent value="wcs" className="mt-3 space-y-3">
                    <WCSEditor 
                      wcs={setup.workCoordinateSystem}
                      onChange={(wcs) => updateWCS(setup.id, wcs)}
                    />
                  </TabsContent>

                  <TabsContent value="settings" className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Setup Name</Label>
                      <Input 
                        value={setup.name}
                        onChange={(e) => updateSetup(setup.id, { name: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Notes</Label>
                      <textarea 
                        value={setup.notes}
                        onChange={(e) => updateSetup(setup.id, { notes: e.target.value })}
                        className="w-full h-20 p-2 text-sm border rounded-md bg-background resize-none"
                        placeholder="Setup notes..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface StockEditorProps {
  stock: StockDefinition
  onChange: (stock: Partial<StockDefinition>) => void
  materials: any[]
}

function StockEditor({ stock, onChange, materials }: StockEditorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Stock Type</Label>
        <Select 
          value={stock.type} 
          onValueChange={(value: any) => onChange({ type: value })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rectangular">Rectangular</SelectItem>
            <SelectItem value="cylindrical">Cylindrical</SelectItem>
            <SelectItem value="from-model">From Model</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Width (X)</Label>
          <Input 
            type="number"
            value={stock.dimensions.width}
            onChange={(e) => onChange({ 
              dimensions: { ...stock.dimensions, width: parseFloat(e.target.value) || 0 }
            })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Height (Y)</Label>
          <Input 
            type="number"
            value={stock.dimensions.height}
            onChange={(e) => onChange({ 
              dimensions: { ...stock.dimensions, height: parseFloat(e.target.value) || 0 }
            })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Thickness (Z)</Label>
          <Input 
            type="number"
            value={stock.dimensions.thickness}
            onChange={(e) => onChange({ 
              dimensions: { ...stock.dimensions, thickness: parseFloat(e.target.value) || 0 }
            })}
            className="h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Material</Label>
        <Select 
          value={stock.material.id}
          onValueChange={(value) => {
            const material = materials.find(m => m.id === value)
            if (material) {
              onChange({ material: { id: material.id, name: material.name, thickness: stock.dimensions.thickness } })
            }
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plywood">Plywood</SelectItem>
            <SelectItem value="mdf">MDF</SelectItem>
            <SelectItem value="hardwood">Hardwood</SelectItem>
            <SelectItem value="softwood">Softwood</SelectItem>
            <SelectItem value="acrylic">Acrylic</SelectItem>
            <SelectItem value="aluminum">Aluminum</SelectItem>
            <SelectItem value="hdpe">HDPE</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Grain Direction</Label>
        <Select 
          value={stock.grainDirection || 'none'}
          onValueChange={(value: any) => onChange({ grainDirection: value })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="x">Along X (horizontal)</SelectItem>
            <SelectItem value="y">Along Y (vertical)</SelectItem>
            <SelectItem value="none">No grain / N/A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2 border-t border-border">
        <Label className="text-xs text-muted-foreground">Stock Offset</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="space-y-1">
            <Label className="text-xs">Top</Label>
            <Input 
              type="number"
              value={stock.offset.top}
              onChange={(e) => onChange({ 
                offset: { ...stock.offset, top: parseFloat(e.target.value) || 0 }
              })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bottom</Label>
            <Input 
              type="number"
              value={stock.offset.bottom}
              onChange={(e) => onChange({ 
                offset: { ...stock.offset, bottom: parseFloat(e.target.value) || 0 }
              })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sides</Label>
            <Input 
              type="number"
              value={stock.offset.sides}
              onChange={(e) => onChange({ 
                offset: { ...stock.offset, sides: parseFloat(e.target.value) || 0 }
              })}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface WCSEditorProps {
  wcs: WorkCoordinateSystem
  onChange: (wcs: Partial<WorkCoordinateSystem>) => void
}

function WCSEditor({ wcs, onChange }: WCSEditorProps) {
  const originPositions: { value: OriginPosition; label: string }[] = [
    { value: 'front-left', label: 'Front Left' },
    { value: 'front-right', label: 'Front Right' },
    { value: 'back-left', label: 'Back Left' },
    { value: 'back-right', label: 'Back Right' },
    { value: 'center', label: 'Center' },
    { value: 'custom', label: 'Custom' },
  ]

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="text-xs">Origin Position</Label>
        <Select 
          value={wcs.origin}
          onValueChange={(value: OriginPosition) => onChange({ origin: value })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {originPositions.map(pos => (
              <SelectItem key={pos.value} value={pos.value}>{pos.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-5 gap-1 p-2 bg-muted/50 rounded-md">
        {['back-left', 'back-right'].map(pos => (
          <button
            key={pos}
            className={cn(
              'w-8 h-8 rounded border-2 transition-colors',
              wcs.origin === pos 
                ? 'border-primary bg-primary/20' 
                : 'border-muted-foreground/30 hover:border-primary/50'
            )}
            onClick={() => onChange({ origin: pos as OriginPosition })}
          />
        ))}
        <div />
        {['front-left', 'center', 'front-right'].map(pos => (
          <button
            key={pos}
            className={cn(
              'w-8 h-8 rounded border-2 transition-colors',
              pos === 'center' && 'col-start-3',
              wcs.origin === pos 
                ? 'border-primary bg-primary/20' 
                : 'border-muted-foreground/30 hover:border-primary/50'
            )}
            onClick={() => onChange({ origin: pos as OriginPosition })}
          />
        ))}
      </div>

      {wcs.origin === 'custom' && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">X</Label>
            <Input 
              type="number"
              value={wcs.customOrigin?.x || 0}
              onChange={(e) => onChange({ 
                customOrigin: { 
                  ...wcs.customOrigin, 
                  x: parseFloat(e.target.value) || 0,
                  y: wcs.customOrigin?.y || 0,
                  z: wcs.customOrigin?.z || 0,
                }
              })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Y</Label>
            <Input 
              type="number"
              value={wcs.customOrigin?.y || 0}
              onChange={(e) => onChange({ 
                customOrigin: { 
                  ...wcs.customOrigin, 
                  x: wcs.customOrigin?.x || 0,
                  y: parseFloat(e.target.value) || 0,
                  z: wcs.customOrigin?.z || 0,
                }
              })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Z</Label>
            <Input 
              type="number"
              value={wcs.customOrigin?.z || 0}
              onChange={(e) => onChange({ 
                customOrigin: { 
                  ...wcs.customOrigin, 
                  x: wcs.customOrigin?.x || 0,
                  y: wcs.customOrigin?.y || 0,
                  z: parseFloat(e.target.value) || 0,
                }
              })}
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">Z Zero Position</Label>
        <Select 
          value={wcs.zZeroPosition}
          onValueChange={(value: any) => onChange({ zZeroPosition: value })}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top">Top of Stock</SelectItem>
            <SelectItem value="bottom">Bottom of Stock</SelectItem>
            <SelectItem value="wasteboard">Wasteboard Surface</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2 border-t border-border space-y-2">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox"
            id="use-probe"
            checked={wcs.probeSettings?.useProbe || false}
            onChange={(e) => onChange({ 
              probeSettings: { 
                ...wcs.probeSettings,
                useProbe: e.target.checked,
                probeType: wcs.probeSettings?.probeType || 'touch-plate',
                plateThickness: wcs.probeSettings?.plateThickness || 19,
              }
            })}
            className="rounded"
          />
          <Label htmlFor="use-probe" className="text-xs">Use probe for Z</Label>
        </div>

        {wcs.probeSettings?.useProbe && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Probe Type</Label>
              <Select 
                value={wcs.probeSettings.probeType}
                onValueChange={(value: any) => onChange({ 
                  probeSettings: { ...wcs.probeSettings!, probeType: value }
                })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="touch-plate">Touch Plate</SelectItem>
                  <SelectItem value="xyz-probe">XYZ Probe</SelectItem>
                  <SelectItem value="tool-setter">Tool Setter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Plate Thickness</Label>
              <Input 
                type="number"
                value={wcs.probeSettings.plateThickness}
                onChange={(e) => onChange({ 
                  probeSettings: { 
                    ...wcs.probeSettings!, 
                    plateThickness: parseFloat(e.target.value) || 0 
                  }
                })}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SetupPanel
