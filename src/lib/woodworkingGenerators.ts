import type { VectorPath, VectorShape, PathPoint } from '@/types/design'

export interface BoxGeneratorParams {
  innerWidth: number
  innerHeight: number
  innerDepth: number
  materialThickness: number
  jointType: 'finger' | 'rabbet' | 'butt' | 'miter' | 'dovetail'
  fingerWidth?: number
  fingerCount?: number
  lidType: 'none' | 'slip' | 'hinged' | 'inset'
  lidInset?: number
  bottomType: 'inset' | 'rabbet' | 'flush'
  bottomInset?: number
  toolDiameter: number
  dogboneStyle: 'none' | 'dogbone' | 'tbone' | 'corner'
  labelParts: boolean
  includeAssemblyMarks: boolean
}

export interface BoxPart {
  id: string
  name: string
  path: VectorPath
  labelPath?: VectorPath
  width: number
  height: number
  grainDirection: 'horizontal' | 'vertical'
}

export interface GeneratedBox {
  parts: BoxPart[]
  totalWidth: number
  totalHeight: number
  materialUsage: number
  instructions: string[]
}

export function generateFingerJointBox(params: BoxGeneratorParams): GeneratedBox {
  const {
    innerWidth,
    innerHeight,
    innerDepth,
    materialThickness,
    fingerWidth = materialThickness,
    toolDiameter,
    dogboneStyle,
    lidType,
    bottomType,
    labelParts,
  } = params

  const parts: BoxPart[] = []
  const instructions: string[] = []

  const outerWidth = innerWidth + 2 * materialThickness
  const outerHeight = innerHeight + 2 * materialThickness
  const outerDepth = innerDepth + (bottomType === 'flush' ? materialThickness : 0)

  const fingerCountX = Math.floor(outerWidth / fingerWidth)
  const actualFingerWidthX = outerWidth / fingerCountX
  
  const fingerCountZ = Math.floor(outerDepth / fingerWidth)
  const actualFingerWidthZ = outerDepth / fingerCountZ

  const frontBack = generateFingerJointPanel(
    outerWidth,
    outerDepth,
    materialThickness,
    actualFingerWidthX,
    actualFingerWidthZ,
    'horizontal',
    toolDiameter,
    dogboneStyle,
  )

  parts.push({
    id: crypto.randomUUID(),
    name: 'Front',
    path: { ...frontBack, id: crypto.randomUUID(), name: 'Front' },
    width: outerWidth,
    height: outerDepth,
    grainDirection: 'horizontal',
  })

  parts.push({
    id: crypto.randomUUID(),
    name: 'Back',
    path: { ...frontBack, id: crypto.randomUUID(), name: 'Back' },
    width: outerWidth,
    height: outerDepth,
    grainDirection: 'horizontal',
  })

  const leftRight = generateFingerJointPanel(
    innerHeight,
    outerDepth,
    materialThickness,
    actualFingerWidthX,
    actualFingerWidthZ,
    'vertical',
    toolDiameter,
    dogboneStyle,
  )

  parts.push({
    id: crypto.randomUUID(),
    name: 'Left',
    path: { ...leftRight, id: crypto.randomUUID(), name: 'Left' },
    width: innerHeight,
    height: outerDepth,
    grainDirection: 'horizontal',
  })

  parts.push({
    id: crypto.randomUUID(),
    name: 'Right',
    path: { ...leftRight, id: crypto.randomUUID(), name: 'Right' },
    width: innerHeight,
    height: outerDepth,
    grainDirection: 'horizontal',
  })

  const bottomWidth = bottomType === 'inset' ? innerWidth - 2 : innerWidth
  const bottomHeight = bottomType === 'inset' ? innerHeight - 2 : innerHeight
  
  const bottom = generateRectanglePath(bottomWidth, bottomHeight, 'Bottom')
  parts.push({
    id: crypto.randomUUID(),
    name: 'Bottom',
    path: bottom,
    width: bottomWidth,
    height: bottomHeight,
    grainDirection: 'horizontal',
  })

  if (lidType !== 'none') {
    const lidWidth = lidType === 'inset' ? innerWidth - 2 : outerWidth
    const lidHeight = lidType === 'inset' ? innerHeight - 2 : outerHeight
    
    const lid = generateRectanglePath(lidWidth, lidHeight, 'Lid')
    parts.push({
      id: crypto.randomUUID(),
      name: 'Lid',
      path: lid,
      width: lidWidth,
      height: lidHeight,
      grainDirection: 'horizontal',
    })
  }

  if (labelParts) {
    for (const part of parts) {
      part.labelPath = generateLabelPath(part.name, part.width, part.height)
    }
  }

  instructions.push(`Material thickness: ${materialThickness}mm`)
  instructions.push(`Inner dimensions: ${innerWidth} x ${innerHeight} x ${innerDepth}mm`)
  instructions.push(`Outer dimensions: ${outerWidth} x ${outerHeight} x ${outerDepth}mm`)
  instructions.push(`Finger width: ${actualFingerWidthX.toFixed(2)}mm (X) / ${actualFingerWidthZ.toFixed(2)}mm (Z)`)
  instructions.push(`Total parts: ${parts.length}`)

  const totalWidth = Math.max(...parts.map(p => p.width)) + 20
  const totalHeight = parts.reduce((sum, p) => sum + p.height + 10, 0)
  const materialUsage = parts.reduce((sum, p) => sum + p.width * p.height, 0)

  return {
    parts,
    totalWidth,
    totalHeight,
    materialUsage,
    instructions,
  }
}

function generateFingerJointPanel(
  width: number,
  height: number,
  thickness: number,
  fingerWidthX: number,
  fingerWidthZ: number,
  orientation: 'horizontal' | 'vertical',
  toolDiameter: number,
  dogboneStyle: string,
): VectorPath {
  const points: PathPoint[] = []
  
  const fingerCountTop = Math.floor(width / fingerWidthX)
  const fingerCountSide = Math.floor(height / fingerWidthZ)

  points.push({ x: 0, y: 0, type: 'move' })

  for (let i = 0; i < fingerCountTop; i++) {
    const x1 = i * fingerWidthX
    const x2 = (i + 1) * fingerWidthX
    
    if (i % 2 === 0) {
      points.push({ x: x1, y: 0, type: 'line' })
      if (dogboneStyle !== 'none') {
        addDogbone(points, x1, 0, x1, -thickness, toolDiameter, dogboneStyle)
      }
      points.push({ x: x1, y: -thickness, type: 'line' })
      points.push({ x: x2, y: -thickness, type: 'line' })
      if (dogboneStyle !== 'none') {
        addDogbone(points, x2, -thickness, x2, 0, toolDiameter, dogboneStyle)
      }
      points.push({ x: x2, y: 0, type: 'line' })
    } else {
      points.push({ x: x2, y: 0, type: 'line' })
    }
  }

  points.push({ x: width, y: 0, type: 'line' })

  for (let i = 0; i < fingerCountSide; i++) {
    const y1 = i * fingerWidthZ
    const y2 = (i + 1) * fingerWidthZ
    
    if (i % 2 === 1) {
      points.push({ x: width, y: y1, type: 'line' })
      points.push({ x: width + thickness, y: y1, type: 'line' })
      points.push({ x: width + thickness, y: y2, type: 'line' })
      points.push({ x: width, y: y2, type: 'line' })
    } else {
      points.push({ x: width, y: y2, type: 'line' })
    }
  }

  points.push({ x: width, y: height, type: 'line' })

  for (let i = fingerCountTop - 1; i >= 0; i--) {
    const x1 = i * fingerWidthX
    const x2 = (i + 1) * fingerWidthX
    
    if (i % 2 === 1) {
      points.push({ x: x2, y: height, type: 'line' })
      points.push({ x: x2, y: height + thickness, type: 'line' })
      points.push({ x: x1, y: height + thickness, type: 'line' })
      points.push({ x: x1, y: height, type: 'line' })
    } else {
      points.push({ x: x1, y: height, type: 'line' })
    }
  }

  points.push({ x: 0, y: height, type: 'line' })

  for (let i = fingerCountSide - 1; i >= 0; i--) {
    const y1 = i * fingerWidthZ
    const y2 = (i + 1) * fingerWidthZ
    
    if (i % 2 === 0) {
      points.push({ x: 0, y: y2, type: 'line' })
      points.push({ x: -thickness, y: y2, type: 'line' })
      points.push({ x: -thickness, y: y1, type: 'line' })
      points.push({ x: 0, y: y1, type: 'line' })
    } else {
      points.push({ x: 0, y: y1, type: 'line' })
    }
  }

  return {
    id: crypto.randomUUID(),
    layerId: 'default',
    name: 'Panel',
    visible: true,
    locked: false,
    selected: false,
    type: 'path',
    points,
    closed: true,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    style: { fillColor: null, fillOpacity: 1, strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1 },
  }
}

function addDogbone(
  points: PathPoint[],
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  toolDiameter: number,
  style: string,
): void {
  const radius = toolDiameter / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  
  if (len === 0) return

  const nx = -dy / len
  const ny = dx / len

  if (style === 'dogbone') {
    const cx = (x1 + x2) / 2 + nx * radius
    const cy = (y1 + y2) / 2 + ny * radius
    
    points.push({ x: cx - radius, y: cy, type: 'line' })
    points.push({ 
      x: cx + radius, 
      y: cy, 
      type: 'curve',
      handleIn: { x: cx, y: cy - radius * 0.55 },
      handleOut: { x: cx, y: cy + radius * 0.55 },
    })
  } else if (style === 'tbone') {
    const cx = x1 + nx * radius
    const cy = y1 + ny * radius
    
    points.push({ x: cx, y: cy, type: 'line' })
  }
}

function generateRectanglePath(width: number, height: number, name: string): VectorPath {
  const hw = width / 2
  const hh = height / 2
  
  return {
    id: crypto.randomUUID(),
    layerId: 'default',
    name,
    visible: true,
    locked: false,
    selected: false,
    type: 'path',
    points: [
      { x: -hw, y: -hh, type: 'move' },
      { x: hw, y: -hh, type: 'line' },
      { x: hw, y: hh, type: 'line' },
      { x: -hw, y: hh, type: 'line' },
    ],
    closed: true,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    style: { fillColor: null, fillOpacity: 1, strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1 },
  }
}

function generateLabelPath(text: string, width: number, height: number): VectorPath {
  return {
    id: crypto.randomUUID(),
    layerId: 'default',
    name: `Label: ${text}`,
    visible: true,
    locked: false,
    selected: false,
    type: 'path',
    points: [
      { x: -width / 4, y: 0, type: 'move' },
      { x: width / 4, y: 0, type: 'line' },
    ],
    closed: false,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    style: { fillColor: null, fillOpacity: 1, strokeColor: '#22c55e', strokeWidth: 0.5, strokeOpacity: 1 },
  }
}

export interface DogboneParams {
  cornerX: number
  cornerY: number
  direction1: { x: number; y: number }
  direction2: { x: number; y: number }
  toolDiameter: number
  style: 'dogbone' | 'tbone' | 'corner'
}

export function generateDogbone(params: DogboneParams): PathPoint[] {
  const { cornerX, cornerY, direction1, direction2, toolDiameter, style } = params
  const radius = toolDiameter / 2
  
  const bisectorX = direction1.x + direction2.x
  const bisectorY = direction1.y + direction2.y
  const bisectorLen = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY)
  
  if (bisectorLen === 0) return []
  
  const normBisectorX = bisectorX / bisectorLen
  const normBisectorY = bisectorY / bisectorLen

  if (style === 'dogbone') {
    const offset = radius * Math.SQRT2
    const cx = cornerX + normBisectorX * offset
    const cy = cornerY + normBisectorY * offset
    
    return [
      { x: cx - radius, y: cy, type: 'curve', handleIn: { x: cx - radius, y: cy - radius * 0.55 } },
      { x: cx, y: cy + radius, type: 'curve', handleIn: { x: cx - radius * 0.55, y: cy + radius } },
      { x: cx + radius, y: cy, type: 'curve', handleIn: { x: cx + radius, y: cy + radius * 0.55 } },
      { x: cx, y: cy - radius, type: 'curve', handleIn: { x: cx + radius * 0.55, y: cy - radius } },
    ]
  } else if (style === 'tbone') {
    const offset = radius
    const cx = cornerX + normBisectorX * offset
    const cy = cornerY + normBisectorY * offset
    
    return [
      { x: cx, y: cy, type: 'line' },
    ]
  }
  
  return []
}

export function insertDogbonesInPath(
  path: VectorPath,
  toolDiameter: number,
  style: 'dogbone' | 'tbone' | 'corner',
  minAngle: number = 85,
  maxAngle: number = 95,
): VectorPath {
  const points = [...path.points]
  const newPoints: PathPoint[] = []
  
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]
    
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }
    
    const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)
    
    if (len1 === 0 || len2 === 0) {
      newPoints.push(curr)
      continue
    }
    
    const dot = (v1.x * v2.x + v1.y * v2.y) / (len1 * len2)
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI
    
    const cross = v1.x * v2.y - v1.y * v2.x
    const isInsideCorner = cross < 0
    
    if (isInsideCorner && angle >= minAngle && angle <= maxAngle) {
      const dogbonePoints = generateDogbone({
        cornerX: curr.x,
        cornerY: curr.y,
        direction1: { x: -v1.x / len1, y: -v1.y / len1 },
        direction2: { x: v2.x / len2, y: v2.y / len2 },
        toolDiameter,
        style,
      })
      
      newPoints.push(...dogbonePoints)
    } else {
      newPoints.push(curr)
    }
  }
  
  return { ...path, points: newPoints }
}

export interface TabParams {
  width: number
  height: number
  triangular: boolean
}

export function insertTabsInPath(
  path: VectorPath,
  tabCount: number,
  tabParams: TabParams,
  autoPlace: boolean = true,
  positions?: number[],
): VectorPath {
  const { width: tabWidth, height: tabHeight, triangular } = tabParams
  
  const pathLength = calculatePathLength(path.points)
  
  let tabPositions: number[]
  if (autoPlace && !positions) {
    tabPositions = []
    const spacing = pathLength / tabCount
    for (let i = 0; i < tabCount; i++) {
      tabPositions.push((i + 0.5) * spacing)
    }
  } else {
    tabPositions = positions || []
  }
  
  const newPoints: PathPoint[] = []
  let currentLength = 0
  let tabIndex = 0
  
  for (let i = 0; i < path.points.length; i++) {
    const curr = path.points[i]
    const next = path.points[(i + 1) % path.points.length]
    
    const segmentLength = Math.sqrt(
      (next.x - curr.x) ** 2 + (next.y - curr.y) ** 2
    )
    
    while (tabIndex < tabPositions.length && 
           tabPositions[tabIndex] >= currentLength && 
           tabPositions[tabIndex] < currentLength + segmentLength) {
      
      const t = (tabPositions[tabIndex] - currentLength) / segmentLength
      const tabX = curr.x + t * (next.x - curr.x)
      const tabY = curr.y + t * (next.y - curr.y)
      
      const dx = next.x - curr.x
      const dy = next.y - curr.y
      const len = Math.sqrt(dx * dx + dy * dy)
      const nx = -dy / len
      const ny = dx / len
      
      const halfTab = tabWidth / 2
      
      if (triangular) {
        newPoints.push({ x: tabX - halfTab * dx / len, y: tabY - halfTab * dy / len, type: 'line' })
        newPoints.push({ x: tabX + nx * tabHeight, y: tabY + ny * tabHeight, type: 'line' })
        newPoints.push({ x: tabX + halfTab * dx / len, y: tabY + halfTab * dy / len, type: 'line' })
      } else {
        newPoints.push({ x: tabX - halfTab * dx / len, y: tabY - halfTab * dy / len, type: 'line' })
        newPoints.push({ x: tabX - halfTab * dx / len + nx * tabHeight, y: tabY - halfTab * dy / len + ny * tabHeight, type: 'line' })
        newPoints.push({ x: tabX + halfTab * dx / len + nx * tabHeight, y: tabY + halfTab * dy / len + ny * tabHeight, type: 'line' })
        newPoints.push({ x: tabX + halfTab * dx / len, y: tabY + halfTab * dy / len, type: 'line' })
      }
      
      tabIndex++
    }
    
    newPoints.push(curr)
    currentLength += segmentLength
  }
  
  return { ...path, points: newPoints }
}

function calculatePathLength(points: PathPoint[]): number {
  let length = 0
  for (let i = 0; i < points.length; i++) {
    const curr = points[i]
    const next = points[(i + 1) % points.length]
    length += Math.sqrt((next.x - curr.x) ** 2 + (next.y - curr.y) ** 2)
  }
  return length
}

export interface ShelfPinHoleParams {
  startX: number
  startY: number
  spacing: number
  rows: number
  columns: number
  holeDiameter: number
  holeDepth: number
}

export function generateShelfPinHoles(params: ShelfPinHoleParams): VectorShape[] {
  const { startX, startY, spacing, rows, columns, holeDiameter } = params
  const holes: VectorShape[] = []
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = startX + col * spacing
      const y = startY + row * spacing
      
      holes.push({
        id: crypto.randomUUID(),
        layerId: 'default',
        name: `Shelf Pin Hole ${row * columns + col + 1}`,
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'ellipse',
        params: { radiusX: holeDiameter / 2, radiusY: holeDiameter / 2 },
        transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#ef4444', strokeWidth: 1, strokeOpacity: 1 },
      })
    }
  }
  
  return holes
}

export interface HardwareTemplateParams {
  type: 'european-hinge' | 'drawer-slide' | 'shelf-pin' | 'cam-lock' | 'dowel'
  size: 'small' | 'medium' | 'large'
  quantity: number
  spacing?: number
}

export function generateHardwareTemplate(params: HardwareTemplateParams): VectorShape[] {
  const { type, size, quantity, spacing = 32 } = params
  const shapes: VectorShape[] = []
  
  const sizes = {
    'european-hinge': { small: 26, medium: 35, large: 40 },
    'drawer-slide': { small: 300, medium: 400, large: 500 },
    'shelf-pin': { small: 5, medium: 6, large: 8 },
    'cam-lock': { small: 15, medium: 20, large: 25 },
    'dowel': { small: 6, medium: 8, large: 10 },
  }
  
  const holeDiameter = sizes[type][size]
  
  for (let i = 0; i < quantity; i++) {
    const x = i * spacing
    
    if (type === 'european-hinge') {
      shapes.push({
        id: crypto.randomUUID(),
        layerId: 'default',
        name: `Hinge Cup ${i + 1}`,
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'ellipse',
        params: { radiusX: holeDiameter / 2, radiusY: holeDiameter / 2 },
        transform: { x, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#f59e0b', strokeWidth: 1, strokeOpacity: 1 },
      })
      
      shapes.push({
        id: crypto.randomUUID(),
        layerId: 'default',
        name: `Hinge Screw 1 ${i + 1}`,
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'ellipse',
        params: { radiusX: 2, radiusY: 2 },
        transform: { x: x - 24, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#f59e0b', strokeWidth: 1, strokeOpacity: 1 },
      })
      
      shapes.push({
        id: crypto.randomUUID(),
        layerId: 'default',
        name: `Hinge Screw 2 ${i + 1}`,
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'ellipse',
        params: { radiusX: 2, radiusY: 2 },
        transform: { x: x + 24, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#f59e0b', strokeWidth: 1, strokeOpacity: 1 },
      })
    } else {
      shapes.push({
        id: crypto.randomUUID(),
        layerId: 'default',
        name: `${type} ${i + 1}`,
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'ellipse',
        params: { radiusX: holeDiameter / 2, radiusY: holeDiameter / 2 },
        transform: { x, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { fillColor: null, fillOpacity: 1, strokeColor: '#f59e0b', strokeWidth: 1, strokeOpacity: 1 },
      })
    }
  }
  
  return shapes
}

export interface TrayGeneratorParams {
  innerWidth: number
  innerHeight: number
  innerDepth: number
  materialThickness: number
  cornerRadius: number
  handleCutout: boolean
  handleWidth?: number
  handleHeight?: number
  toolDiameter: number
}

export function generateTray(params: TrayGeneratorParams): BoxPart[] {
  const {
    innerWidth,
    innerHeight,
    innerDepth,
    materialThickness,
    cornerRadius,
    handleCutout,
    handleWidth = 80,
    handleHeight = 25,
  } = params

  const parts: BoxPart[] = []

  const bottomPath = generateRoundedRectanglePath(
    innerWidth,
    innerHeight,
    cornerRadius,
    'Tray Bottom'
  )
  
  parts.push({
    id: crypto.randomUUID(),
    name: 'Tray Bottom',
    path: bottomPath,
    width: innerWidth,
    height: innerHeight,
    grainDirection: 'horizontal',
  })

  const wallPath = generateTrayWallPath(
    innerWidth,
    innerHeight,
    innerDepth,
    cornerRadius,
    handleCutout,
    handleWidth,
    handleHeight,
  )
  
  parts.push({
    id: crypto.randomUUID(),
    name: 'Tray Wall',
    path: wallPath,
    width: innerWidth + 2 * materialThickness,
    height: innerHeight + 2 * materialThickness,
    grainDirection: 'horizontal',
  })

  return parts
}

function generateRoundedRectanglePath(
  width: number,
  height: number,
  radius: number,
  name: string,
): VectorPath {
  const hw = width / 2
  const hh = height / 2
  const r = Math.min(radius, hw, hh)
  const k = 0.5522847498

  const points: PathPoint[] = [
    { x: -hw + r, y: -hh, type: 'move' },
    { x: hw - r, y: -hh, type: 'line' },
    { x: hw, y: -hh + r, type: 'curve', handleIn: { x: hw - r * k, y: -hh } },
    { x: hw, y: hh - r, type: 'line' },
    { x: hw - r, y: hh, type: 'curve', handleIn: { x: hw, y: hh - r * k } },
    { x: -hw + r, y: hh, type: 'line' },
    { x: -hw, y: hh - r, type: 'curve', handleIn: { x: -hw + r * k, y: hh } },
    { x: -hw, y: -hh + r, type: 'line' },
    { x: -hw + r, y: -hh, type: 'curve', handleIn: { x: -hw, y: -hh + r * k } },
  ]

  return {
    id: crypto.randomUUID(),
    layerId: 'default',
    name,
    visible: true,
    locked: false,
    selected: false,
    type: 'path',
    points,
    closed: true,
    transform: { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
    style: { fillColor: null, fillOpacity: 1, strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1 },
  }
}

function generateTrayWallPath(
  innerWidth: number,
  innerHeight: number,
  depth: number,
  cornerRadius: number,
  handleCutout: boolean,
  handleWidth: number,
  handleHeight: number,
): VectorPath {
  const outerPath = generateRoundedRectanglePath(
    innerWidth + depth * 2,
    innerHeight + depth * 2,
    cornerRadius + depth,
    'Outer'
  )
  
  return outerPath
}
