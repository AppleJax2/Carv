import type { VectorPath, VectorShape, PathPoint } from '@/types/design'

export interface Point {
  x: number
  y: number
}

export interface Polygon {
  points: Point[]
  closed: boolean
  holes?: Point[][]
}

export function offsetPath(points: Point[], distance: number, cornerStyle: 'miter' | 'round' | 'bevel' = 'round'): Point[] {
  if (points.length < 2) return points
  
  const result: Point[] = []
  const n = points.length
  
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]
    
    const v1 = normalize({ x: curr.x - prev.x, y: curr.y - prev.y })
    const v2 = normalize({ x: next.x - curr.x, y: next.y - curr.y })
    
    const n1 = { x: -v1.y, y: v1.x }
    const n2 = { x: -v2.y, y: v2.x }
    
    if (cornerStyle === 'miter') {
      const bisector = normalize({ x: n1.x + n2.x, y: n1.y + n2.y })
      const dot = n1.x * bisector.x + n1.y * bisector.y
      const miterLength = dot !== 0 ? distance / dot : distance
      
      result.push({
        x: curr.x + bisector.x * miterLength,
        y: curr.y + bisector.y * miterLength,
      })
    } else if (cornerStyle === 'round') {
      const angle1 = Math.atan2(n1.y, n1.x)
      const angle2 = Math.atan2(n2.y, n2.x)
      let angleDiff = angle2 - angle1
      
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI
      
      const segments = Math.max(1, Math.ceil(Math.abs(angleDiff) / (Math.PI / 8)))
      
      for (let j = 0; j <= segments; j++) {
        const t = j / segments
        const angle = angle1 + angleDiff * t
        result.push({
          x: curr.x + Math.cos(angle) * distance,
          y: curr.y + Math.sin(angle) * distance,
        })
      }
    } else {
      result.push({ x: curr.x + n1.x * distance, y: curr.y + n1.y * distance })
      result.push({ x: curr.x + n2.x * distance, y: curr.y + n2.y * distance })
    }
  }
  
  return result
}

export function simplifyPath(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points
  
  return douglasPeucker(points, tolerance)
}

function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points
  
  let maxDist = 0
  let maxIndex = 0
  
  const start = points[0]
  const end = points[points.length - 1]
  
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end)
    if (dist > maxDist) {
      maxDist = dist
      maxIndex = i
    }
  }
  
  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
    const right = douglasPeucker(points.slice(maxIndex), tolerance)
    return [...left.slice(0, -1), ...right]
  }
  
  return [start, end]
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const len = Math.sqrt(dx * dx + dy * dy)
  
  if (len === 0) return distance(point, lineStart)
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len)
  ))
  
  const projection = {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  }
  
  return distance(point, projection)
}

export function smoothPath(points: Point[], tension: number = 0.5): PathPoint[] {
  if (points.length < 2) return points.map(p => ({ ...p, type: 'line' as const }))
  
  const result: PathPoint[] = []
  
  for (let i = 0; i < points.length; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[Math.min(points.length - 1, i + 1)]
    
    const handleLength = distance(p0, p2) * tension * 0.25
    
    const tangent = normalize({
      x: p2.x - p0.x,
      y: p2.y - p0.y,
    })
    
    result.push({
      x: p1.x,
      y: p1.y,
      type: i === 0 ? 'move' : 'curve',
      handleIn: i > 0 ? {
        x: p1.x - tangent.x * handleLength,
        y: p1.y - tangent.y * handleLength,
      } : undefined,
      handleOut: i < points.length - 1 ? {
        x: p1.x + tangent.x * handleLength,
        y: p1.y + tangent.y * handleLength,
      } : undefined,
    })
  }
  
  return result
}

export function joinPaths(paths: VectorPath[]): VectorPath | null {
  if (paths.length === 0) return null
  if (paths.length === 1) return paths[0]
  
  const tolerance = 0.1
  const result: PathPoint[] = [...paths[0].points]
  const usedPaths = new Set([0])
  
  while (usedPaths.size < paths.length) {
    let foundConnection = false
    const lastPoint = result[result.length - 1]
    
    for (let i = 0; i < paths.length; i++) {
      if (usedPaths.has(i)) continue
      
      const path = paths[i]
      const firstPoint = path.points[0]
      const pathLastPoint = path.points[path.points.length - 1]
      
      if (distance(lastPoint, firstPoint) < tolerance) {
        result.push(...path.points.slice(1))
        usedPaths.add(i)
        foundConnection = true
        break
      }
      
      if (distance(lastPoint, pathLastPoint) < tolerance) {
        result.push(...[...path.points].reverse().slice(1))
        usedPaths.add(i)
        foundConnection = true
        break
      }
    }
    
    if (!foundConnection) break
  }
  
  return {
    ...paths[0],
    id: crypto.randomUUID(),
    name: 'Joined Path',
    points: result,
    closed: distance(result[0], result[result.length - 1]) < tolerance,
  }
}

export function splitPathAtPoint(path: VectorPath, pointIndex: number): [VectorPath, VectorPath] | null {
  if (pointIndex <= 0 || pointIndex >= path.points.length - 1) return null
  
  const path1: VectorPath = {
    ...path,
    id: crypto.randomUUID(),
    name: `${path.name} (1)`,
    points: path.points.slice(0, pointIndex + 1),
    closed: false,
  }
  
  const path2: VectorPath = {
    ...path,
    id: crypto.randomUUID(),
    name: `${path.name} (2)`,
    points: path.points.slice(pointIndex),
    closed: false,
  }
  
  return [path1, path2]
}

export function reversePath(path: VectorPath): VectorPath {
  const reversedPoints = [...path.points].reverse().map((point) => {
    const newPoint: PathPoint = {
      ...point,
      handleIn: point.handleOut ? { ...point.handleOut } : undefined,
      handleOut: point.handleIn ? { ...point.handleIn } : undefined,
    }
    return newPoint
  })
  
  return {
    ...path,
    points: reversedPoints,
  }
}

export function filletCorner(
  path: VectorPath, 
  cornerIndex: number, 
  radius: number
): VectorPath {
  if (cornerIndex <= 0 || cornerIndex >= path.points.length - 1) return path
  
  const points = [...path.points]
  const prev = points[cornerIndex - 1]
  const curr = points[cornerIndex]
  const next = points[cornerIndex + 1]
  
  const v1 = normalize({ x: prev.x - curr.x, y: prev.y - curr.y })
  const v2 = normalize({ x: next.x - curr.x, y: next.y - curr.y })
  
  const angle = Math.acos(v1.x * v2.x + v1.y * v2.y)
  const tangentLength = radius / Math.tan(angle / 2)
  
  const p1x = curr.x + v1.x * tangentLength
  const p1y = curr.y + v1.y * tangentLength
  const p2x = curr.x + v2.x * tangentLength
  const p2y = curr.y + v2.y * tangentLength
  
  const filletP1: PathPoint = {
    x: p1x,
    y: p1y,
    type: 'line',
    handleOut: {
      x: p1x - v1.x * radius * 0.55,
      y: p1y - v1.y * radius * 0.55,
    },
  }
  
  const filletP2: PathPoint = {
    x: p2x,
    y: p2y,
    type: 'curve',
    handleIn: {
      x: p2x - v2.x * radius * 0.55,
      y: p2y - v2.y * radius * 0.55,
    },
  }
  
  const newPoints = [
    ...points.slice(0, cornerIndex),
    filletP1,
    filletP2,
    ...points.slice(cornerIndex + 1),
  ]
  
  return { ...path, points: newPoints }
}

export function chamferCorner(
  path: VectorPath, 
  cornerIndex: number, 
  distance1: number,
  distance2?: number
): VectorPath {
  if (cornerIndex <= 0 || cornerIndex >= path.points.length - 1) return path
  
  const d2 = distance2 ?? distance1
  const points = [...path.points]
  const prev = points[cornerIndex - 1]
  const curr = points[cornerIndex]
  const next = points[cornerIndex + 1]
  
  const v1 = normalize({ x: prev.x - curr.x, y: prev.y - curr.y })
  const v2 = normalize({ x: next.x - curr.x, y: next.y - curr.y })
  
  const p1: PathPoint = {
    x: curr.x + v1.x * distance1,
    y: curr.y + v1.y * distance1,
    type: 'line',
  }
  
  const p2: PathPoint = {
    x: curr.x + v2.x * d2,
    y: curr.y + v2.y * d2,
    type: 'line',
  }
  
  const newPoints = [
    ...points.slice(0, cornerIndex),
    p1,
    p2,
    ...points.slice(cornerIndex + 1),
  ]
  
  return { ...path, points: newPoints }
}

export function strokeToOutline(path: VectorPath, strokeWidth: number): VectorPath {
  const halfWidth = strokeWidth / 2
  const points = path.points.map(p => ({ x: p.x, y: p.y }))
  
  const outerOffset = offsetPath(points, halfWidth, 'round')
  const innerOffset = offsetPath(points, -halfWidth, 'round').reverse()
  
  const outlinePoints: PathPoint[] = [
    ...outerOffset.map((p, i) => ({
      x: p.x,
      y: p.y,
      type: i === 0 ? 'move' as const : 'line' as const,
    })),
    ...innerOffset.map(p => ({
      x: p.x,
      y: p.y,
      type: 'line' as const,
    })),
  ]
  
  return {
    ...path,
    id: crypto.randomUUID(),
    name: `${path.name} (Outline)`,
    points: outlinePoints,
    closed: true,
    style: {
      ...path.style,
      fillColor: path.style.strokeColor,
      strokeColor: null,
      strokeWidth: 0,
    },
  }
}

export function pathToPolygon(path: VectorPath, segmentsPerCurve: number = 16): Point[] {
  const result: Point[] = []
  
  for (let i = 0; i < path.points.length; i++) {
    const point = path.points[i]
    
    if (point.type === 'curve' && i > 0 && point.handleIn) {
      const prev = path.points[i - 1]
      const p0 = { x: prev.x, y: prev.y }
      const p1 = prev.handleOut || p0
      const p2 = point.handleIn
      const p3 = { x: point.x, y: point.y }
      
      for (let t = 0; t <= 1; t += 1 / segmentsPerCurve) {
        result.push(cubicBezierPoint(p0, p1, p2, p3, t))
      }
    } else {
      result.push({ x: point.x, y: point.y })
    }
  }
  
  return result
}

function cubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const mt = 1 - t
  const mt2 = mt * mt
  const mt3 = mt2 * mt
  const t2 = t * t
  const t3 = t2 * t
  
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  }
}

export function shapeToPath(shape: VectorShape): VectorPath {
  const points: PathPoint[] = []
  
  switch (shape.shapeType) {
    case 'rectangle': {
      const { width, height, cornerRadius } = shape.params as { width: number; height: number; cornerRadius?: number }
      const hw = width / 2
      const hh = height / 2
      const r = Math.min(cornerRadius || 0, hw, hh)
      
      if (r > 0) {
        points.push(
          { x: -hw + r, y: -hh, type: 'move' },
          { x: hw - r, y: -hh, type: 'line' },
          { x: hw, y: -hh + r, type: 'curve', handleIn: { x: hw, y: -hh } },
          { x: hw, y: hh - r, type: 'line' },
          { x: hw - r, y: hh, type: 'curve', handleIn: { x: hw, y: hh } },
          { x: -hw + r, y: hh, type: 'line' },
          { x: -hw, y: hh - r, type: 'curve', handleIn: { x: -hw, y: hh } },
          { x: -hw, y: -hh + r, type: 'line' },
          { x: -hw + r, y: -hh, type: 'curve', handleIn: { x: -hw, y: -hh } },
        )
      } else {
        points.push(
          { x: -hw, y: -hh, type: 'move' },
          { x: hw, y: -hh, type: 'line' },
          { x: hw, y: hh, type: 'line' },
          { x: -hw, y: hh, type: 'line' },
        )
      }
      break
    }
    
    case 'ellipse': {
      const { radiusX, radiusY } = shape.params as { radiusX: number; radiusY: number }
      const k = 0.5522847498
      
      points.push(
        { x: 0, y: -radiusY, type: 'move', handleOut: { x: radiusX * k, y: -radiusY } },
        { x: radiusX, y: 0, type: 'curve', handleIn: { x: radiusX, y: -radiusY * k }, handleOut: { x: radiusX, y: radiusY * k } },
        { x: 0, y: radiusY, type: 'curve', handleIn: { x: radiusX * k, y: radiusY }, handleOut: { x: -radiusX * k, y: radiusY } },
        { x: -radiusX, y: 0, type: 'curve', handleIn: { x: -radiusX, y: radiusY * k }, handleOut: { x: -radiusX, y: -radiusY * k } },
        { x: 0, y: -radiusY, type: 'curve', handleIn: { x: -radiusX * k, y: -radiusY } },
      )
      break
    }
    
    case 'polygon': {
      const { sides, radius } = shape.params as { sides: number; radius: number }
      
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          type: i === 0 ? 'move' : 'line',
        })
      }
      break
    }
    
    case 'star': {
      const { points: starPoints, outerRadius, innerRadius } = shape.params as { points: number; outerRadius: number; innerRadius: number }
      
      for (let i = 0; i < starPoints * 2; i++) {
        const angle = (i / (starPoints * 2)) * Math.PI * 2 - Math.PI / 2
        const r = i % 2 === 0 ? outerRadius : innerRadius
        points.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          type: i === 0 ? 'move' : 'line',
        })
      }
      break
    }
  }
  
  return {
    id: crypto.randomUUID(),
    layerId: shape.layerId,
    name: `${shape.name} (Path)`,
    visible: shape.visible,
    locked: shape.locked,
    selected: shape.selected,
    type: 'path',
    points,
    closed: true,
    transform: { ...shape.transform },
    style: { ...shape.style },
  }
}

export function detectOpenContours(paths: VectorPath[]): VectorPath[] {
  return paths.filter(path => !path.closed && path.points.length > 1)
}

export function healGaps(paths: VectorPath[], tolerance: number): VectorPath[] {
  const result: VectorPath[] = []
  const processed = new Set<string>()
  
  for (const path of paths) {
    if (processed.has(path.id)) continue
    
    let current = path
    processed.add(path.id)
    
    let foundConnection = true
    while (foundConnection) {
      foundConnection = false
      const lastPoint = current.points[current.points.length - 1]
      
      for (const other of paths) {
        if (processed.has(other.id)) continue
        
        const firstPoint = other.points[0]
        if (distance(lastPoint, firstPoint) < tolerance) {
          current = {
            ...current,
            points: [...current.points, ...other.points.slice(1)],
          }
          processed.add(other.id)
          foundConnection = true
          break
        }
      }
    }
    
    if (distance(current.points[0], current.points[current.points.length - 1]) < tolerance) {
      current.closed = true
    }
    
    result.push(current)
  }
  
  return result
}

export function getPathBounds(path: VectorPath): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  for (const point of path.points) {
    const x = point.x * path.transform.scaleX + path.transform.x
    const y = point.y * path.transform.scaleY + path.transform.y
    
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  
  return { minX, minY, maxX, maxY }
}

export function getPathLength(path: VectorPath): number {
  let length = 0
  
  for (let i = 1; i < path.points.length; i++) {
    const prev = path.points[i - 1]
    const curr = path.points[i]
    
    if (curr.type === 'curve' && curr.handleIn) {
      length += estimateCurveLength(
        { x: prev.x, y: prev.y },
        prev.handleOut || { x: prev.x, y: prev.y },
        curr.handleIn,
        { x: curr.x, y: curr.y }
      )
    } else {
      length += distance(prev, curr)
    }
  }
  
  if (path.closed && path.points.length > 1) {
    const first = path.points[0]
    const last = path.points[path.points.length - 1]
    length += distance(first, last)
  }
  
  return length
}

function estimateCurveLength(p0: Point, p1: Point, p2: Point, p3: Point, segments: number = 10): number {
  let length = 0
  let prev = p0
  
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const curr = cubicBezierPoint(p0, p1, p2, p3, t)
    length += distance(prev, curr)
    prev = curr
  }
  
  return length
}

function normalize(v: Point): Point {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function distance(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  const n = polygon.length
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}

export function polygonArea(polygon: Point[]): number {
  let area = 0
  const n = polygon.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += polygon[i].x * polygon[j].y
    area -= polygon[j].x * polygon[i].y
  }
  
  return Math.abs(area / 2)
}

export function polygonCentroid(polygon: Point[]): Point {
  let cx = 0, cy = 0
  const n = polygon.length
  
  for (const p of polygon) {
    cx += p.x
    cy += p.y
  }
  
  return { x: cx / n, y: cy / n }
}

export function isClockwise(polygon: Point[]): boolean {
  let sum = 0
  const n = polygon.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    sum += (polygon[j].x - polygon[i].x) * (polygon[j].y + polygon[i].y)
  }
  
  return sum > 0
}

export function ensureClockwise(polygon: Point[]): Point[] {
  return isClockwise(polygon) ? polygon : [...polygon].reverse()
}

export function ensureCounterClockwise(polygon: Point[]): Point[] {
  return isClockwise(polygon) ? [...polygon].reverse() : polygon
}
