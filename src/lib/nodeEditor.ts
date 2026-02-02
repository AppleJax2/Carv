import type { PathPoint, VectorPath } from '@/types/design'

export interface NodeHandle {
  nodeIndex: number
  handleType: 'in' | 'out' | 'point'
  x: number
  y: number
}

export interface NodeSelection {
  pathId: string
  nodeIndex: number
  handleType: 'in' | 'out' | 'point'
}

export function getPathNodes(path: VectorPath): NodeHandle[] {
  const handles: NodeHandle[] = []
  
  for (let i = 0; i < path.points.length; i++) {
    const pt = path.points[i]
    const worldX = pt.x * path.transform.scaleX + path.transform.x
    const worldY = pt.y * path.transform.scaleY + path.transform.y

    handles.push({
      nodeIndex: i,
      handleType: 'point',
      x: worldX,
      y: worldY,
    })

    if (pt.handleIn) {
      handles.push({
        nodeIndex: i,
        handleType: 'in',
        x: pt.handleIn.x * path.transform.scaleX + path.transform.x,
        y: pt.handleIn.y * path.transform.scaleY + path.transform.y,
      })
    }

    if (pt.handleOut) {
      handles.push({
        nodeIndex: i,
        handleType: 'out',
        x: pt.handleOut.x * path.transform.scaleX + path.transform.x,
        y: pt.handleOut.y * path.transform.scaleY + path.transform.y,
      })
    }
  }

  return handles
}

export function findNodeAtPoint(
  path: VectorPath, 
  x: number, 
  y: number, 
  threshold: number = 8
): NodeHandle | null {
  const handles = getPathNodes(path)
  
  for (const handle of handles) {
    if (handle.handleType === 'point') {
      const dist = Math.sqrt((handle.x - x) ** 2 + (handle.y - y) ** 2)
      if (dist <= threshold) {
        return handle
      }
    }
  }

  for (const handle of handles) {
    if (handle.handleType !== 'point') {
      const dist = Math.sqrt((handle.x - x) ** 2 + (handle.y - y) ** 2)
      if (dist <= threshold * 0.7) {
        return handle
      }
    }
  }

  return null
}

export function moveNode(
  path: VectorPath, 
  nodeIndex: number, 
  handleType: 'in' | 'out' | 'point',
  dx: number, 
  dy: number,
  mirrorHandles: boolean = true
): VectorPath {
  const newPoints = [...path.points]
  const pt = { ...newPoints[nodeIndex] }

  const localDx = dx / path.transform.scaleX
  const localDy = dy / path.transform.scaleY

  if (handleType === 'point') {
    pt.x += localDx
    pt.y += localDy

    if (pt.handleIn) {
      pt.handleIn = { x: pt.handleIn.x + localDx, y: pt.handleIn.y + localDy }
    }
    if (pt.handleOut) {
      pt.handleOut = { x: pt.handleOut.x + localDx, y: pt.handleOut.y + localDy }
    }
  } else if (handleType === 'in' && pt.handleIn) {
    pt.handleIn = { x: pt.handleIn.x + localDx, y: pt.handleIn.y + localDy }
    
    if (mirrorHandles && pt.handleOut) {
      const angle = Math.atan2(pt.handleIn.y - pt.y, pt.handleIn.x - pt.x)
      const outDist = Math.sqrt((pt.handleOut.x - pt.x) ** 2 + (pt.handleOut.y - pt.y) ** 2)
      pt.handleOut = {
        x: pt.x - Math.cos(angle) * outDist,
        y: pt.y - Math.sin(angle) * outDist,
      }
    }
  } else if (handleType === 'out' && pt.handleOut) {
    pt.handleOut = { x: pt.handleOut.x + localDx, y: pt.handleOut.y + localDy }
    
    if (mirrorHandles && pt.handleIn) {
      const angle = Math.atan2(pt.handleOut.y - pt.y, pt.handleOut.x - pt.x)
      const inDist = Math.sqrt((pt.handleIn.x - pt.x) ** 2 + (pt.handleIn.y - pt.y) ** 2)
      pt.handleIn = {
        x: pt.x - Math.cos(angle) * inDist,
        y: pt.y - Math.sin(angle) * inDist,
      }
    }
  }

  newPoints[nodeIndex] = pt

  return {
    ...path,
    points: newPoints,
  }
}

export function addNode(path: VectorPath, afterIndex: number, t: number = 0.5): VectorPath {
  const newPoints = [...path.points]
  const p0 = path.points[afterIndex]
  const p1 = path.points[(afterIndex + 1) % path.points.length]

  let newPoint: PathPoint

  if (p0.handleOut && p1.handleIn) {
    const { point, handleIn, handleOut, newP0HandleOut, newP1HandleIn } = 
      splitCubicBezier(p0, p1, t)

    newPoints[afterIndex] = { ...p0, handleOut: newP0HandleOut }
    
    newPoint = {
      x: point.x,
      y: point.y,
      type: 'curve',
      handleIn,
      handleOut,
    }

    const nextIndex = (afterIndex + 1) % path.points.length
    newPoints[nextIndex] = { ...p1, handleIn: newP1HandleIn }
  } else {
    newPoint = {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
      type: 'line',
    }
  }

  newPoints.splice(afterIndex + 1, 0, newPoint)

  return {
    ...path,
    points: newPoints,
  }
}

export function deleteNode(path: VectorPath, nodeIndex: number): VectorPath | null {
  if (path.points.length <= 2) {
    return null
  }

  const newPoints = path.points.filter((_, i) => i !== nodeIndex)

  return {
    ...path,
    points: newPoints,
  }
}

export function convertNodeType(
  path: VectorPath, 
  nodeIndex: number, 
  toType: 'smooth' | 'corner' | 'symmetric'
): VectorPath {
  const newPoints = [...path.points]
  const pt = { ...newPoints[nodeIndex] }

  const prevIndex = (nodeIndex - 1 + path.points.length) % path.points.length
  const nextIndex = (nodeIndex + 1) % path.points.length
  const prev = path.points[prevIndex]
  const next = path.points[nextIndex]

  if (toType === 'corner') {
    pt.handleIn = undefined
    pt.handleOut = undefined
    pt.type = 'line'
  } else if (toType === 'smooth' || toType === 'symmetric') {
    const dx = next.x - prev.x
    const dy = next.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    if (dist > 0) {
      const handleLength = toType === 'symmetric' 
        ? dist / 4 
        : Math.min(
            Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2) / 3,
            Math.sqrt((next.x - pt.x) ** 2 + (next.y - pt.y) ** 2) / 3
          )

      const nx = dx / dist
      const ny = dy / dist

      pt.handleIn = { x: pt.x - nx * handleLength, y: pt.y - ny * handleLength }
      pt.handleOut = { x: pt.x + nx * handleLength, y: pt.y + ny * handleLength }
      pt.type = 'curve'
    }
  }

  newPoints[nodeIndex] = pt

  return {
    ...path,
    points: newPoints,
  }
}

export function simplifyPath(path: VectorPath, tolerance: number = 1): VectorPath {
  if (path.points.length <= 2) return path

  const simplified = douglasPeucker(path.points, tolerance)

  return {
    ...path,
    points: simplified,
  }
}

function douglasPeucker(points: PathPoint[], tolerance: number): PathPoint[] {
  if (points.length <= 2) return points

  let maxDist = 0
  let maxIndex = 0

  const first = points[0]
  const last = points[points.length - 1]

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last)
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

  return [first, last]
}

function perpendicularDistance(point: PathPoint, lineStart: PathPoint, lineEnd: PathPoint): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const len = Math.sqrt(dx * dx + dy * dy)

  if (len === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2)
  }

  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len)
  const projX = lineStart.x + t * dx
  const projY = lineStart.y + t * dy

  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2)
}

function splitCubicBezier(
  p0: PathPoint, 
  p1: PathPoint, 
  t: number
): {
  point: { x: number; y: number }
  handleIn: { x: number; y: number }
  handleOut: { x: number; y: number }
  newP0HandleOut: { x: number; y: number }
  newP1HandleIn: { x: number; y: number }
} {
  const x0 = p0.x, y0 = p0.y
  const x1 = p0.handleOut?.x ?? p0.x, y1 = p0.handleOut?.y ?? p0.y
  const x2 = p1.handleIn?.x ?? p1.x, y2 = p1.handleIn?.y ?? p1.y
  const x3 = p1.x, y3 = p1.y

  const x01 = x0 + (x1 - x0) * t
  const y01 = y0 + (y1 - y0) * t
  const x12 = x1 + (x2 - x1) * t
  const y12 = y1 + (y2 - y1) * t
  const x23 = x2 + (x3 - x2) * t
  const y23 = y2 + (y3 - y2) * t

  const x012 = x01 + (x12 - x01) * t
  const y012 = y01 + (y12 - y01) * t
  const x123 = x12 + (x23 - x12) * t
  const y123 = y12 + (y23 - y12) * t

  const x0123 = x012 + (x123 - x012) * t
  const y0123 = y012 + (y123 - y012) * t

  return {
    point: { x: x0123, y: y0123 },
    handleIn: { x: x012, y: y012 },
    handleOut: { x: x123, y: y123 },
    newP0HandleOut: { x: x01, y: y01 },
    newP1HandleIn: { x: x23, y: y23 },
  }
}

export function smoothPath(path: VectorPath, smoothness: number = 0.25): VectorPath {
  const newPoints: PathPoint[] = []

  for (let i = 0; i < path.points.length; i++) {
    const pt = path.points[i]
    const prev = path.points[(i - 1 + path.points.length) % path.points.length]
    const next = path.points[(i + 1) % path.points.length]

    const dx = next.x - prev.x
    const dy = next.y - prev.y

    const distPrev = Math.sqrt((pt.x - prev.x) ** 2 + (pt.y - prev.y) ** 2)
    const distNext = Math.sqrt((next.x - pt.x) ** 2 + (next.y - pt.y) ** 2)

    const handleInLen = distPrev * smoothness
    const handleOutLen = distNext * smoothness

    const len = Math.sqrt(dx * dx + dy * dy)
    if (len === 0) {
      newPoints.push({ ...pt })
      continue
    }

    const nx = dx / len
    const ny = dy / len

    newPoints.push({
      ...pt,
      type: 'curve',
      handleIn: { x: pt.x - nx * handleInLen, y: pt.y - ny * handleInLen },
      handleOut: { x: pt.x + nx * handleOutLen, y: pt.y + ny * handleOutLen },
    })
  }

  return {
    ...path,
    points: newPoints,
  }
}

export function reversePath(path: VectorPath): VectorPath {
  const newPoints = [...path.points].reverse().map(pt => ({
    ...pt,
    handleIn: pt.handleOut,
    handleOut: pt.handleIn,
  }))

  return {
    ...path,
    points: newPoints,
  }
}

export function offsetPath(path: VectorPath, distance: number): VectorPath {
  const newPoints: PathPoint[] = []

  for (let i = 0; i < path.points.length; i++) {
    const pt = path.points[i]
    const prev = path.points[(i - 1 + path.points.length) % path.points.length]
    const next = path.points[(i + 1) % path.points.length]

    const dx1 = pt.x - prev.x
    const dy1 = pt.y - prev.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)

    const dx2 = next.x - pt.x
    const dy2 = next.y - pt.y
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)

    let nx = 0, ny = 0

    if (len1 > 0 && len2 > 0) {
      const n1x = -dy1 / len1
      const n1y = dx1 / len1
      const n2x = -dy2 / len2
      const n2y = dx2 / len2

      nx = (n1x + n2x) / 2
      ny = (n1y + n2y) / 2
      const nLen = Math.sqrt(nx * nx + ny * ny)
      if (nLen > 0) {
        nx /= nLen
        ny /= nLen
      }
    } else if (len1 > 0) {
      nx = -dy1 / len1
      ny = dx1 / len1
    } else if (len2 > 0) {
      nx = -dy2 / len2
      ny = dx2 / len2
    }

    newPoints.push({
      ...pt,
      x: pt.x + nx * distance,
      y: pt.y + ny * distance,
      handleIn: pt.handleIn ? {
        x: pt.handleIn.x + nx * distance,
        y: pt.handleIn.y + ny * distance,
      } : undefined,
      handleOut: pt.handleOut ? {
        x: pt.handleOut.x + nx * distance,
        y: pt.handleOut.y + ny * distance,
      } : undefined,
    })
  }

  return {
    ...path,
    points: newPoints,
  }
}
