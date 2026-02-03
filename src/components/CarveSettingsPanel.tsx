import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Settings2,
  Play,
  Eye,
  Pencil,
  Plus,
  Wrench,
  Sparkles,
  Box,
  Clock,
  AlertCircle
} from 'lucide-react'
import type { Tool } from '@/types/machine'

interface CarveSettingsPanelProps {
  onPreviewCarve: () => void
  onStartCarve: () => void
  onEditBit: (tool: Tool | null) => void
}

type MaterialType = 'hardwood' | 'softwood' | 'plywood' | 'mdf' | 'acrylic' | 'aluminum' | 'other'

const MATERIAL_PRESETS: { id: MaterialType; label: string; color: string }[] = [
  { id: 'hardwood', label: 'Hardwood', color: '#8B4513' },
  { id: 'softwood', label: 'Softwood', color: '#DEB887' },
  { id: 'plywood', label: 'Plywood', color: '#D2B48C' },
  { id: 'mdf', label: 'MDF', color: '#A0522D' },
  { id: 'acrylic', label: 'Acrylic', color: '#87CEEB' },
  { id: 'aluminum', label: 'Aluminum', color: '#C0C0C0' },
  { id: 'other', label: 'Other', color: '#808080' },
]

export function CarveSettingsPanel({ onPreviewCarve, onStartCarve, onEditBit }: CarveSettingsPanelProps) {
  const { project, tools } = useDesignStore()
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['material', 'bits', 'cut'])
  )
  const [useTwoBits, setUseTwoBits] = useState(false)
  const [roughingBitId, setRoughingBitId] = useState<string | null>(tools[0]?.id || null)
  const [finishingBitId, setFinishingBitId] = useState<string | null>(null)
  const [singleBitId, setSingleBitId] = useState<string | null>(tools[0]?.id || null)
  
  // Material settings
  const [materialType, setMaterialType] = useState<MaterialType>('hardwood')
  const [materialWidth, setMaterialWidth] = useState(300)
  const [materialHeight, setMaterialHeight] = useState(300)
  const [materialThickness, setMaterialThickness] = useState(18)
  
  // Cut settings
  const [cutDepth, setCutDepth] = useState(materialThickness)
  const [useTabs, setUseTabs] = useState(true)
  const [tabCount, setTabCount] = useState(4)
  const [tabWidth, setTabWidth] = useState(5)
  const [tabHeight, setTabHeight] = useState(2)

  if (!project) return null

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const selectedRoughingBit = tools.find(t => t.id === roughingBitId)
  const selectedFinishingBit = tools.find(t => t.id === finishingBitId)
  const selectedSingleBit = tools.find(t => t.id === singleBitId)

  // Calculate estimated time (rough estimate)
  const estimatedTime = (() => {
    const area = materialWidth * materialHeight
    const bit = useTwoBits ? selectedRoughingBit : selectedSingleBit
    if (!bit) return 0
    const feedRate = bit.defaultFeedRate || 1000
    const stepover = bit.defaultStepover || 40
    const stepoverMm = (stepover / 100) * bit.geometry.diameter
    const passes = Math.ceil(cutDepth / (bit.defaultDepthPerPass || 2))
    const pathLength = (area / stepoverMm) * passes
    return Math.round(pathLength / feedRate) // minutes
  })()

  const hasSelectedObjects = project.objects.some(obj => obj.selected)
  const canCarve = (useTwoBits ? (roughingBitId && finishingBitId) : singleBitId) && hasSelectedObjects

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Carve Settings
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Material Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('material')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Box className="w-4 h-4 text-muted-foreground" />
              Material
            </span>
            {expandedSections.has('material') ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {expandedSections.has('material') && (
            <div className="px-4 pb-4 space-y-3">
              {/* Material Type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Material Type</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as MaterialType)}
                  className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
                >
                  {MATERIAL_PRESETS.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Width</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={materialWidth}
                      onChange={(e) => setMaterialWidth(Number(e.target.value))}
                      className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Height</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={materialHeight}
                      onChange={(e) => setMaterialHeight(Number(e.target.value))}
                      className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Thickness</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={materialThickness}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setMaterialThickness(val)
                        if (cutDepth > val) setCutDepth(val)
                      }}
                      className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                  </div>
                </div>
              </div>

              {/* Material Preview */}
              <div 
                className="h-12 rounded border border-border flex items-center justify-center"
                style={{ backgroundColor: MATERIAL_PRESETS.find(m => m.id === materialType)?.color }}
              >
                <span className="text-xs text-white drop-shadow-md font-medium">
                  {materialWidth} × {materialHeight} × {materialThickness} mm
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bits Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('bits')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              Bits
            </span>
            {expandedSections.has('bits') ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {expandedSections.has('bits') && (
            <div className="px-4 pb-4 space-y-3">
              {/* Two Bits Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div 
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    useTwoBits ? "bg-primary" : "bg-muted"
                  )}
                  onClick={() => setUseTwoBits(!useTwoBits)}
                >
                  <div 
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      useTwoBits ? "translate-x-5" : "translate-x-0.5"
                    )}
                  />
                </div>
                <div>
                  <span className="text-sm font-medium">Use 2 bits</span>
                  <p className="text-xs text-muted-foreground">Roughing + finishing for better detail</p>
                </div>
              </label>

              {useTwoBits ? (
                <>
                  {/* Roughing Bit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        Roughing Bit (1st pass)
                      </label>
                      <button
                        onClick={() => onEditBit(selectedRoughingBit || null)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                    <select
                      value={roughingBitId || ''}
                      onChange={(e) => setRoughingBitId(e.target.value || null)}
                      className="w-full h-9 px-2 rounded bg-secondary border border-input text-sm"
                    >
                      <option value="">Select a bit...</option>
                      {tools.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.geometry.diameter}mm)
                        </option>
                      ))}
                    </select>
                    {selectedRoughingBit && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {selectedRoughingBit.geometry.numberOfFlutes}F • 
                        Feed: {selectedRoughingBit.defaultFeedRate} mm/min • 
                        RPM: {selectedRoughingBit.defaultSpindleSpeed}
                      </div>
                    )}
                  </div>

                  {/* Finishing Bit */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Finishing Bit (2nd pass)
                      </label>
                      <button
                        onClick={() => onEditBit(selectedFinishingBit || null)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                    <select
                      value={finishingBitId || ''}
                      onChange={(e) => setFinishingBitId(e.target.value || null)}
                      className="w-full h-9 px-2 rounded bg-secondary border border-input text-sm"
                    >
                      <option value="">Select a bit...</option>
                      {tools.filter(t => t.id !== roughingBitId).map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.geometry.diameter}mm)
                        </option>
                      ))}
                    </select>
                    {selectedFinishingBit && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        {selectedFinishingBit.geometry.numberOfFlutes}F • 
                        Feed: {selectedFinishingBit.defaultFeedRate} mm/min • 
                        RPM: {selectedFinishingBit.defaultSpindleSpeed}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Single Bit */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Select Bit</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditBit(selectedSingleBit || null)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => onEditBit(null)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        New
                      </button>
                    </div>
                  </div>
                  <select
                    value={singleBitId || ''}
                    onChange={(e) => setSingleBitId(e.target.value || null)}
                    className="w-full h-9 px-2 rounded bg-secondary border border-input text-sm"
                  >
                    <option value="">Select a bit...</option>
                    {tools.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.geometry.diameter}mm)
                      </option>
                    ))}
                  </select>
                  {selectedSingleBit && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 space-y-1">
                      <div className="flex justify-between">
                        <span>Diameter:</span>
                        <span className="font-medium">{selectedSingleBit.geometry.diameter}mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Flutes:</span>
                        <span className="font-medium">{selectedSingleBit.geometry.numberOfFlutes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Feed Rate:</span>
                        <span className="font-medium">{selectedSingleBit.defaultFeedRate} mm/min</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spindle:</span>
                        <span className="font-medium">{selectedSingleBit.defaultSpindleSpeed} RPM</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cut Settings Section */}
        <div className="border-b border-border">
          <button
            onClick={() => toggleSection('cut')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors"
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Cut Settings
            </span>
            {expandedSections.has('cut') ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          
          {expandedSections.has('cut') && (
            <div className="px-4 pb-4 space-y-3">
              {/* Cut Depth */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cut Depth</label>
                <div className="relative">
                  <input
                    type="number"
                    value={cutDepth}
                    onChange={(e) => setCutDepth(Math.min(Number(e.target.value), materialThickness))}
                    max={materialThickness}
                    className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
                <div className="flex justify-between mt-1">
                  <button 
                    onClick={() => setCutDepth(materialThickness)}
                    className="text-xs text-primary hover:underline"
                  >
                    Cut through
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Max: {materialThickness}mm
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useTabs}
                    onChange={(e) => setUseTabs(e.target.checked)}
                    className="rounded border-input"
                  />
                  <span className="text-sm">Use holding tabs</span>
                </label>
                
                {useTabs && (
                  <div className="grid grid-cols-3 gap-2 pl-6">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Count</label>
                      <input
                        type="number"
                        value={tabCount}
                        onChange={(e) => setTabCount(Number(e.target.value))}
                        min={1}
                        max={20}
                        className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Width</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tabWidth}
                          onChange={(e) => setTabWidth(Number(e.target.value))}
                          className="w-full h-7 px-2 pr-6 rounded bg-secondary border border-input text-xs"
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">mm</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Height</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={tabHeight}
                          onChange={(e) => setTabHeight(Number(e.target.value))}
                          className="w-full h-7 px-2 pr-6 rounded bg-secondary border border-input text-xs"
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">mm</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Estimate */}
        <div className="px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Estimated time:</span>
            <span className="font-medium">
              {estimatedTime > 60 
                ? `${Math.floor(estimatedTime / 60)}h ${estimatedTime % 60}m`
                : `${estimatedTime} min`
              }
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border space-y-2">
        {!hasSelectedObjects && (
          <div className="flex items-center gap-2 text-xs text-yellow-500 mb-2">
            <AlertCircle className="w-4 h-4" />
            Select objects to carve
          </div>
        )}
        
        <Button
          variant="outline"
          className="w-full"
          onClick={onPreviewCarve}
          disabled={!canCarve}
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview Carve
        </Button>
        
        <Button
          className="w-full"
          onClick={onStartCarve}
          disabled={!canCarve}
        >
          <Play className="w-4 h-4 mr-2" />
          Carve
        </Button>
      </div>
    </div>
  )
}
