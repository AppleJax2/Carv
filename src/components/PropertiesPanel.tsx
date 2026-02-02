import { useDesignStore } from '@/store/useDesignStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Sliders } from 'lucide-react'
import type { VectorShape, TextObject } from '@/types/design'

export function PropertiesPanel() {
  const {
    project,
    selectedObjectIds,
    updateObject,
  } = useDesignStore()

  if (!project) return null

  const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  const singleSelection = selectedObjects.length === 1 ? selectedObjects[0] : null

  return (
    <Card className="h-full flex flex-col rounded-none border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sliders className="w-4 h-4" />
          Properties
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-4">
        {selectedObjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Select an object to edit its properties</p>
        ) : selectedObjects.length > 1 ? (
          <p className="text-xs text-muted-foreground">{selectedObjects.length} objects selected</p>
        ) : singleSelection && (
          <>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Name</label>
              <input
                type="text"
                value={singleSelection.name}
                onChange={(e) => updateObject(singleSelection.id, { name: e.target.value })}
                className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground">X</span>
                  <input
                    type="number"
                    value={singleSelection.transform.x.toFixed(2)}
                    onChange={(e) => updateObject(singleSelection.id, {
                      transform: { ...singleSelection.transform, x: Number(e.target.value) }
                    })}
                    className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground">Y</span>
                  <input
                    type="number"
                    value={singleSelection.transform.y.toFixed(2)}
                    onChange={(e) => updateObject(singleSelection.id, {
                      transform: { ...singleSelection.transform, y: Number(e.target.value) }
                    })}
                    className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Rotation</label>
              <input
                type="number"
                value={singleSelection.transform.rotation.toFixed(1)}
                onChange={(e) => updateObject(singleSelection.id, {
                  transform: { ...singleSelection.transform, rotation: Number(e.target.value) }
                })}
                className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
              />
            </div>

            {singleSelection.type === 'shape' && (
              <ShapeProperties 
                shape={singleSelection as VectorShape} 
                onUpdate={(updates) => updateObject(singleSelection.id, updates)}
              />
            )}

            {singleSelection.type === 'text' && (
              <TextProperties 
                text={singleSelection as TextObject} 
                onUpdate={(updates) => updateObject(singleSelection.id, updates)}
              />
            )}

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Stroke</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={singleSelection.style.strokeColor || '#3b82f6'}
                  onChange={(e) => updateObject(singleSelection.id, {
                    style: { ...singleSelection.style, strokeColor: e.target.value }
                  })}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <input
                  type="number"
                  value={singleSelection.style.strokeWidth}
                  onChange={(e) => updateObject(singleSelection.id, {
                    style: { ...singleSelection.style, strokeWidth: Number(e.target.value) }
                  })}
                  min={0}
                  step={0.5}
                  className="flex-1 h-8 px-2 rounded bg-secondary border border-input text-xs"
                  placeholder="Width"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Fill</label>
              <div className="flex gap-2 items-center">
                <input
                  type="checkbox"
                  checked={!!singleSelection.style.fillColor}
                  onChange={(e) => updateObject(singleSelection.id, {
                    style: { 
                      ...singleSelection.style, 
                      fillColor: e.target.checked ? '#3b82f6' : null 
                    }
                  })}
                  className="w-4 h-4"
                />
                {singleSelection.style.fillColor && (
                  <input
                    type="color"
                    value={singleSelection.style.fillColor}
                    onChange={(e) => updateObject(singleSelection.id, {
                      style: { ...singleSelection.style, fillColor: e.target.value }
                    })}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface ShapePropertiesProps {
  shape: VectorShape
  onUpdate: (updates: Partial<VectorShape>) => void
}

function ShapeProperties({ shape, onUpdate }: ShapePropertiesProps) {
  const params = shape.params as unknown as Record<string, number>

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">Dimensions</label>
      {shape.shapeType === 'rectangle' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Width</span>
            <input
              type="number"
              value={(params.width || 0).toFixed(2)}
              onChange={(e) => onUpdate({
                params: { ...params, width: Number(e.target.value) }
              } as any)}
              className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Height</span>
            <input
              type="number"
              value={(params.height || 0).toFixed(2)}
              onChange={(e) => onUpdate({
                params: { ...params, height: Number(e.target.value) }
              } as any)}
              className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
            />
          </div>
          <div className="col-span-2">
            <span className="text-[10px] text-muted-foreground">Corner Radius</span>
            <input
              type="number"
              value={(params.cornerRadius || 0).toFixed(2)}
              onChange={(e) => onUpdate({
                params: { ...params, cornerRadius: Number(e.target.value) }
              } as any)}
              min={0}
              className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
            />
          </div>
        </div>
      )}
      {shape.shapeType === 'ellipse' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Radius X</span>
            <input
              type="number"
              value={(params.radiusX || 0).toFixed(2)}
              onChange={(e) => onUpdate({
                params: { ...params, radiusX: Number(e.target.value) }
              } as any)}
              className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Radius Y</span>
            <input
              type="number"
              value={(params.radiusY || 0).toFixed(2)}
              onChange={(e) => onUpdate({
                params: { ...params, radiusY: Number(e.target.value) }
              } as any)}
              className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
            />
          </div>
        </div>
      )}
      {shape.shapeType === 'polygon' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground">Sides</span>
            <input
              type="number"
              value={params.sides || 6}
              onChange={(e) => onUpdate({
                params: { ...params, sides: Math.max(3, Number(e.target.value)) }
              } as any)}
              min={3}
              className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
            />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Radius</span>
            <input
              type="number"
              value={(params.radius || 0).toFixed(2)}
              onChange={(e) => onUpdate({
                params: { ...params, radius: Number(e.target.value) }
              } as any)}
              className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface TextPropertiesProps {
  text: TextObject
  onUpdate: (updates: Partial<TextObject>) => void
}

function TextProperties({ text, onUpdate }: TextPropertiesProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground">Text</label>
      <textarea
        value={text.content}
        onChange={(e) => onUpdate({ content: e.target.value })}
        className="w-full h-16 px-2 py-1 rounded bg-secondary border border-input text-xs resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-muted-foreground">Font Size</span>
          <input
            type="number"
            value={text.fontSize}
            onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
            min={1}
            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Font</span>
          <select
            value={text.fontFamily}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className="w-full h-7 px-2 rounded bg-secondary border border-input text-xs"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>
        </div>
      </div>
    </div>
  )
}
