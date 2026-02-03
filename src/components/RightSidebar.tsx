import { useState, useMemo } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { cn } from '@/lib/utils'
import {
  Layers,
  Sliders,
  FileText,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link,
  Unlink,
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  RotateCcw,
  Square,
  Circle,
  Type,
  Pencil,
  Image,
  Box,
  Grid3X3,
  Ruler,
  Move,
} from 'lucide-react'
import type { VectorShape, TextObject, DesignObject } from '@/types/design'

// ============================================================================
// Selection Info Component
// ============================================================================

function SelectionInfo() {
  const { project, selectedObjectIds } = useDesignStore()

  if (!project) return null

  const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  const count = selectedObjects.length

  if (count === 0) {
    return (
      <div className="px-3 py-2 bg-muted/30 border-b border-border">
        <p className="text-xs text-muted-foreground">No selection</p>
      </div>
    )
  }

  // Calculate bounding box for selection
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  selectedObjects.forEach(obj => {
    const x = obj.transform.x
    const y = obj.transform.y
    // Approximate bounds
    minX = Math.min(minX, x - 50)
    minY = Math.min(minY, y - 50)
    maxX = Math.max(maxX, x + 50)
    maxY = Math.max(maxY, y + 50)
  })

  const width = maxX - minX
  const height = maxY - minY

  // Get type icon
  const getTypeIcon = (obj: DesignObject) => {
    switch (obj.type) {
      case 'shape': return <Square className="w-3 h-3" />
      case 'text': return <Type className="w-3 h-3" />
      case 'path': return <Pencil className="w-3 h-3" />
      case 'image': return <Image className="w-3 h-3" />
      case 'model3d': return <Box className="w-3 h-3" />
      default: return <Square className="w-3 h-3" />
    }
  }

  return (
    <div className="px-3 py-2 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-2">
        {count === 1 ? (
          <>
            {getTypeIcon(selectedObjects[0])}
            <span className="text-sm font-medium truncate">{selectedObjects[0].name}</span>
            <span className="text-xs text-muted-foreground capitalize">({selectedObjects[0].type})</span>
          </>
        ) : (
          <>
            <Layers className="w-3 h-3" />
            <span className="text-sm font-medium">{count} objects selected</span>
          </>
        )}
      </div>
      {count > 0 && (
        <div className="mt-1 text-[10px] text-muted-foreground">
          Bounds: {width.toFixed(0)} × {height.toFixed(0)} mm
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Transform Section
// ============================================================================

function TransformSection() {
  const { project, selectedObjectIds, updateObject } = useDesignStore()
  const [scaleLinked, setScaleLinked] = useState(true)

  if (!project) return null

  const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  const singleSelection = selectedObjects.length === 1 ? selectedObjects[0] : null

  if (!singleSelection) {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground">
          {selectedObjects.length === 0 
            ? 'Select an object to edit transform' 
            : 'Multiple selection - transform not available'}
        </p>
      </div>
    )
  }

  const transform = singleSelection.transform

  const handleTransformChange = (key: keyof typeof transform, value: number) => {
    const newTransform = { ...transform, [key]: value }
    
    // Handle linked scale
    if (scaleLinked && (key === 'scaleX' || key === 'scaleY')) {
      const ratio = value / transform[key]
      if (key === 'scaleX') {
        newTransform.scaleY = transform.scaleY * ratio
      } else {
        newTransform.scaleX = transform.scaleX * ratio
      }
    }
    
    updateObject(singleSelection.id, { transform: newTransform })
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Move className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium">Transform</span>
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">X</Label>
          <Input
            type="number"
            value={transform.x.toFixed(2)}
            onChange={(e) => handleTransformChange('x', Number(e.target.value))}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Y</Label>
          <Input
            type="number"
            value={transform.y.toFixed(2)}
            onChange={(e) => handleTransformChange('y', Number(e.target.value))}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {/* Rotation */}
      <div>
        <Label className="text-[10px] text-muted-foreground">Rotation (°)</Label>
        <Input
          type="number"
          value={transform.rotation.toFixed(1)}
          onChange={(e) => handleTransformChange('rotation', Number(e.target.value))}
          className="h-7 text-xs"
        />
      </div>

      {/* Scale */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Scale</Label>
          <Button
            variant="ghost"
            size="icon"
            className="w-5 h-5"
            onClick={() => setScaleLinked(!scaleLinked)}
            title={scaleLinked ? 'Unlink scale' : 'Link scale'}
          >
            {scaleLinked ? <Link className="w-3 h-3" /> : <Unlink className="w-3 h-3" />}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">X</Label>
            <Input
              type="number"
              value={transform.scaleX.toFixed(2)}
              onChange={(e) => handleTransformChange('scaleX', Number(e.target.value))}
              step={0.1}
              min={0.01}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Y</Label>
            <Input
              type="number"
              value={transform.scaleY.toFixed(2)}
              onChange={(e) => handleTransformChange('scaleY', Number(e.target.value))}
              step={0.1}
              min={0.01}
              className="h-7 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1 pt-2 border-t border-border">
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => handleTransformChange('scaleX', -transform.scaleX)}
          title="Flip Horizontal"
        >
          <FlipHorizontal className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => handleTransformChange('scaleY', -transform.scaleY)}
          title="Flip Vertical"
        >
          <FlipVertical className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => handleTransformChange('rotation', transform.rotation + 90)}
          title="Rotate 90° CW"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => handleTransformChange('rotation', transform.rotation - 90)}
          title="Rotate 90° CCW"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7"
          onClick={() => updateObject(singleSelection.id, {
            transform: { ...transform, rotation: 0, scaleX: 1, scaleY: 1 }
          })}
          title="Reset Transform"
        >
          <span className="text-[10px] font-bold">R</span>
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Appearance Section
// ============================================================================

function AppearanceSection() {
  const { project, selectedObjectIds, updateObject } = useDesignStore()

  if (!project) return null

  const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  const singleSelection = selectedObjects.length === 1 ? selectedObjects[0] : null

  if (!singleSelection) return null

  const style = singleSelection.style

  return (
    <div className="p-3 space-y-3 border-t border-border">
      <div className="flex items-center gap-2">
        <Circle className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium">Appearance</span>
      </div>

      {/* Fill */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Fill</Label>
          <input
            type="checkbox"
            checked={!!style.fillColor}
            onChange={(e) => updateObject(singleSelection.id, {
              style: { ...style, fillColor: e.target.checked ? '#3b82f6' : null }
            })}
            className="w-3.5 h-3.5"
          />
        </div>
        {style.fillColor && (
          <div className="flex gap-2">
            <input
              type="color"
              value={style.fillColor}
              onChange={(e) => updateObject(singleSelection.id, {
                style: { ...style, fillColor: e.target.value }
              })}
              className="w-8 h-7 rounded cursor-pointer border border-input"
            />
            <Input
              type="number"
              value={Math.round(style.fillOpacity * 100)}
              onChange={(e) => updateObject(singleSelection.id, {
                style: { ...style, fillOpacity: Number(e.target.value) / 100 }
              })}
              min={0}
              max={100}
              className="h-7 text-xs flex-1"
              placeholder="Opacity %"
            />
          </div>
        )}
      </div>

      {/* Stroke */}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Stroke</Label>
        <div className="flex gap-2">
          <input
            type="color"
            value={style.strokeColor || '#000000'}
            onChange={(e) => updateObject(singleSelection.id, {
              style: { ...style, strokeColor: e.target.value }
            })}
            className="w-8 h-7 rounded cursor-pointer border border-input"
          />
          <Input
            type="number"
            value={style.strokeWidth}
            onChange={(e) => updateObject(singleSelection.id, {
              style: { ...style, strokeWidth: Number(e.target.value) }
            })}
            min={0}
            step={0.5}
            className="h-7 text-xs flex-1"
            placeholder="Width"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Shape Properties Section
// ============================================================================

function ShapePropertiesSection() {
  const { project, selectedObjectIds, updateObject } = useDesignStore()

  if (!project) return null

  const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  const singleSelection = selectedObjects.length === 1 ? selectedObjects[0] : null

  if (!singleSelection || singleSelection.type !== 'shape') return null

  const shape = singleSelection as VectorShape
  const params = shape.params as unknown as Record<string, number>

  const handleParamChange = (key: string, value: number) => {
    updateObject(singleSelection.id, {
      params: { ...params, [key]: value }
    } as any)
  }

  return (
    <div className="p-3 space-y-3 border-t border-border">
      <div className="flex items-center gap-2">
        <Square className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium">Shape</span>
      </div>

      {shape.shapeType === 'rectangle' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={(params.width || 0).toFixed(2)}
              onChange={(e) => handleParamChange('width', Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Height</Label>
            <Input
              type="number"
              value={(params.height || 0).toFixed(2)}
              onChange={(e) => handleParamChange('height', Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px] text-muted-foreground">Corner Radius</Label>
            <Input
              type="number"
              value={(params.cornerRadius || 0).toFixed(2)}
              onChange={(e) => handleParamChange('cornerRadius', Number(e.target.value))}
              min={0}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )}

      {shape.shapeType === 'ellipse' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Radius X</Label>
            <Input
              type="number"
              value={(params.radiusX || 0).toFixed(2)}
              onChange={(e) => handleParamChange('radiusX', Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Radius Y</Label>
            <Input
              type="number"
              value={(params.radiusY || 0).toFixed(2)}
              onChange={(e) => handleParamChange('radiusY', Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )}

      {shape.shapeType === 'polygon' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Sides</Label>
            <Input
              type="number"
              value={params.sides || 6}
              onChange={(e) => handleParamChange('sides', Math.max(3, Number(e.target.value)))}
              min={3}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Radius</Label>
            <Input
              type="number"
              value={(params.radius || 0).toFixed(2)}
              onChange={(e) => handleParamChange('radius', Number(e.target.value))}
              className="h-7 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Text Properties Section
// ============================================================================

function TextPropertiesSection() {
  const { project, selectedObjectIds, updateObject } = useDesignStore()

  if (!project) return null

  const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  const singleSelection = selectedObjects.length === 1 ? selectedObjects[0] : null

  if (!singleSelection || singleSelection.type !== 'text') return null

  const text = singleSelection as TextObject

  return (
    <div className="p-3 space-y-3 border-t border-border">
      <div className="flex items-center gap-2">
        <Type className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium">Text</span>
      </div>

      <div>
        <Label className="text-[10px] text-muted-foreground">Content</Label>
        <textarea
          value={text.content}
          onChange={(e) => updateObject(singleSelection.id, { content: e.target.value })}
          className="w-full h-16 px-2 py-1 rounded bg-secondary border border-input text-xs resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Font Size</Label>
          <Input
            type="number"
            value={text.fontSize}
            onChange={(e) => updateObject(singleSelection.id, { fontSize: Number(e.target.value) })}
            min={1}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Font</Label>
          <select
            value={text.fontFamily}
            onChange={(e) => updateObject(singleSelection.id, { fontFamily: e.target.value })}
            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times</option>
            <option value="Courier New">Courier</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Layers Tab Content
// ============================================================================

function LayersTabContent() {
  const {
    project,
    activeLayerId,
    selectedObjectIds,
    setActiveLayer,
    addLayer,
    updateLayer,
    deleteLayer,
    selectObjects,
  } = useDesignStore()

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['default']))
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)

  if (!project) return null

  const toggleLayerExpanded = (layerId: string) => {
    const newExpanded = new Set(expandedLayers)
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId)
    } else {
      newExpanded.add(layerId)
    }
    setExpandedLayers(newExpanded)
  }

  const handleAddLayer = () => {
    const layerNum = project.layers.length + 1
    addLayer(`Layer ${layerNum}`)
  }

  const handleRenameLayer = (layerId: string, newName: string) => {
    updateLayer(layerId, { name: newName })
    setEditingLayerId(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium">Layers</span>
        <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleAddLayer}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {[...project.layers].reverse().map((layer) => {
          const layerObjects = project.objects.filter(obj => obj.layerId === layer.id)
          const isExpanded = expandedLayers.has(layer.id)
          const isActive = activeLayerId === layer.id
          const isEditing = editingLayerId === layer.id

          return (
            <div key={layer.id}>
              <div
                className={cn(
                  'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                  isActive ? 'bg-primary/20' : 'hover:bg-accent'
                )}
                onClick={() => setActiveLayer(layer.id)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerExpanded(layer.id)
                  }}
                  className="p-0.5 hover:bg-accent rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                <input
                  type="color"
                  value={layer.color}
                  onChange={(e) => {
                    e.stopPropagation()
                    updateLayer(layer.id, { color: e.target.value })
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded-sm cursor-pointer border-0 p-0"
                />

                {isEditing ? (
                  <input
                    type="text"
                    defaultValue={layer.name}
                    autoFocus
                    onBlur={(e) => handleRenameLayer(layer.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameLayer(layer.id, e.currentTarget.value)
                      if (e.key === 'Escape') setEditingLayerId(null)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm bg-transparent border-b border-primary outline-none"
                  />
                ) : (
                  <span 
                    className="flex-1 text-sm truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingLayerId(layer.id)
                    }}
                  >
                    {layer.name}
                  </span>
                )}

                <span className="text-[10px] text-muted-foreground">
                  {layerObjects.length}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateLayer(layer.id, { visible: !layer.visible })
                  }}
                  className="p-0.5 hover:bg-accent rounded"
                >
                  {layer.visible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    updateLayer(layer.id, { locked: !layer.locked })
                  }}
                  className="p-0.5 hover:bg-accent rounded"
                >
                  {layer.locked ? (
                    <Lock className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Unlock className="w-3 h-3" />
                  )}
                </button>

                {project.layers.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteLayer(layer.id)
                    }}
                    className="p-0.5 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isExpanded && layerObjects.length > 0 && (
                <div className="ml-6 mt-1 space-y-0.5">
                  {layerObjects.map((obj) => (
                    <div
                      key={obj.id}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors',
                        selectedObjectIds.includes(obj.id)
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-accent text-muted-foreground'
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (e.shiftKey) {
                          if (selectedObjectIds.includes(obj.id)) {
                            selectObjects(selectedObjectIds.filter(id => id !== obj.id))
                          } else {
                            selectObjects([...selectedObjectIds, obj.id])
                          }
                        } else {
                          selectObjects([obj.id])
                        }
                      }}
                    >
                      <span className="truncate">{obj.name}</span>
                      <span className="text-[10px] opacity-50 capitalize">{obj.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Document Tab Content
// ============================================================================

function DocumentTabContent() {
  const { project, setProject } = useDesignStore()

  if (!project) return null

  const updateCanvas = (updates: Partial<typeof project.canvas>) => {
    setProject({
      ...project,
      canvas: { ...project.canvas, ...updates }
    })
  }

  return (
    <div className="p-3 space-y-4">
      {/* Canvas Size */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Ruler className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Canvas Size</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Width</Label>
            <Input
              type="number"
              value={project.canvas.width}
              onChange={(e) => updateCanvas({ width: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Height</Label>
            <Input
              type="number"
              value={project.canvas.height}
              onChange={(e) => updateCanvas({ height: Number(e.target.value) })}
              className="h-7 text-xs"
            />
          </div>
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Unit</Label>
          <select
            value={project.canvas.unit}
            onChange={(e) => updateCanvas({ unit: e.target.value as 'mm' | 'inch' })}
            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
          >
            <option value="mm">Millimeters (mm)</option>
            <option value="inch">Inches (in)</option>
          </select>
        </div>
      </div>

      {/* Grid Settings */}
      <div className="space-y-2 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium">Grid</span>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Show Grid</Label>
          <input
            type="checkbox"
            checked={project.canvas.showGrid}
            onChange={(e) => updateCanvas({ showGrid: e.target.checked })}
            className="w-4 h-4"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Snap to Grid</Label>
          <input
            type="checkbox"
            checked={project.canvas.snapToGrid}
            onChange={(e) => updateCanvas({ snapToGrid: e.target.checked })}
            className="w-4 h-4"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Grid Size ({project.canvas.unit})</Label>
          <Input
            type="number"
            value={project.canvas.gridSize}
            onChange={(e) => updateCanvas({ gridSize: Number(e.target.value) })}
            min={1}
            className="h-7 text-xs"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main RightSidebar Component
// ============================================================================

interface RightSidebarProps {
  className?: string
}

export function RightSidebar({ className }: RightSidebarProps) {
  const { selectedObjectIds } = useDesignStore()
  const [activeTab, setActiveTab] = useState('properties')

  // Auto-switch to properties when something is selected
  useMemo(() => {
    if (selectedObjectIds.length > 0 && activeTab === 'document') {
      setActiveTab('properties')
    }
  }, [selectedObjectIds.length])

  return (
    <div className={cn('flex flex-col h-full bg-card', className)}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <TabsList className="grid grid-cols-3 mx-2 mt-2">
          <TabsTrigger value="properties" className="text-xs">
            <Sliders className="w-3 h-3 mr-1" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            Layers
          </TabsTrigger>
          <TabsTrigger value="document" className="text-xs">
            <FileText className="w-3 h-3 mr-1" />
            Document
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="flex-1 overflow-y-auto m-0 mt-2">
          <SelectionInfo />
          <TransformSection />
          <AppearanceSection />
          <ShapePropertiesSection />
          <TextPropertiesSection />
        </TabsContent>

        <TabsContent value="layers" className="flex-1 overflow-hidden m-0 mt-2">
          <LayersTabContent />
        </TabsContent>

        <TabsContent value="document" className="flex-1 overflow-y-auto m-0 mt-2">
          <DocumentTabContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RightSidebar
