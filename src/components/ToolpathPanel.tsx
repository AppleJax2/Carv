import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { 
  Route, 
  Plus, 
  Play, 
  Trash2, 
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Settings2,
  Layers,
  Wrench,
  Sparkles,
  ChevronLeft
} from 'lucide-react'
import type { Toolpath, ToolpathType } from '@/types/design'
import type { Tool } from '@/types/machine'

const TOOLPATH_TYPES: { id: ToolpathType; label: string; description: string }[] = [
  { id: 'profile', label: 'Profile', description: 'Cut along path outline' },
  { id: 'pocket', label: 'Pocket', description: 'Clear area inside path' },
  { id: 'drill', label: 'Drill', description: 'Drill holes at points' },
  { id: 'vcarve', label: 'V-Carve', description: 'V-bit carving' },
  { id: 'engrave', label: 'Engrave', description: 'Follow path at fixed depth' },
  { id: '3d-rough', label: '3D Rough', description: '3D roughing pass' },
  { id: '3d-finish', label: '3D Finish', description: '3D finishing pass' },
  { id: 'facing', label: 'Facing', description: 'Face/flatten surface' },
]

type BitWorkflow = 'single' | 'roughing-finishing'

interface NewToolpathState {
  step: 'type' | 'workflow' | 'bits'
  type: ToolpathType | null
  workflow: BitWorkflow
  roughingBitId: string | null
  finishingBitId: string | null
}

export function ToolpathPanel() {
  const {
    project,
    tools,
    selectedObjectIds,
    addToolpath,
    updateToolpath,
    deleteToolpath,
    setShowToolLibrary,
  } = useDesignStore()

  const [showNewToolpath, setShowNewToolpath] = useState(false)
  const [expandedToolpaths, setExpandedToolpaths] = useState<Set<string>>(new Set())
  const [newToolpathState, setNewToolpathState] = useState<NewToolpathState>({
    step: 'type',
    type: null,
    workflow: 'single',
    roughingBitId: null,
    finishingBitId: null,
  })

  if (!project) return null

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedToolpaths)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedToolpaths(newExpanded)
  }

  const resetNewToolpathState = () => {
    setNewToolpathState({
      step: 'type',
      type: null,
      workflow: 'single',
      roughingBitId: null,
      finishingBitId: null,
    })
  }

  const handleSelectType = (type: ToolpathType) => {
    if (selectedObjectIds.length === 0) {
      alert('Please select objects first')
      return
    }
    // For pocket and profile, offer roughing/finishing workflow
    if (type === 'pocket' || type === 'profile') {
      setNewToolpathState(prev => ({ ...prev, type, step: 'workflow' }))
    } else {
      // For other types, go straight to bit selection
      setNewToolpathState(prev => ({ ...prev, type, step: 'bits', workflow: 'single' }))
    }
  }

  const handleSelectWorkflow = (workflow: BitWorkflow) => {
    setNewToolpathState(prev => ({ ...prev, workflow, step: 'bits' }))
  }

  const createToolpathWithTool = (tool: Tool, isRoughing: boolean = false, isFinishing: boolean = false) => {
    const type = newToolpathState.type!
    const suffix = isRoughing ? ' (Roughing)' : isFinishing ? ' (Finishing)' : ''
    
    const newToolpath: Toolpath = {
      id: crypto.randomUUID(),
      name: `${TOOLPATH_TYPES.find(t => t.id === type)?.label || 'Toolpath'} ${project.toolpaths.length + 1}${suffix}`,
      type,
      enabled: true,
      order: project.toolpaths.length,
      sourceObjectIds: [...selectedObjectIds],
      toolId: tool.id,
      settings: {
        cutDepth: 5,
        depthPerPass: tool.defaultDepthPerPass || 2,
        feedRate: tool.defaultFeedRate,
        plungeRate: tool.defaultPlungeRate,
        spindleSpeed: tool.defaultSpindleSpeed,
        spindleDirection: 'cw',
        safeHeight: 10,
        profileSettings: type === 'profile' ? {
          cutSide: 'outside',
          direction: 'climb',
          leadIn: { enabled: false, type: 'arc', length: 5 },
          leadOut: { enabled: false, type: 'arc', length: 5 },
          tabs: { enabled: true, count: 4, width: 5, height: 2, useAutoPlacement: true },
          ramp: { enabled: true, type: 'helix', angle: 3 },
          allowance: isRoughing ? 0.5 : 0,
          separateFinalPass: false,
          finalPassAllowance: 0.1,
        } : undefined,
        pocketSettings: type === 'pocket' ? {
          direction: 'climb',
          stepover: isRoughing ? 50 : (tool.defaultStepover || 40),
          strategy: 'offset',
          startPoint: 'center',
          ramp: { enabled: true, type: 'helix', angle: 3 },
          allowance: isRoughing ? 0.5 : 0,
          separateFinalPass: false,
          finalPassAllowance: 0.1,
          restMachining: isFinishing ? { enabled: true, previousToolDiameter: 6 } : { enabled: false, previousToolDiameter: 6 },
        } : undefined,
      },
    }

    addToolpath(newToolpath)
    return newToolpath.id
  }

  const handleSelectBit = (tool: Tool) => {
    if (newToolpathState.workflow === 'single') {
      const id = createToolpathWithTool(tool)
      setShowNewToolpath(false)
      resetNewToolpathState()
      setExpandedToolpaths(new Set([...expandedToolpaths, id]))
    } else {
      // Roughing/finishing workflow
      if (!newToolpathState.roughingBitId) {
        setNewToolpathState(prev => ({ ...prev, roughingBitId: tool.id }))
      } else {
        // Create both toolpaths
        const roughingTool = tools.find(t => t.id === newToolpathState.roughingBitId)!
        const roughingId = createToolpathWithTool(roughingTool, true, false)
        const finishingId = createToolpathWithTool(tool, false, true)
        
        setShowNewToolpath(false)
        resetNewToolpathState()
        setExpandedToolpaths(new Set([...expandedToolpaths, roughingId, finishingId]))
      }
    }
  }

  const handleToolChange = (toolpathId: string, toolId: string) => {
    const tool = tools.find(t => t.id === toolId)
    if (!tool) return
    
    // Apply tool defaults when changing tool
    const toolpath = project.toolpaths.find(tp => tp.id === toolpathId)
    if (!toolpath) return

    updateToolpath(toolpathId, {
      toolId,
      settings: {
        ...toolpath.settings,
        feedRate: tool.defaultFeedRate,
        plungeRate: tool.defaultPlungeRate,
        spindleSpeed: tool.defaultSpindleSpeed,
        depthPerPass: tool.defaultDepthPerPass,
        pocketSettings: toolpath.settings.pocketSettings ? {
          ...toolpath.settings.pocketSettings,
          stepover: tool.defaultStepover,
        } : undefined,
      }
    })
  }

  const handleGenerateGcode = (toolpath: Toolpath) => {
    const tool = tools.find(t => t.id === toolpath.toolId)
    if (!tool) {
      alert('Please select a tool for this toolpath')
      return
    }
    // Open export dialog - user can generate from there
    useDesignStore.getState().setShowToolpathPanel(false)
    alert('Use the Export button in the header to generate G-code for all enabled toolpaths')
  }

  return (
    <Card className="h-full flex flex-col rounded-none border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Route className="w-4 h-4" />
            Toolpaths
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => setShowNewToolpath(!showNewToolpath)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2">
        {showNewToolpath && (
          <div className="mb-4 p-3 bg-accent/50 rounded-lg space-y-3">
            {/* Step indicator */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium flex items-center gap-2">
                {newToolpathState.step !== 'type' && (
                  <button 
                    onClick={() => {
                      if (newToolpathState.step === 'workflow') {
                        setNewToolpathState(prev => ({ ...prev, step: 'type', type: null }))
                      } else if (newToolpathState.step === 'bits') {
                        if (newToolpathState.workflow === 'roughing-finishing' && newToolpathState.roughingBitId) {
                          setNewToolpathState(prev => ({ ...prev, roughingBitId: null }))
                        } else {
                          setNewToolpathState(prev => ({ ...prev, step: newToolpathState.type === 'pocket' || newToolpathState.type === 'profile' ? 'workflow' : 'type' }))
                        }
                      }
                    }}
                    className="p-0.5 hover:bg-accent rounded"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                )}
                {newToolpathState.step === 'type' && 'Select Operation'}
                {newToolpathState.step === 'workflow' && 'Choose Workflow'}
                {newToolpathState.step === 'bits' && (
                  newToolpathState.workflow === 'roughing-finishing' 
                    ? (newToolpathState.roughingBitId ? 'Select Finishing Bit' : 'Select Roughing Bit')
                    : 'Select Bit'
                )}
              </div>
              <button 
                onClick={() => { setShowNewToolpath(false); resetNewToolpathState() }}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel
              </button>
            </div>

            {/* Step 1: Select operation type */}
            {newToolpathState.step === 'type' && (
              <>
                <div className="grid grid-cols-2 gap-1">
                  {TOOLPATH_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type.id)}
                      className="p-2 text-left rounded hover:bg-accent transition-colors"
                    >
                      <div className="text-xs font-medium">{type.label}</div>
                      <div className="text-[10px] text-muted-foreground">{type.description}</div>
                    </button>
                  ))}
                </div>
                {selectedObjectIds.length === 0 && (
                  <p className="text-[10px] text-yellow-500">Select objects first to create a toolpath</p>
                )}
              </>
            )}

            {/* Step 2: Choose workflow (single bit vs roughing/finishing) */}
            {newToolpathState.step === 'workflow' && (
              <div className="space-y-2">
                <button
                  onClick={() => handleSelectWorkflow('single')}
                  className="w-full p-3 text-left rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-xs font-medium">Single Bit</div>
                      <div className="text-[10px] text-muted-foreground">Use one bit for the entire operation</div>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectWorkflow('roughing-finishing')}
                  className="w-full p-3 text-left rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-xs font-medium">Roughing + Finishing</div>
                      <div className="text-[10px] text-muted-foreground">Large bit for roughing, smaller bit for detail</div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Step 3: Select bit(s) */}
            {newToolpathState.step === 'bits' && (
              <div className="space-y-2">
                {newToolpathState.workflow === 'roughing-finishing' && newToolpathState.roughingBitId && (
                  <div className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs">
                    <span className="text-green-500 font-medium">✓ Roughing:</span>{' '}
                    {tools.find(t => t.id === newToolpathState.roughingBitId)?.name}
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {tools.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground mb-2">No tools in library</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowToolLibrary(true)}
                        className="text-xs"
                      >
                        Open Tool Library
                      </Button>
                    </div>
                  ) : (
                    tools.map((tool) => (
                      <button
                        key={tool.id}
                        onClick={() => handleSelectBit(tool)}
                        className={cn(
                          "w-full p-2 text-left rounded hover:bg-accent transition-colors flex items-center gap-2",
                          newToolpathState.roughingBitId === tool.id && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={newToolpathState.roughingBitId === tool.id}
                      >
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-mono">
                          {tool.geometry.diameter.toFixed(1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{tool.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {tool.geometry.numberOfFlutes}F • {tool.defaultFeedRate} mm/min • {tool.defaultSpindleSpeed} RPM
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {project.toolpaths.length === 0 ? (
          <div className="text-center py-8">
            <Route className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No toolpaths yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select objects and click + to create a toolpath
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {project.toolpaths.map((toolpath) => {
              const isExpanded = expandedToolpaths.has(toolpath.id)
              const tool = tools.find(t => t.id === toolpath.toolId)

              return (
                <div key={toolpath.id} className="border border-border rounded-lg overflow-hidden">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                      toolpath.enabled ? 'bg-card' : 'bg-muted/50'
                    )}
                    onClick={() => toggleExpanded(toolpath.id)}
                  >
                    <button className="p-0.5">
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{toolpath.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {TOOLPATH_TYPES.find(t => t.id === toolpath.type)?.label} • {tool?.name || 'No tool'}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        updateToolpath(toolpath.id, { enabled: !toolpath.enabled })
                      }}
                      className="p-1 hover:bg-accent rounded"
                    >
                      {toolpath.enabled ? (
                        <Eye className="w-3 h-3" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-muted-foreground" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteToolpath(toolpath.id)
                      }}
                      className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="px-3 py-2 border-t border-border bg-background/50 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">Cut Depth</label>
                          <input
                            type="number"
                            value={toolpath.settings.cutDepth}
                            onChange={(e) => updateToolpath(toolpath.id, {
                              settings: { ...toolpath.settings, cutDepth: Number(e.target.value) }
                            })}
                            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Depth/Pass</label>
                          <input
                            type="number"
                            value={toolpath.settings.depthPerPass}
                            onChange={(e) => updateToolpath(toolpath.id, {
                              settings: { ...toolpath.settings, depthPerPass: Number(e.target.value) }
                            })}
                            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Feed Rate</label>
                          <input
                            type="number"
                            value={toolpath.settings.feedRate}
                            onChange={(e) => updateToolpath(toolpath.id, {
                              settings: { ...toolpath.settings, feedRate: Number(e.target.value) }
                            })}
                            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Spindle RPM</label>
                          <input
                            type="number"
                            value={toolpath.settings.spindleSpeed}
                            onChange={(e) => updateToolpath(toolpath.id, {
                              settings: { ...toolpath.settings, spindleSpeed: Number(e.target.value) }
                            })}
                            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-muted-foreground">Tool (changes apply tool defaults)</label>
                        <select
                          value={toolpath.toolId}
                          onChange={(e) => handleToolChange(toolpath.id, e.target.value)}
                          className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                        >
                          {tools.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.geometry.diameter}mm)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => handleGenerateGcode(toolpath)}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Generate
                        </Button>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <Settings2 className="w-3 h-3 mr-1" />
                          Advanced
                        </Button>
                      </div>

                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {toolpath.sourceObjectIds.length} object(s) selected
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
