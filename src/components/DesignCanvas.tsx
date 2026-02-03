import { useRef, useEffect, useState, useCallback } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { TextDialog } from './TextDialog'
import { ViewCube, ViewControls, type ViewDirection } from './ViewCube'
import { getPathNodes, findNodeAtPoint, moveNode, type NodeHandle } from '@/lib/nodeEditor'
import type { DesignObject, VectorShape, VectorPath, TextObject } from '@/types/design'
import { cn } from '@/lib/utils'

interface CanvasProps {
  className?: string
  onRequestRotation?: () => void
}

export function DesignCanvas({ className, onRequestRotation }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    project,
    selectedObjectIds,
    activeTool,
    viewTransform,
    activeLayerId,
    selectObjects,
    addObject,
    updateObject,
    setViewTransform,
    setActiveTool,
  } = useDesignStore()

  const [isPanning, setIsPanning] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [currentDraw, setCurrentDraw] = useState<{ x: number; y: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [showTextDialog, setShowTextDialog] = useState(false)
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<{ pathId: string; handle: NodeHandle } | null>(null)
  const [isDraggingNode, setIsDraggingNode] = useState(false)

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current
    if (!canvas || !project) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = (screenX - rect.left - canvas.width / 2 - viewTransform.x) / viewTransform.zoom
    const y = (screenY - rect.top - canvas.height / 2 - viewTransform.y) / viewTransform.zoom
    
    return { x: x + project.canvas.width / 2, y: project.canvas.height / 2 - y }
  }, [viewTransform, project])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !project) return

    const { width, height } = canvas
    const { zoom, x: panX, y: panY } = viewTransform

    ctx.clearRect(0, 0, width, height)
    
    ctx.fillStyle = project.canvas.backgroundColor
    ctx.fillRect(0, 0, width, height)

    ctx.save()
    ctx.translate(width / 2 + panX, height / 2 + panY)
    ctx.scale(zoom, -zoom)
    ctx.translate(-project.canvas.width / 2, -project.canvas.height / 2)

    if (project.canvas.showGrid) {
      drawGrid(ctx, project.canvas.width, project.canvas.height, project.canvas.gridSize)
    }

    drawWorkspace(ctx, project.canvas.width, project.canvas.height)

    for (const obj of project.objects) {
      const layer = project.layers.find(l => l.id === obj.layerId)
      if (!layer?.visible) continue
      
      drawObject(ctx, obj, selectedObjectIds.includes(obj.id), layer.color)
    }

    if (isDrawing && drawStart && currentDraw) {
      drawPreview(ctx, activeTool, drawStart, currentDraw)
    }

    ctx.restore()

    if (selectedObjectIds.length > 0) {
      drawSelectionHandles(ctx, project, selectedObjectIds, viewTransform)
    }

    if (activeTool === 'node-edit') {
      for (const objId of selectedObjectIds) {
        const obj = project.objects.find(o => o.id === objId)
        if (obj?.type === 'path') {
          drawNodeHandles(ctx, obj as VectorPath, selectedNode, viewTransform)
        }
      }
    }
  }, [project, viewTransform, selectedObjectIds, isDrawing, drawStart, currentDraw, activeTool, selectedNode])

  useEffect(() => {
    draw()
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      draw()
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [draw])

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = screenToCanvas(e.clientX, e.clientY)

    // MMB without shift = request rotation (switch to 3D mode)
    // MMB with shift OR pan tool = pan
    if (e.button === 1) {
      if (e.shiftKey) {
        // Shift+MMB = pan
        setIsPanning(true)
        setDragStart({ x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y })
      } else {
        // MMB without shift = request rotation (triggers 3D mode)
        onRequestRotation?.()
      }
      return
    }
    
    if (e.button === 0 && activeTool === 'pan') {
      setIsPanning(true)
      setDragStart({ x: e.clientX - viewTransform.x, y: e.clientY - viewTransform.y })
      return
    }

    if (activeTool === 'node-edit') {
      for (const objId of selectedObjectIds) {
        const obj = project?.objects.find(o => o.id === objId)
        if (obj?.type === 'path') {
          const path = obj as VectorPath
          const handle = findNodeAtPoint(path, pos.x, pos.y, 10 / viewTransform.zoom)
          if (handle) {
            setSelectedNode({ pathId: objId, handle })
            setIsDraggingNode(true)
            setDragStart(pos)
            return
          }
        }
      }
      setSelectedNode(null)
      return
    }

    if (activeTool === 'select') {
      const clickedObject = findObjectAtPoint(project, pos.x, pos.y)
      if (clickedObject) {
        if (e.shiftKey) {
          if (selectedObjectIds.includes(clickedObject.id)) {
            selectObjects(selectedObjectIds.filter(id => id !== clickedObject.id))
          } else {
            selectObjects([...selectedObjectIds, clickedObject.id])
          }
        } else {
          selectObjects([clickedObject.id])
        }
        setDragStart(pos)
      } else {
        selectObjects([])
      }
      return
    }

    if (['rectangle', 'ellipse', 'line'].includes(activeTool)) {
      setIsDrawing(true)
      setDrawStart(pos)
      setCurrentDraw(pos)
    }

    if (activeTool === 'text') {
      setTextPosition(pos)
      setShowTextDialog(true)
      setActiveTool('select')
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && dragStart) {
      setViewTransform({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
      return
    }

    if (isDraggingNode && selectedNode && dragStart) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const dx = pos.x - dragStart.x
      const dy = pos.y - dragStart.y

      const obj = project?.objects.find(o => o.id === selectedNode.pathId)
      if (obj?.type === 'path') {
        const path = obj as VectorPath
        const updatedPath = moveNode(
          path, 
          selectedNode.handle.nodeIndex, 
          selectedNode.handle.handleType,
          dx, 
          dy,
          !e.altKey
        )
        updateObject(selectedNode.pathId, { points: updatedPath.points })
      }
      setDragStart(pos)
      return
    }

    if (isDrawing && drawStart) {
      const pos = screenToCanvas(e.clientX, e.clientY)
      setCurrentDraw(pos)
      return
    }

    if (dragStart && selectedObjectIds.length > 0 && activeTool === 'select') {
      const pos = screenToCanvas(e.clientX, e.clientY)
      const dx = pos.x - dragStart.x
      const dy = pos.y - dragStart.y

      for (const id of selectedObjectIds) {
        const obj = project?.objects.find(o => o.id === id)
        if (obj) {
          updateObject(id, {
            transform: {
              ...obj.transform,
              x: obj.transform.x + dx,
              y: obj.transform.y + dy,
            },
          })
        }
      }
      setDragStart(pos)
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      setDragStart(null)
      return
    }

    if (isDraggingNode) {
      setIsDraggingNode(false)
      setDragStart(null)
      return
    }

    if (isDrawing && drawStart && currentDraw) {
      createObjectFromDraw(activeTool, drawStart, currentDraw)
    }

    setIsDrawing(false)
    setDrawStart(null)
    setCurrentDraw(null)
    setDragStart(null)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(10, viewTransform.zoom * delta))
    setViewTransform({ zoom: newZoom })
  }

  const createObjectFromDraw = (tool: string, start: { x: number; y: number }, end: { x: number; y: number }) => {
    if (!activeLayerId) return

    const width = Math.abs(end.x - start.x)
    const height = Math.abs(end.y - start.y)
    const centerX = (start.x + end.x) / 2
    const centerY = (start.y + end.y) / 2

    if (width < 1 && height < 1) return

    let newObject: DesignObject | null = null

    if (tool === 'rectangle') {
      newObject = {
        id: crypto.randomUUID(),
        layerId: activeLayerId,
        name: 'Rectangle',
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'rectangle',
        params: { width, height, cornerRadius: 0 },
        transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1 },
      } as VectorShape
    } else if (tool === 'ellipse') {
      newObject = {
        id: crypto.randomUUID(),
        layerId: activeLayerId,
        name: 'Ellipse',
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'ellipse',
        params: { radiusX: width / 2, radiusY: height / 2 },
        transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1 },
      } as VectorShape
    } else if (tool === 'line') {
      newObject = {
        id: crypto.randomUUID(),
        layerId: activeLayerId,
        name: 'Line',
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'line',
        params: { x2: end.x - start.x, y2: end.y - start.y },
        transform: { x: start.x, y: start.y, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1 },
      } as VectorShape
    }

    if (newObject) {
      addObject(newObject)
      selectObjects([newObject.id])
    }
  }

  return (
    <div 
      ref={containerRef} 
      className={cn('relative overflow-hidden bg-[#0a0a14]', className)}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="cursor-crosshair"
        style={{ 
          cursor: isPanning ? 'grabbing' : 
                  activeTool === 'pan' ? 'grab' : 
                  activeTool === 'select' ? 'default' : 
                  activeTool === 'text' ? 'text' : 'crosshair' 
        }}
      />
      
      {/* View controls overlay */}
      <div className="absolute top-4 right-4">
        <ViewCube 
          onViewChange={(view: ViewDirection) => {
            // For 2D canvas, view changes reset the pan/zoom
            if (view === 'top') {
              setViewTransform({ x: 0, y: 0, zoom: 1 })
            }
          }} 
        />
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur px-3 py-1.5 rounded-md text-xs font-mono">
        Zoom: {(viewTransform.zoom * 100).toFixed(0)}%
      </div>

      {/* View controls help */}
      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur px-3 py-2 rounded-md">
        <ViewControls />
      </div>

      {showTextDialog && (
        <TextDialog 
          position={textPosition} 
          onClose={() => setShowTextDialog(false)} 
        />
      )}
    </div>
  )
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, gridSize: number) {
  // Light theme grid colors for good contrast on light backgrounds
  const minorGridColor = '#d1d5db' // Light gray for minor grid
  const majorGridColor = '#9ca3af' // Medium gray for major grid
  
  ctx.strokeStyle = minorGridColor
  ctx.lineWidth = 0.5

  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.strokeStyle = majorGridColor
  ctx.lineWidth = 1
  const majorGrid = gridSize * 5

  for (let x = 0; x <= width; x += majorGrid) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = 0; y <= height; y += majorGrid) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

function drawWorkspace(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, width, height)

  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(0, 0, 5, 0, Math.PI * 2)
  ctx.fill()
}

function drawObject(ctx: CanvasRenderingContext2D, obj: DesignObject, isSelected: boolean, layerColor: string) {
  ctx.save()
  ctx.translate(obj.transform.x, obj.transform.y)
  ctx.rotate((obj.transform.rotation * Math.PI) / 180)
  ctx.scale(obj.transform.scaleX, obj.transform.scaleY)

  const strokeColor = obj.style.strokeColor || layerColor
  const fillColor = obj.style.fillColor

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = obj.style.strokeWidth
  ctx.globalAlpha = obj.style.strokeOpacity

  if (obj.type === 'shape') {
    const shape = obj as VectorShape
    
    switch (shape.shapeType) {
      case 'rectangle': {
        const { width, height, cornerRadius } = shape.params as { width: number; height: number; cornerRadius: number }
        if (cornerRadius > 0) {
          roundRect(ctx, -width / 2, -height / 2, width, height, cornerRadius)
        } else {
          ctx.beginPath()
          ctx.rect(-width / 2, -height / 2, width, height)
        }
        break
      }
      case 'ellipse': {
        const { radiusX, radiusY } = shape.params as { radiusX: number; radiusY: number }
        ctx.beginPath()
        ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)
        break
      }
      case 'line': {
        const { x2, y2 } = shape.params as { x2: number; y2: number }
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(x2, y2)
        break
      }
      case 'polygon': {
        const { sides, radius } = shape.params as { sides: number; radius: number }
        ctx.beginPath()
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        break
      }
    }

    if (fillColor) {
      ctx.fillStyle = fillColor
      ctx.globalAlpha = obj.style.fillOpacity
      ctx.fill()
    }
    ctx.globalAlpha = obj.style.strokeOpacity
    ctx.stroke()
  } else if (obj.type === 'path') {
    const path = obj as VectorPath
    ctx.beginPath()
    for (let i = 0; i < path.points.length; i++) {
      const pt = path.points[i]
      if (i === 0) {
        ctx.moveTo(pt.x, pt.y)
      } else if (pt.type === 'curve' && pt.handleIn) {
        const prev = path.points[i - 1]
        ctx.bezierCurveTo(
          prev.handleOut?.x ?? prev.x, prev.handleOut?.y ?? prev.y,
          pt.handleIn.x, pt.handleIn.y,
          pt.x, pt.y
        )
      } else {
        ctx.lineTo(pt.x, pt.y)
      }
    }
    if (path.closed) ctx.closePath()
    
    if (fillColor) {
      ctx.fillStyle = fillColor
      ctx.globalAlpha = obj.style.fillOpacity
      ctx.fill()
    }
    ctx.globalAlpha = obj.style.strokeOpacity
    ctx.stroke()
  } else if (obj.type === 'text') {
    const text = obj as TextObject
    ctx.scale(1, -1)
    ctx.font = `${text.fontWeight} ${text.fontStyle} ${text.fontSize}px ${text.fontFamily}`
    ctx.fillStyle = strokeColor
    ctx.textAlign = text.textAlign
    ctx.textBaseline = 'middle'
    ctx.fillText(text.content, 0, 0)
  }

  if (isSelected) {
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2 / Math.max(obj.transform.scaleX, obj.transform.scaleY)
    ctx.setLineDash([5, 5])
    ctx.stroke()
    ctx.setLineDash([])
  }

  ctx.restore()
}

function drawPreview(ctx: CanvasRenderingContext2D, tool: string, start: { x: number; y: number }, end: { x: number; y: number }) {
  ctx.save()
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])

  if (tool === 'rectangle') {
    const width = end.x - start.x
    const height = end.y - start.y
    ctx.strokeRect(start.x, start.y, width, height)
  } else if (tool === 'ellipse') {
    const centerX = (start.x + end.x) / 2
    const centerY = (start.y + end.y) / 2
    const radiusX = Math.abs(end.x - start.x) / 2
    const radiusY = Math.abs(end.y - start.y) / 2
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (tool === 'line') {
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    ctx.stroke()
  }

  ctx.restore()
}

function drawSelectionHandles(
  _ctx: CanvasRenderingContext2D, 
  _project: any, 
  _selectedIds: string[], 
  _viewTransform: { x: number; y: number; zoom: number }
) {
  // Selection handles are drawn in screen space
  // TODO: Implement proper selection handles with resize/rotate
}

function drawNodeHandles(
  ctx: CanvasRenderingContext2D,
  path: VectorPath,
  selectedNode: { pathId: string; handle: NodeHandle } | null,
  viewTransform: { x: number; y: number; zoom: number }
) {
  const handles = getPathNodes(path)
  const canvas = ctx.canvas
  
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  for (const handle of handles) {
    const screenX = (handle.x - path.transform.x) * viewTransform.zoom + canvas.width / 2 + viewTransform.x
    const screenY = canvas.height / 2 + viewTransform.y - (handle.y - path.transform.y) * viewTransform.zoom

    const isSelected = selectedNode?.pathId === path.id && 
                       selectedNode?.handle.nodeIndex === handle.nodeIndex &&
                       selectedNode?.handle.handleType === handle.handleType

    if (handle.handleType === 'point') {
      ctx.fillStyle = isSelected ? '#f59e0b' : '#3b82f6'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(screenX, screenY, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else {
      const pt = path.points[handle.nodeIndex]
      const ptScreenX = (pt.x * path.transform.scaleX + path.transform.x - path.transform.x) * viewTransform.zoom + canvas.width / 2 + viewTransform.x
      const ptScreenY = canvas.height / 2 + viewTransform.y - (pt.y * path.transform.scaleY + path.transform.y - path.transform.y) * viewTransform.zoom

      ctx.strokeStyle = '#888888'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ptScreenX, ptScreenY)
      ctx.lineTo(screenX, screenY)
      ctx.stroke()

      ctx.fillStyle = isSelected ? '#f59e0b' : '#22c55e'
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(screenX, screenY, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
  }

  ctx.restore()
}

function findObjectAtPoint(project: any, x: number, y: number): DesignObject | null {
  if (!project) return null

  for (let i = project.objects.length - 1; i >= 0; i--) {
    const obj = project.objects[i]
    const layer = project.layers.find((l: any) => l.id === obj.layerId)
    if (!layer?.visible || layer.locked) continue

    if (isPointInObject(obj, x, y)) {
      return obj
    }
  }
  return null
}

function isPointInObject(obj: DesignObject, x: number, y: number): boolean {
  const localX = x - obj.transform.x
  const localY = y - obj.transform.y

  if (obj.type === 'shape') {
    const shape = obj as VectorShape
    switch (shape.shapeType) {
      case 'rectangle': {
        const { width, height } = shape.params as { width: number; height: number }
        return Math.abs(localX) <= width / 2 && Math.abs(localY) <= height / 2
      }
      case 'ellipse': {
        const { radiusX, radiusY } = shape.params as { radiusX: number; radiusY: number }
        return (localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY) <= 1
      }
      case 'line': {
        const { x2, y2 } = shape.params as { x2: number; y2: number }
        const dist = pointToLineDistance(0, 0, x2, y2, localX, localY)
        return dist < 5
      }
    }
  }

  return false
}

function pointToLineDistance(x1: number, y1: number, x2: number, y2: number, px: number, py: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)))
  const projX = x1 + t * dx
  const projY = y1 + t * dy
  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
