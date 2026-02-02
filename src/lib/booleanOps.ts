import type { VectorPath, PathPoint, DesignObject } from '@/types/design'

export type BooleanOperation = 'union' | 'subtract' | 'intersect' | 'xor'

interface Point {
  x: number
  y: number
}

interface Polygon {
  points: Point[]
  holes: Point[][]
}

export function performBooleanOperation(
  subjectObj: DesignObject,
  clipObj: DesignObject,
  operation: BooleanOperation,
  layerId: string
): VectorPath | null {
  const subjectPolygon = objectToPolygon(subjectObj)
  const clipPolygon = objectToPolygon(clipObj)

  if (!subjectPolygon || !clipPolygon) return null

  let resultPoints: Point[][]

  switch (operation) {
    case 'union':
      resultPoints = polygonUnion(subjectPolygon, clipPolygon)
      break
    case 'subtract':
      resultPoints = polygonSubtract(subjectPolygon, clipPolygon)
      break
    case 'intersect':
      resultPoints = polygonIntersect(subjectPolygon, clipPolygon)
      break
    case 'xor':
      resultPoints = polygonXor(subjectPolygon, clipPolygon)
      break
    default:
      return null
  }

  if (resultPoints.length === 0) return null

  return polygonToPath(resultPoints[0], layerId, `Boolean ${operation}`)
}

function objectToPolygon(obj: DesignObject): Polygon | null {
  const points = getObjectPoints(obj)
  if (points.length < 3) return null

  return {
    points,
    holes: [],
  }
}

function getObjectPoints(obj: DesignObject): Point[] {
  if (obj.type === 'path') {
    const path = obj as VectorPath
    return path.points.map(pt => ({
      x: pt.x * obj.transform.scaleX + obj.transform.x,
      y: pt.y * obj.transform.scaleY + obj.transform.y,
    }))
  }

  if (obj.type === 'shape') {
    const shape = obj as any
    const params = shape.params

    if (shape.shapeType === 'rectangle') {
      const hw = params.width / 2
      const hh = params.height / 2
      return [
        { x: obj.transform.x - hw, y: obj.transform.y - hh },
        { x: obj.transform.x + hw, y: obj.transform.y - hh },
        { x: obj.transform.x + hw, y: obj.transform.y + hh },
        { x: obj.transform.x - hw, y: obj.transform.y + hh },
      ]
    }

    if (shape.shapeType === 'ellipse') {
      const points: Point[] = []
      const segments = 64
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2
        points.push({
          x: obj.transform.x + Math.cos(angle) * params.radiusX,
          y: obj.transform.y + Math.sin(angle) * params.radiusY,
        })
      }
      return points
    }

    if (shape.shapeType === 'polygon') {
      const points: Point[] = []
      for (let i = 0; i < params.sides; i++) {
        const angle = (i / params.sides) * Math.PI * 2 - Math.PI / 2
        points.push({
          x: obj.transform.x + Math.cos(angle) * params.radius,
          y: obj.transform.y + Math.sin(angle) * params.radius,
        })
      }
      return points
    }
  }

  return []
}

function polygonToPath(points: Point[], layerId: string, name: string): VectorPath {
  const bounds = getBounds(points)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  const pathPoints: PathPoint[] = points.map(pt => ({
    x: pt.x - centerX,
    y: pt.y - centerY,
    type: 'line' as const,
  }))

  return {
    id: crypto.randomUUID(),
    layerId,
    name,
    visible: true,
    locked: false,
    selected: false,
    type: 'path',
    points: pathPoints,
    closed: true,
    transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
    style: { strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1, fillColor: null, fillOpacity: 1 },
  }
}

function getBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const pt of points) {
    minX = Math.min(minX, pt.x)
    minY = Math.min(minY, pt.y)
    maxX = Math.max(maxX, pt.x)
    maxY = Math.max(maxY, pt.y)
  }
  return { minX, minY, maxX, maxY }
}

function polygonUnion(subject: Polygon, clip: Polygon): Point[][] {
  const result = clipPolygons(subject.points, clip.points, 'union')
  return result
}

function polygonSubtract(subject: Polygon, clip: Polygon): Point[][] {
  const result = clipPolygons(subject.points, clip.points, 'subtract')
  return result
}

function polygonIntersect(subject: Polygon, clip: Polygon): Point[][] {
  const result = clipPolygons(subject.points, clip.points, 'intersect')
  return result
}

function polygonXor(subject: Polygon, clip: Polygon): Point[][] {
  const union = clipPolygons(subject.points, clip.points, 'union')
  const intersect = clipPolygons(subject.points, clip.points, 'intersect')
  
  if (union.length === 0) return []
  if (intersect.length === 0) return union
  
  return clipPolygons(union[0], intersect[0], 'subtract')
}

function clipPolygons(subject: Point[], clip: Point[], operation: 'union' | 'subtract' | 'intersect'): Point[][] {
  if (subject.length < 3 || clip.length < 3) return []

  const subjectArea = calculateSignedArea(subject)
  const clipArea = calculateSignedArea(clip)

  const subjectCW = subjectArea < 0
  const clipCW = clipArea < 0

  let subjectPoly = subjectCW ? subject : [...subject].reverse()
  let clipPoly = clipCW ? clip : [...clip].reverse()

  if (operation === 'subtract') {
    clipPoly = [...clipPoly].reverse()
  }

  const intersections = findAllIntersections(subjectPoly, clipPoly)

  if (intersections.length === 0) {
    const subjectContainsClip = isPointInPolygon(clipPoly[0], subjectPoly)
    const clipContainsSubject = isPointInPolygon(subjectPoly[0], clipPoly)

    switch (operation) {
      case 'union':
        if (subjectContainsClip) return [subjectPoly]
        if (clipContainsSubject) return [clipPoly]
        return [subjectPoly, clipPoly]
      case 'intersect':
        if (subjectContainsClip) return [clipPoly]
        if (clipContainsSubject) return [subjectPoly]
        return []
      case 'subtract':
        if (clipContainsSubject) return []
        if (subjectContainsClip) {
          return [subjectPoly]
        }
        return [subjectPoly]
    }
  }

  const subjectWithIntersections = insertIntersections(subjectPoly, intersections, 'subject')
  const clipWithIntersections = insertIntersections(clipPoly, intersections, 'clip')

  const result = tracePolygon(subjectWithIntersections, clipWithIntersections, operation)

  return result
}

interface Intersection {
  point: Point
  subjectIndex: number
  subjectT: number
  clipIndex: number
  clipT: number
  entering: boolean
}

function findAllIntersections(subject: Point[], clip: Point[]): Intersection[] {
  const intersections: Intersection[] = []

  for (let i = 0; i < subject.length; i++) {
    const s1 = subject[i]
    const s2 = subject[(i + 1) % subject.length]

    for (let j = 0; j < clip.length; j++) {
      const c1 = clip[j]
      const c2 = clip[(j + 1) % clip.length]

      const intersection = lineIntersection(s1, s2, c1, c2)
      if (intersection) {
        const entering = crossProduct(
          { x: s2.x - s1.x, y: s2.y - s1.y },
          { x: c2.x - c1.x, y: c2.y - c1.y }
        ) > 0

        intersections.push({
          point: intersection.point,
          subjectIndex: i,
          subjectT: intersection.t1,
          clipIndex: j,
          clipT: intersection.t2,
          entering,
        })
      }
    }
  }

  return intersections
}

function lineIntersection(
  p1: Point, p2: Point, p3: Point, p4: Point
): { point: Point; t1: number; t2: number } | null {
  const d1x = p2.x - p1.x
  const d1y = p2.y - p1.y
  const d2x = p4.x - p3.x
  const d2y = p4.y - p3.y

  const cross = d1x * d2y - d1y * d2x
  if (Math.abs(cross) < 1e-10) return null

  const dx = p3.x - p1.x
  const dy = p3.y - p1.y

  const t1 = (dx * d2y - dy * d2x) / cross
  const t2 = (dx * d1y - dy * d1x) / cross

  if (t1 > 0.0001 && t1 < 0.9999 && t2 > 0.0001 && t2 < 0.9999) {
    return {
      point: {
        x: p1.x + t1 * d1x,
        y: p1.y + t1 * d1y,
      },
      t1,
      t2,
    }
  }

  return null
}

function crossProduct(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x
}

interface PolyPoint extends Point {
  isIntersection: boolean
  intersectionIndex?: number
  entering?: boolean
  visited?: boolean
}

function insertIntersections(
  polygon: Point[],
  intersections: Intersection[],
  type: 'subject' | 'clip'
): PolyPoint[] {
  const result: PolyPoint[] = []

  for (let i = 0; i < polygon.length; i++) {
    result.push({ ...polygon[i], isIntersection: false })

    const edgeIntersections = intersections
      .filter(int => type === 'subject' ? int.subjectIndex === i : int.clipIndex === i)
      .sort((a, b) => {
        const tA = type === 'subject' ? a.subjectT : a.clipT
        const tB = type === 'subject' ? b.subjectT : b.clipT
        return tA - tB
      })

    for (let j = 0; j < edgeIntersections.length; j++) {
      const int = edgeIntersections[j]
      result.push({
        ...int.point,
        isIntersection: true,
        intersectionIndex: intersections.indexOf(int),
        entering: type === 'subject' ? int.entering : !int.entering,
        visited: false,
      })
    }
  }

  return result
}

function tracePolygon(
  subject: PolyPoint[],
  clip: PolyPoint[],
  operation: 'union' | 'subtract' | 'intersect'
): Point[][] {
  const results: Point[][] = []

  const subjectIntersections = subject.filter(p => p.isIntersection)
  
  for (const startPoint of subjectIntersections) {
    if (startPoint.visited) continue

    const shouldStart = operation === 'union' ? !startPoint.entering :
                        operation === 'intersect' ? startPoint.entering :
                        !startPoint.entering

    if (!shouldStart) continue

    const polygon: Point[] = []
    let current = startPoint
    let onSubject = true
    let iterations = 0
    const maxIterations = subject.length + clip.length + 100

    while (iterations < maxIterations) {
      iterations++

      if (current.isIntersection) {
        if (current.visited && polygon.length > 2) {
          break
        }
        current.visited = true

        const correspondingIndex = current.intersectionIndex!
        const otherPoly = onSubject ? clip : subject
        const correspondingPoint = otherPoly.find(
          p => p.isIntersection && p.intersectionIndex === correspondingIndex
        )

        if (correspondingPoint) {
          correspondingPoint.visited = true
        }

        onSubject = !onSubject
      }

      polygon.push({ x: current.x, y: current.y })

      const currentPoly = onSubject ? subject : clip
      const currentIndex = currentPoly.indexOf(current)
      const nextIndex = (currentIndex + 1) % currentPoly.length
      current = currentPoly[nextIndex]

      if (current === startPoint) break
    }

    if (polygon.length >= 3) {
      results.push(polygon)
    }
  }

  return results
}

function calculateSignedArea(points: Point[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return area / 2
}

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

export function canPerformBoolean(objects: DesignObject[]): boolean {
  if (objects.length !== 2) return false
  
  for (const obj of objects) {
    if (obj.type !== 'path' && obj.type !== 'shape') return false
    if (obj.type === 'shape') {
      const shape = obj as any
      if (shape.shapeType === 'line') return false
    }
  }
  
  return true
}
