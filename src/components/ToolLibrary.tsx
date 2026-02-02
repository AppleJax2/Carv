import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { Card, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Copy, 
  Edit2, 
  X,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ShoppingCart
} from 'lucide-react'
import type { Tool, ToolType } from '@/types/machine'
import { getAffiliatesForToolType } from '@/lib/affiliates'

interface ToolLibraryProps {
  onClose: () => void
}

const TOOL_TYPES: { id: ToolType; label: string }[] = [
  { id: 'flat-end-mill', label: 'Flat End Mill' },
  { id: 'ball-end-mill', label: 'Ball End Mill' },
  { id: 'bull-nose', label: 'Bull Nose' },
  { id: 'v-bit', label: 'V-Bit' },
  { id: 'engraving-bit', label: 'Engraving Bit' },
  { id: 'drill', label: 'Drill Bit' },
  { id: 'chamfer', label: 'Chamfer' },
  { id: 'face-mill', label: 'Face Mill' },
  { id: 'custom', label: 'Custom' },
]

export function ToolLibrary({ onClose }: ToolLibraryProps) {
  const { tools, setTools } = useDesignStore()
  
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [expandedTypes, setExpandedTypes] = useState<Set<ToolType>>(new Set(['flat-end-mill', 'v-bit']))

  const selectedTool = tools.find(t => t.id === selectedToolId)

  const toggleType = (type: ToolType) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(type)) {
      newExpanded.delete(type)
    } else {
      newExpanded.add(type)
    }
    setExpandedTypes(newExpanded)
  }

  const handleAddTool = () => {
    const newTool: Tool = {
      id: crypto.randomUUID(),
      name: 'New Tool',
      type: 'flat-end-mill',
      geometry: {
        diameter: 6,
        fluteLength: 20,
        overallLength: 50,
        shankDiameter: 6,
        numberOfFlutes: 2,
      },
      defaultFeedRate: 1000,
      defaultPlungeRate: 500,
      defaultSpindleSpeed: 18000,
      defaultDepthPerPass: 2,
      defaultStepover: 40,
      notes: '',
    }
    setTools([...tools, newTool])
    setSelectedToolId(newTool.id)
    setEditingTool(newTool)
  }

  const handleDuplicateTool = () => {
    if (!selectedTool) return
    const newTool: Tool = {
      ...JSON.parse(JSON.stringify(selectedTool)),
      id: crypto.randomUUID(),
      name: `${selectedTool.name} (Copy)`,
    }
    setTools([...tools, newTool])
    setSelectedToolId(newTool.id)
  }

  const handleDeleteTool = () => {
    if (!selectedToolId) return
    setTools(tools.filter(t => t.id !== selectedToolId))
    setSelectedToolId(null)
    setEditingTool(null)
  }

  const handleSaveTool = () => {
    if (!editingTool) return
    setTools(tools.map(t => t.id === editingTool.id ? editingTool : t))
    setEditingTool(null)
  }

  const handleExportLibrary = () => {
    const json = JSON.stringify(tools, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tool-library.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportLibrary = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const imported = JSON.parse(text) as Tool[]
        if (Array.isArray(imported)) {
          const newTools = imported.map(t => ({
            ...t,
            id: crypto.randomUUID(),
          }))
          setTools([...tools, ...newTools])
        }
      } catch (err) {
        console.error('Failed to import tools:', err)
      }
    }
    input.click()
  }

  const groupedTools = TOOL_TYPES.map(type => ({
    ...type,
    tools: tools.filter(t => t.type === type.id),
  }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[900px] h-[600px] flex flex-col">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Tool Library
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleImportLibrary}>
                <Upload className="w-4 h-4 mr-1" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportLibrary}>
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <div className="flex-1 flex overflow-hidden">
          <div className="w-64 border-r border-border p-2 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Tools</span>
              <Button variant="ghost" size="icon-sm" onClick={handleAddTool}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-1">
              {groupedTools.map((group) => (
                <div key={group.id}>
                  <button
                    onClick={() => toggleType(group.id)}
                    className="w-full flex items-center gap-1 px-2 py-1 text-sm text-muted-foreground hover:bg-accent rounded"
                  >
                    {expandedTypes.has(group.id) ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    {group.label}
                    <span className="ml-auto text-xs">({group.tools.length})</span>
                  </button>

                  {expandedTypes.has(group.id) && (
                    <div className="ml-4 space-y-0.5">
                      {group.tools.map((tool) => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setSelectedToolId(tool.id)
                            setEditingTool(null)
                          }}
                          className={cn(
                            'w-full text-left px-2 py-1 text-sm rounded transition-colors',
                            selectedToolId === tool.id
                              ? 'bg-primary/20 text-primary'
                              : 'hover:bg-accent'
                          )}
                        >
                          <div className="truncate">{tool.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Ø{tool.geometry.diameter}mm
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {editingTool ? (
              <ToolEditor
                tool={editingTool}
                onChange={setEditingTool}
                onSave={handleSaveTool}
                onCancel={() => setEditingTool(null)}
              />
            ) : selectedTool ? (
              <ToolDetails
                tool={selectedTool}
                onEdit={() => setEditingTool(selectedTool)}
                onDuplicate={handleDuplicateTool}
                onDelete={handleDeleteTool}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a tool or create a new one
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

interface ToolDetailsProps {
  tool: Tool
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function ToolDetails({ tool, onEdit, onDuplicate, onDelete }: ToolDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{tool.name}</h2>
          <p className="text-sm text-muted-foreground">
            {TOOL_TYPES.find(t => t.id === tool.type)?.label}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-1" />
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="w-32 h-48 bg-accent/50 rounded-lg flex items-center justify-center">
          <ToolPreview tool={tool} />
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Geometry</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diameter</span>
                <span>{tool.geometry.diameter} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Flute Length</span>
                <span>{tool.geometry.fluteLength} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Overall Length</span>
                <span>{tool.geometry.overallLength} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shank Diameter</span>
                <span>{tool.geometry.shankDiameter} mm</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Number of Flutes</span>
                <span>{tool.geometry.numberOfFlutes}</span>
              </div>
              {tool.geometry.tipAngle && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tip Angle</span>
                  <span>{tool.geometry.tipAngle}°</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Default Speeds & Feeds</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Feed Rate</span>
                <span>{tool.defaultFeedRate} mm/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plunge Rate</span>
                <span>{tool.defaultPlungeRate} mm/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Spindle Speed</span>
                <span>{tool.defaultSpindleSpeed} RPM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AffiliateLinks toolType={tool.type} />
    </div>
  )
}

function AffiliateLinks({ toolType }: { toolType: ToolType }) {
  const affiliateType = toolType.includes('v-bit') ? 'v-bit' 
    : toolType.includes('ball') ? 'ball-nose'
    : toolType.includes('drill') ? 'drill'
    : 'end-mill'
  
  const affiliates = getAffiliatesForToolType(affiliateType)
  
  if (affiliates.length === 0) return null

  return (
    <div className="mt-6 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Where to Buy</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Affiliate</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {affiliates.map((affiliate, i) => (
          <a
            key={i}
            href={affiliate.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-md border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors text-sm"
          >
            <div>
              <div className="font-medium">{affiliate.manufacturer}</div>
              {affiliate.priceRange && (
                <div className="text-xs text-muted-foreground">{affiliate.priceRange}</div>
              )}
            </div>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Links may earn Carv a small commission at no extra cost to you.
      </p>
    </div>
  )
}

interface ToolEditorProps {
  tool: Tool
  onChange: (tool: Tool) => void
  onSave: () => void
  onCancel: () => void
}

function ToolEditor({ tool, onChange, onSave, onCancel }: ToolEditorProps) {
  const updateGeometry = (key: string, value: number) => {
    onChange({
      ...tool,
      geometry: { ...tool.geometry, [key]: value },
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Edit Tool</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Name</label>
            <input
              type="text"
              value={tool.name}
              onChange={(e) => onChange({ ...tool, name: e.target.value })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Type</label>
            <select
              value={tool.type}
              onChange={(e) => onChange({ ...tool, type: e.target.value as ToolType })}
              className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
            >
              {TOOL_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>

          <h3 className="text-sm font-medium pt-2">Geometry</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Diameter (mm)</label>
              <input
                type="number"
                value={tool.geometry.diameter}
                onChange={(e) => updateGeometry('diameter', Number(e.target.value))}
                step="0.1"
                min="0.1"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Flute Length (mm)</label>
              <input
                type="number"
                value={tool.geometry.fluteLength}
                onChange={(e) => updateGeometry('fluteLength', Number(e.target.value))}
                step="1"
                min="1"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Overall Length (mm)</label>
              <input
                type="number"
                value={tool.geometry.overallLength}
                onChange={(e) => updateGeometry('overallLength', Number(e.target.value))}
                step="1"
                min="1"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Shank Diameter (mm)</label>
              <input
                type="number"
                value={tool.geometry.shankDiameter}
                onChange={(e) => updateGeometry('shankDiameter', Number(e.target.value))}
                step="0.1"
                min="0.1"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Number of Flutes</label>
              <input
                type="number"
                value={tool.geometry.numberOfFlutes}
                onChange={(e) => updateGeometry('numberOfFlutes', Number(e.target.value))}
                step="1"
                min="1"
                max="8"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
            {(tool.type === 'v-bit' || tool.type === 'chamfer' || tool.type === 'drill') && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tip Angle (°)</label>
                <input
                  type="number"
                  value={tool.geometry.tipAngle || 60}
                  onChange={(e) => updateGeometry('tipAngle', Number(e.target.value))}
                  step="1"
                  min="10"
                  max="180"
                  className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Default Speeds & Feeds</h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Feed Rate (mm/min)</label>
              <input
                type="number"
                value={tool.defaultFeedRate}
                onChange={(e) => onChange({ ...tool, defaultFeedRate: Number(e.target.value) })}
                step="100"
                min="100"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Plunge Rate (mm/min)</label>
              <input
                type="number"
                value={tool.defaultPlungeRate}
                onChange={(e) => onChange({ ...tool, defaultPlungeRate: Number(e.target.value) })}
                step="50"
                min="50"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Spindle Speed (RPM)</label>
              <input
                type="number"
                value={tool.defaultSpindleSpeed}
                onChange={(e) => onChange({ ...tool, defaultSpindleSpeed: Number(e.target.value) })}
                step="1000"
                min="1000"
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-medium mb-3">Preview</h3>
            <div className="w-full h-48 bg-accent/50 rounded-lg flex items-center justify-center">
              <ToolPreview tool={tool} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolPreview({ tool }: { tool: Tool }) {
  const { diameter, fluteLength, overallLength, shankDiameter } = tool.geometry
  
  const scale = 120 / overallLength
  const scaledDiameter = diameter * scale
  const scaledFluteLength = fluteLength * scale
  const scaledOverallLength = overallLength * scale
  const scaledShankDiameter = shankDiameter * scale

  const shankLength = scaledOverallLength - scaledFluteLength

  return (
    <svg width="80" height="140" viewBox="0 0 80 140">
      <rect
        x={(80 - scaledShankDiameter) / 2}
        y={10}
        width={scaledShankDiameter}
        height={shankLength}
        fill="#888"
        stroke="#666"
        strokeWidth="1"
      />

      {tool.type === 'v-bit' || tool.type === 'chamfer' ? (
        <polygon
          points={`
            ${(80 - scaledDiameter) / 2},${10 + shankLength}
            ${(80 + scaledDiameter) / 2},${10 + shankLength}
            ${40},${10 + shankLength + scaledFluteLength}
          `}
          fill="#4a9eff"
          stroke="#2d7ad6"
          strokeWidth="1"
        />
      ) : tool.type === 'ball-end-mill' ? (
        <>
          <rect
            x={(80 - scaledDiameter) / 2}
            y={10 + shankLength}
            width={scaledDiameter}
            height={scaledFluteLength - scaledDiameter / 2}
            fill="#4a9eff"
            stroke="#2d7ad6"
            strokeWidth="1"
          />
          <ellipse
            cx={40}
            cy={10 + shankLength + scaledFluteLength - scaledDiameter / 2}
            rx={scaledDiameter / 2}
            ry={scaledDiameter / 2}
            fill="#4a9eff"
            stroke="#2d7ad6"
            strokeWidth="1"
          />
        </>
      ) : tool.type === 'drill' ? (
        <>
          <rect
            x={(80 - scaledDiameter) / 2}
            y={10 + shankLength}
            width={scaledDiameter}
            height={scaledFluteLength - scaledDiameter}
            fill="#4a9eff"
            stroke="#2d7ad6"
            strokeWidth="1"
          />
          <polygon
            points={`
              ${(80 - scaledDiameter) / 2},${10 + shankLength + scaledFluteLength - scaledDiameter}
              ${(80 + scaledDiameter) / 2},${10 + shankLength + scaledFluteLength - scaledDiameter}
              ${40},${10 + shankLength + scaledFluteLength}
            `}
            fill="#4a9eff"
            stroke="#2d7ad6"
            strokeWidth="1"
          />
        </>
      ) : (
        <rect
          x={(80 - scaledDiameter) / 2}
          y={10 + shankLength}
          width={scaledDiameter}
          height={scaledFluteLength}
          fill="#4a9eff"
          stroke="#2d7ad6"
          strokeWidth="1"
        />
      )}
    </svg>
  )
}
