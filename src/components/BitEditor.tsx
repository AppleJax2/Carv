import { useState } from 'react'
import { Button } from './ui/button'
import {
  X,
  Save,
  Trash2,
  Wrench,
  Info
} from 'lucide-react'
import type { Tool, ToolType } from '@/types/machine'

interface BitEditorProps {
  tool: Tool | null  // null = creating new tool
  onClose: () => void
  onSave: (tool: Tool) => void
  onDelete?: (toolId: string) => void
}

const TOOL_TYPES: { id: ToolType; label: string; description: string }[] = [
  { id: 'flat-end-mill', label: 'Flat End Mill', description: 'Square bottom, general purpose' },
  { id: 'ball-end-mill', label: 'Ball End Mill', description: 'Rounded tip for 3D carving' },
  { id: 'v-bit', label: 'V-Bit', description: 'V-shaped for carving and chamfers' },
  { id: 'bull-nose', label: 'Bull Nose', description: 'Rounded corners, blend of flat and ball' },
  { id: 'engraving-bit', label: 'Engraving Bit', description: 'Fine point for detail work' },
  { id: 'drill', label: 'Drill Bit', description: 'For drilling holes' },
  { id: 'chamfer', label: 'Chamfer Mill', description: 'Angled edge for chamfers' },
  { id: 'face-mill', label: 'Face Mill', description: 'Large diameter for surfacing' },
]

export function BitEditor({ tool, onClose, onSave, onDelete }: BitEditorProps) {
  const isNew = !tool

  // Form state
  const [name, setName] = useState(tool?.name || '')
  const [type, setType] = useState<ToolType>(tool?.type || 'flat-end-mill')
  const [diameter, setDiameter] = useState(tool?.geometry.diameter || 6.35)
  const [fluteLength, setFluteLength] = useState(tool?.geometry.fluteLength || 25)
  const [overallLength, setOverallLength] = useState(tool?.geometry.overallLength || 50)
  const [shankDiameter, setShankDiameter] = useState(tool?.geometry.shankDiameter || 6.35)
  const [numberOfFlutes, setNumberOfFlutes] = useState(tool?.geometry.numberOfFlutes || 2)
  const [tipAngle, setTipAngle] = useState(tool?.geometry.tipAngle || 90)
  const [cornerRadius, setCornerRadius] = useState(tool?.geometry.cornerRadius || 0)
  
  // Speeds and feeds
  const [feedRate, setFeedRate] = useState(tool?.defaultFeedRate || 1500)
  const [plungeRate, setPlungeRate] = useState(tool?.defaultPlungeRate || 500)
  const [spindleSpeed, setSpindleSpeed] = useState(tool?.defaultSpindleSpeed || 18000)
  const [depthPerPass, setDepthPerPass] = useState(tool?.defaultDepthPerPass || 2)
  const [stepover, setStepover] = useState(tool?.defaultStepover || 40)
  
  const [notes, setNotes] = useState(tool?.notes || '')

  const needsTipAngle = type === 'v-bit' || type === 'drill' || type === 'engraving-bit' || type === 'chamfer'
  const needsCornerRadius = type === 'bull-nose'

  const handleSave = () => {
    const newTool: Tool = {
      id: tool?.id || crypto.randomUUID(),
      name: name || `Custom ${TOOL_TYPES.find(t => t.id === type)?.label}`,
      type,
      geometry: {
        diameter,
        fluteLength,
        overallLength,
        shankDiameter,
        numberOfFlutes,
        ...(needsTipAngle && { tipAngle }),
        ...(needsCornerRadius && { cornerRadius }),
      },
      defaultFeedRate: feedRate,
      defaultPlungeRate: plungeRate,
      defaultSpindleSpeed: spindleSpeed,
      defaultDepthPerPass: depthPerPass,
      defaultStepover: stepover,
      notes,
    }
    onSave(newTool)
  }

  const handleDelete = () => {
    if (tool && onDelete && confirm('Delete this bit from your library?')) {
      onDelete(tool.id)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            {isNew ? 'Add New Bit' : 'Edit Bit'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium mb-1 block">Bit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My 1/4&quot; Flat End Mill"
              className="w-full h-9 px-3 rounded bg-secondary border border-input text-sm"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-sm font-medium mb-1 block">Bit Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ToolType)}
              className="w-full h-9 px-3 rounded bg-secondary border border-input text-sm"
            >
              {TOOL_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {TOOL_TYPES.find(t => t.id === type)?.description}
            </p>
          </div>

          {/* Geometry Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-2">
              Geometry
              <Info className="w-3 h-3 text-muted-foreground" />
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cutting Diameter</label>
                <div className="relative">
                  <input
                    type="number"
                    value={diameter}
                    onChange={(e) => setDiameter(Number(e.target.value))}
                    step="0.1"
                    className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Shank Diameter</label>
                <div className="relative">
                  <input
                    type="number"
                    value={shankDiameter}
                    onChange={(e) => setShankDiameter(Number(e.target.value))}
                    step="0.1"
                    className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Flute Length</label>
                <div className="relative">
                  <input
                    type="number"
                    value={fluteLength}
                    onChange={(e) => setFluteLength(Number(e.target.value))}
                    step="0.5"
                    className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Overall Length</label>
                <div className="relative">
                  <input
                    type="number"
                    value={overallLength}
                    onChange={(e) => setOverallLength(Number(e.target.value))}
                    step="1"
                    className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Number of Flutes</label>
                <input
                  type="number"
                  value={numberOfFlutes}
                  onChange={(e) => setNumberOfFlutes(Number(e.target.value))}
                  min={1}
                  max={8}
                  className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
                />
              </div>

              {needsTipAngle && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tip Angle</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={tipAngle}
                      onChange={(e) => setTipAngle(Number(e.target.value))}
                      min={10}
                      max={180}
                      className="w-full h-8 px-2 pr-6 rounded bg-secondary border border-input text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">°</span>
                  </div>
                </div>
              )}

              {needsCornerRadius && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Corner Radius</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cornerRadius}
                      onChange={(e) => setCornerRadius(Number(e.target.value))}
                      step="0.1"
                      min={0}
                      className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Speeds & Feeds Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Default Speeds & Feeds</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Feed Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    value={feedRate}
                    onChange={(e) => setFeedRate(Number(e.target.value))}
                    step="100"
                    className="w-full h-8 px-2 pr-16 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm/min</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Plunge Rate</label>
                <div className="relative">
                  <input
                    type="number"
                    value={plungeRate}
                    onChange={(e) => setPlungeRate(Number(e.target.value))}
                    step="50"
                    className="w-full h-8 px-2 pr-16 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm/min</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Spindle Speed</label>
                <div className="relative">
                  <input
                    type="number"
                    value={spindleSpeed}
                    onChange={(e) => setSpindleSpeed(Number(e.target.value))}
                    step="1000"
                    className="w-full h-8 px-2 pr-12 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RPM</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Depth per Pass</label>
                <div className="relative">
                  <input
                    type="number"
                    value={depthPerPass}
                    onChange={(e) => setDepthPerPass(Number(e.target.value))}
                    step="0.5"
                    className="w-full h-8 px-2 pr-8 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Stepover</label>
                <div className="relative">
                  <input
                    type="number"
                    value={stepover}
                    onChange={(e) => setStepover(Number(e.target.value))}
                    min={5}
                    max={100}
                    className="w-full h-8 px-2 pr-6 rounded bg-secondary border border-input text-sm"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this bit..."
              rows={2}
              className="w-full px-3 py-2 rounded bg-secondary border border-input text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          {!isNew && onDelete ? (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          ) : (
            <div />
          )}
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              {isNew ? 'Add to Library' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
