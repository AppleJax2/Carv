import type { VectorPath, VectorShape, PathPoint, DesignObject } from '@/types/design'

interface ParsedSVG {
  width: number
  height: number
  viewBox: { x: number; y: number; width: number; height: number } | null
  objects: DesignObject[]
}

interface TransformMatrix {
  a: number; b: number; c: number; d: number; e: number; f: number
}

const IDENTITY_MATRIX: TransformMatrix = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }

export function parseSVG(svgContent: string, layerId: string): ParsedSVG {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgContent, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  
  if (!svg) {
    throw new Error('Invalid SVG: No svg element found')
  }

  const width = parseFloat(svg.getAttribute('width') || '100')
  const height = parseFloat(svg.getAttribute('height') || '100')
  
  let viewBox: ParsedSVG['viewBox'] = null
  const viewBoxAttr = svg.getAttribute('viewBox')
  if (viewBoxAttr) {
    const parts = viewBoxAttr.split(/[\s,]+/).map(Number)
    if (parts.length === 4) {
      viewBox = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }
    }
  }

  const objects: DesignObject[] = []
  
  function processElement(element: Element, parentTransform: TransformMatrix) {
    const transform = combineTransforms(parentTransform, parseTransform(element.getAttribute('transform')))
    const style = parseStyle(element)

    switch (element.tagName.toLowerCase()) {
      case 'path':
        const pathData = element.getAttribute('d')
        if (pathData) {
          const pathObj = parsePathData(pathData, transform, style, layerId)
          if (pathObj) objects.push(pathObj)
        }
        break

      case 'rect':
        const rectObj = parseRect(element, transform, style, layerId)
        if (rectObj) objects.push(rectObj)
        break

      case 'circle':
        const circleObj = parseCircle(element, transform, style, layerId)
        if (circleObj) objects.push(circleObj)
        break

      case 'ellipse':
        const ellipseObj = parseEllipse(element, transform, style, layerId)
        if (ellipseObj) objects.push(ellipseObj)
        break

      case 'line':
        const lineObj = parseLine(element, transform, style, layerId)
        if (lineObj) objects.push(lineObj)
        break

      case 'polyline':
      case 'polygon':
        const polyObj = parsePolyline(element, transform, style, layerId, element.tagName.toLowerCase() === 'polygon')
        if (polyObj) objects.push(polyObj)
        break

      case 'g':
      case 'svg':
        for (const child of element.children) {
          processElement(child, transform)
        }
        break
    }
  }

  for (const child of svg.children) {
    processElement(child, IDENTITY_MATRIX)
  }

  return { width, height, viewBox, objects }
}

function parseTransform(transformStr: string | null): TransformMatrix {
  if (!transformStr) return IDENTITY_MATRIX

  let matrix = IDENTITY_MATRIX
  const transforms = transformStr.match(/(\w+)\s*\(([^)]+)\)/g) || []

  for (const t of transforms) {
    const match = t.match(/(\w+)\s*\(([^)]+)\)/)
    if (!match) continue

    const [, type, args] = match
    const values = args.split(/[\s,]+/).map(Number)

    switch (type) {
      case 'translate':
        matrix = combineTransforms(matrix, {
          a: 1, b: 0, c: 0, d: 1,
          e: values[0] || 0,
          f: values[1] || 0
        })
        break

      case 'scale':
        const sx = values[0] || 1
        const sy = values[1] ?? sx
        matrix = combineTransforms(matrix, {
          a: sx, b: 0, c: 0, d: sy, e: 0, f: 0
        })
        break

      case 'rotate':
        const angle = (values[0] || 0) * Math.PI / 180
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        if (values.length === 3) {
          const cx = values[1], cy = values[2]
          matrix = combineTransforms(matrix, { a: 1, b: 0, c: 0, d: 1, e: cx, f: cy })
          matrix = combineTransforms(matrix, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 })
          matrix = combineTransforms(matrix, { a: 1, b: 0, c: 0, d: 1, e: -cx, f: -cy })
        } else {
          matrix = combineTransforms(matrix, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 })
        }
        break

      case 'matrix':
        if (values.length === 6) {
          matrix = combineTransforms(matrix, {
            a: values[0], b: values[1], c: values[2],
            d: values[3], e: values[4], f: values[5]
          })
        }
        break

      case 'skewX':
        const skewX = Math.tan((values[0] || 0) * Math.PI / 180)
        matrix = combineTransforms(matrix, { a: 1, b: 0, c: skewX, d: 1, e: 0, f: 0 })
        break

      case 'skewY':
        const skewY = Math.tan((values[0] || 0) * Math.PI / 180)
        matrix = combineTransforms(matrix, { a: 1, b: skewY, c: 0, d: 1, e: 0, f: 0 })
        break
    }
  }

  return matrix
}

function combineTransforms(a: TransformMatrix, b: TransformMatrix): TransformMatrix {
  return {
    a: a.a * b.a + a.c * b.b,
    b: a.b * b.a + a.d * b.b,
    c: a.a * b.c + a.c * b.d,
    d: a.b * b.c + a.d * b.d,
    e: a.a * b.e + a.c * b.f + a.e,
    f: a.b * b.e + a.d * b.f + a.f
  }
}

function applyTransform(x: number, y: number, m: TransformMatrix): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f
  }
}

interface ParsedStyle {
  strokeColor: string | null
  strokeWidth: number
  fillColor: string | null
  strokeOpacity: number
  fillOpacity: number
}

function parseStyle(element: Element): ParsedStyle {
  const style: ParsedStyle = {
    strokeColor: null,
    strokeWidth: 1,
    fillColor: null,
    strokeOpacity: 1,
    fillOpacity: 1
  }

  const stroke = element.getAttribute('stroke')
  if (stroke && stroke !== 'none') {
    style.strokeColor = stroke
  }

  const strokeWidth = element.getAttribute('stroke-width')
  if (strokeWidth) {
    style.strokeWidth = parseFloat(strokeWidth)
  }

  const fill = element.getAttribute('fill')
  if (fill && fill !== 'none') {
    style.fillColor = fill
  } else if (!fill) {
    style.fillColor = '#000000'
  }

  const strokeOpacity = element.getAttribute('stroke-opacity')
  if (strokeOpacity) {
    style.strokeOpacity = parseFloat(strokeOpacity)
  }

  const fillOpacity = element.getAttribute('fill-opacity')
  if (fillOpacity) {
    style.fillOpacity = parseFloat(fillOpacity)
  }

  const styleAttr = element.getAttribute('style')
  if (styleAttr) {
    const styles = styleAttr.split(';')
    for (const s of styles) {
      const [prop, value] = s.split(':').map(x => x.trim())
      switch (prop) {
        case 'stroke':
          style.strokeColor = value === 'none' ? null : value
          break
        case 'stroke-width':
          style.strokeWidth = parseFloat(value)
          break
        case 'fill':
          style.fillColor = value === 'none' ? null : value
          break
        case 'stroke-opacity':
          style.strokeOpacity = parseFloat(value)
          break
        case 'fill-opacity':
          style.fillOpacity = parseFloat(value)
          break
      }
    }
  }

  return style
}

function parsePathData(d: string, transform: TransformMatrix, style: ParsedStyle, layerId: string): VectorPath | null {
  const points: PathPoint[] = []
  let currentX = 0, currentY = 0
  let startX = 0, startY = 0
  let closed = false

  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || []

  for (const cmd of commands) {
    const type = cmd[0]
    const args = cmd.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number)
    const isRelative = type === type.toLowerCase()

    switch (type.toUpperCase()) {
      case 'M': {
        for (let i = 0; i < args.length; i += 2) {
          let x = args[i], y = args[i + 1]
          if (isRelative && i > 0) { x += currentX; y += currentY }
          else if (isRelative) { x += currentX; y += currentY }
          
          const pt = applyTransform(x, y, transform)
          if (i === 0) {
            startX = pt.x; startY = pt.y
          }
          points.push({ x: pt.x, y: pt.y, type: 'line' })
          currentX = x; currentY = y
        }
        break
      }

      case 'L': {
        for (let i = 0; i < args.length; i += 2) {
          let x = args[i], y = args[i + 1]
          if (isRelative) { x += currentX; y += currentY }
          
          const pt = applyTransform(x, y, transform)
          points.push({ x: pt.x, y: pt.y, type: 'line' })
          currentX = x; currentY = y
        }
        break
      }

      case 'H': {
        for (const arg of args) {
          let x = arg
          if (isRelative) x += currentX
          
          const pt = applyTransform(x, currentY, transform)
          points.push({ x: pt.x, y: pt.y, type: 'line' })
          currentX = x
        }
        break
      }

      case 'V': {
        for (const arg of args) {
          let y = arg
          if (isRelative) y += currentY
          
          const pt = applyTransform(currentX, y, transform)
          points.push({ x: pt.x, y: pt.y, type: 'line' })
          currentY = y
        }
        break
      }

      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          let x1 = args[i], y1 = args[i + 1]
          let x2 = args[i + 2], y2 = args[i + 3]
          let x = args[i + 4], y = args[i + 5]
          
          if (isRelative) {
            x1 += currentX; y1 += currentY
            x2 += currentX; y2 += currentY
            x += currentX; y += currentY
          }

          const h1 = applyTransform(x1, y1, transform)
          const h2 = applyTransform(x2, y2, transform)
          const pt = applyTransform(x, y, transform)
          
          if (points.length > 0) {
            points[points.length - 1].handleOut = { x: h1.x, y: h1.y }
          }
          
          points.push({
            x: pt.x, y: pt.y, type: 'curve',
            handleIn: { x: h2.x, y: h2.y }
          })
          
          currentX = x; currentY = y
        }
        break
      }

      case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          let x1 = args[i], y1 = args[i + 1]
          let x = args[i + 2], y = args[i + 3]
          
          if (isRelative) {
            x1 += currentX; y1 += currentY
            x += currentX; y += currentY
          }

          const cp1x = currentX + 2/3 * (x1 - currentX)
          const cp1y = currentY + 2/3 * (y1 - currentY)
          const cp2x = x + 2/3 * (x1 - x)
          const cp2y = y + 2/3 * (y1 - y)

          const h1 = applyTransform(cp1x, cp1y, transform)
          const h2 = applyTransform(cp2x, cp2y, transform)
          const pt = applyTransform(x, y, transform)
          
          if (points.length > 0) {
            points[points.length - 1].handleOut = { x: h1.x, y: h1.y }
          }
          
          points.push({
            x: pt.x, y: pt.y, type: 'curve',
            handleIn: { x: h2.x, y: h2.y }
          })
          
          currentX = x; currentY = y
        }
        break
      }

      case 'A': {
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i], ry = args[i + 1]
          const xAxisRotation = args[i + 2]
          const largeArc = args[i + 3]
          const sweep = args[i + 4]
          let x = args[i + 5], y = args[i + 6]
          
          if (isRelative) { x += currentX; y += currentY }

          const arcPoints = arcToBezier(currentX, currentY, x, y, rx, ry, xAxisRotation, largeArc, sweep)
          for (const ap of arcPoints) {
            const h1 = applyTransform(ap.x1, ap.y1, transform)
            const h2 = applyTransform(ap.x2, ap.y2, transform)
            const pt = applyTransform(ap.x, ap.y, transform)
            
            if (points.length > 0) {
              points[points.length - 1].handleOut = { x: h1.x, y: h1.y }
            }
            
            points.push({
              x: pt.x, y: pt.y, type: 'curve',
              handleIn: { x: h2.x, y: h2.y }
            })
          }
          
          currentX = x; currentY = y
        }
        break
      }

      case 'Z': {
        closed = true
        currentX = startX; currentY = startY
        break
      }
    }
  }

  if (points.length < 2) return null

  const bounds = getBounds(points)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  const centeredPoints = points.map(pt => ({
    ...pt,
    x: pt.x - centerX,
    y: pt.y - centerY,
    handleIn: pt.handleIn ? { x: pt.handleIn.x - centerX, y: pt.handleIn.y - centerY } : undefined,
    handleOut: pt.handleOut ? { x: pt.handleOut.x - centerX, y: pt.handleOut.y - centerY } : undefined,
  }))

  return {
    id: crypto.randomUUID(),
    layerId,
    name: 'Imported Path',
    visible: true,
    locked: false,
    selected: false,
    type: 'path',
    points: centeredPoints,
    closed,
    transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
    style: {
      strokeColor: style.strokeColor || '#3b82f6',
      strokeWidth: style.strokeWidth,
      strokeOpacity: style.strokeOpacity,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
    }
  }
}

function parseRect(element: Element, transform: TransformMatrix, style: ParsedStyle, layerId: string): VectorShape | null {
  const x = parseFloat(element.getAttribute('x') || '0')
  const y = parseFloat(element.getAttribute('y') || '0')
  const width = parseFloat(element.getAttribute('width') || '0')
  const height = parseFloat(element.getAttribute('height') || '0')
  const rx = parseFloat(element.getAttribute('rx') || '0')

  if (width <= 0 || height <= 0) return null

  const center = applyTransform(x + width / 2, y + height / 2, transform)

  return {
    id: crypto.randomUUID(),
    layerId,
    name: 'Imported Rectangle',
    visible: true,
    locked: false,
    selected: false,
    type: 'shape',
    shapeType: 'rectangle',
    params: { width, height, cornerRadius: rx },
    transform: { x: center.x, y: center.y, rotation: 0, scaleX: 1, scaleY: 1 },
    style: {
      strokeColor: style.strokeColor || '#3b82f6',
      strokeWidth: style.strokeWidth,
      strokeOpacity: style.strokeOpacity,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
    }
  }
}

function parseCircle(element: Element, transform: TransformMatrix, style: ParsedStyle, layerId: string): VectorShape | null {
  const cx = parseFloat(element.getAttribute('cx') || '0')
  const cy = parseFloat(element.getAttribute('cy') || '0')
  const r = parseFloat(element.getAttribute('r') || '0')

  if (r <= 0) return null

  const center = applyTransform(cx, cy, transform)

  return {
    id: crypto.randomUUID(),
    layerId,
    name: 'Imported Circle',
    visible: true,
    locked: false,
    selected: false,
    type: 'shape',
    shapeType: 'ellipse',
    params: { radiusX: r, radiusY: r },
    transform: { x: center.x, y: center.y, rotation: 0, scaleX: 1, scaleY: 1 },
    style: {
      strokeColor: style.strokeColor || '#3b82f6',
      strokeWidth: style.strokeWidth,
      strokeOpacity: style.strokeOpacity,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
    }
  }
}

function parseEllipse(element: Element, transform: TransformMatrix, style: ParsedStyle, layerId: string): VectorShape | null {
  const cx = parseFloat(element.getAttribute('cx') || '0')
  const cy = parseFloat(element.getAttribute('cy') || '0')
  const rx = parseFloat(element.getAttribute('rx') || '0')
  const ry = parseFloat(element.getAttribute('ry') || '0')

  if (rx <= 0 || ry <= 0) return null

  const center = applyTransform(cx, cy, transform)

  return {
    id: crypto.randomUUID(),
    layerId,
    name: 'Imported Ellipse',
    visible: true,
    locked: false,
    selected: false,
    type: 'shape',
    shapeType: 'ellipse',
    params: { radiusX: rx, radiusY: ry },
    transform: { x: center.x, y: center.y, rotation: 0, scaleX: 1, scaleY: 1 },
    style: {
      strokeColor: style.strokeColor || '#3b82f6',
      strokeWidth: style.strokeWidth,
      strokeOpacity: style.strokeOpacity,
      fillColor: style.fillColor,
      fillOpacity: style.fillOpacity,
    }
  }
}

function parseLine(element: Element, transform: TransformMatrix, style: ParsedStyle, layerId: string): VectorShape | null {
  const x1 = parseFloat(element.getAttribute('x1') || '0')
  const y1 = parseFloat(element.getAttribute('y1') || '0')
  const x2 = parseFloat(element.getAttribute('x2') || '0')
  const y2 = parseFloat(element.getAttribute('y2') || '0')

  const p1 = applyTransform(x1, y1, transform)
  const p2 = applyTransform(x2, y2, transform)

  return {
    id: crypto.randomUUID(),
    layerId,
    name: 'Imported Line',
    visible: true,
    locked: false,
    selected: false,
    type: 'shape',
    shapeType: 'line',
    params: { x2: p2.x - p1.x, y2: p2.y - p1.y },
    transform: { x: p1.x, y: p1.y, rotation: 0, scaleX: 1, scaleY: 1 },
    style: {
      strokeColor: style.strokeColor || '#3b82f6',
      strokeWidth: style.strokeWidth,
      strokeOpacity: style.strokeOpacity,
      fillColor: null,
      fillOpacity: 1,
    }
  }
}

function parsePolyline(element: Element, transform: TransformMatrix, style: ParsedStyle, layerId: string, closed: boolean): VectorPath | null {
  const pointsAttr = element.getAttribute('points')
  if (!pointsAttr) return null

  const coords = pointsAttr.trim().split(/[\s,]+/).map(Number)
  if (coords.length < 4) return null

  const points: PathPoint[] = []
  for (let i = 0; i < coords.length; i += 2) {
    const pt = applyTransform(coords[i], coords[i + 1], transform)
    points.push({ x: pt.x, y: pt.y, type: 'line' })
  }

  const bounds = getBounds(points)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2

  const centeredPoints = points.map(pt => ({
    ...pt,
    x: pt.x - centerX,
    y: pt.y - centerY,
  }))

  return {
    id: crypto.randomUUID(),
    layerId,
    name: closed ? 'Imported Polygon' : 'Imported Polyline',
    visible: true,
    locked: false,
    selected: false,
    type: 'path',
    points: centeredPoints,
    closed,
    transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
    style: {
      strokeColor: style.strokeColor || '#3b82f6',
      strokeWidth: style.strokeWidth,
      strokeOpacity: style.strokeOpacity,
      fillColor: closed ? style.fillColor : null,
      fillOpacity: style.fillOpacity,
    }
  }
}

function getBounds(points: PathPoint[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  for (const pt of points) {
    minX = Math.min(minX, pt.x)
    minY = Math.min(minY, pt.y)
    maxX = Math.max(maxX, pt.x)
    maxY = Math.max(maxY, pt.y)
  }
  
  return { minX, minY, maxX, maxY }
}

function arcToBezier(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, phi: number, fA: number, fS: number
): { x1: number; y1: number; x2: number; y2: number; x: number; y: number }[] {
  const curves: { x1: number; y1: number; x2: number; y2: number; x: number; y: number }[] = []
  
  if (rx === 0 || ry === 0) {
    return [{ x1: x1, y1: y1, x2: x2, y2: y2, x: x2, y: y2 }]
  }

  const sinPhi = Math.sin(phi * Math.PI / 180)
  const cosPhi = Math.cos(phi * Math.PI / 180)

  const x1p = cosPhi * (x1 - x2) / 2 + sinPhi * (y1 - y2) / 2
  const y1p = -sinPhi * (x1 - x2) / 2 + cosPhi * (y1 - y2) / 2

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry)
  if (lambda > 1) {
    rx *= Math.sqrt(lambda)
    ry *= Math.sqrt(lambda)
  }

  const rxSq = rx * rx
  const rySq = ry * ry
  const x1pSq = x1p * x1p
  const y1pSq = y1p * y1p

  let sq = Math.max(0, (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq))
  sq = Math.sqrt(sq) * (fA === fS ? -1 : 1)

  const cxp = sq * rx * y1p / ry
  const cyp = -sq * ry * x1p / rx

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2

  const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx)
  let dtheta = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx) - theta1

  if (fS === 0 && dtheta > 0) dtheta -= 2 * Math.PI
  if (fS === 1 && dtheta < 0) dtheta += 2 * Math.PI

  const segments = Math.ceil(Math.abs(dtheta) / (Math.PI / 2))
  const delta = dtheta / segments
  const t = 8 / 3 * Math.sin(delta / 4) * Math.sin(delta / 4) / Math.sin(delta / 2)

  let cosTheta1 = Math.cos(theta1)
  let sinTheta1 = Math.sin(theta1)

  for (let i = 0; i < segments; i++) {
    const theta2 = theta1 + (i + 1) * delta
    const cosTheta2 = Math.cos(theta2)
    const sinTheta2 = Math.sin(theta2)

    const ep1x = cosPhi * rx * cosTheta1 - sinPhi * ry * sinTheta1 + cx
    const ep1y = sinPhi * rx * cosTheta1 + cosPhi * ry * sinTheta1 + cy
    const ep2x = cosPhi * rx * cosTheta2 - sinPhi * ry * sinTheta2 + cx
    const ep2y = sinPhi * rx * cosTheta2 + cosPhi * ry * sinTheta2 + cy

    const dx1 = -cosPhi * rx * sinTheta1 - sinPhi * ry * cosTheta1
    const dy1 = -sinPhi * rx * sinTheta1 + cosPhi * ry * cosTheta1
    const dx2 = -cosPhi * rx * sinTheta2 - sinPhi * ry * cosTheta2
    const dy2 = -sinPhi * rx * sinTheta2 + cosPhi * ry * cosTheta2

    curves.push({
      x1: ep1x + t * dx1,
      y1: ep1y + t * dy1,
      x2: ep2x - t * dx2,
      y2: ep2y - t * dy2,
      x: ep2x,
      y: ep2y
    })

    cosTheta1 = cosTheta2
    sinTheta1 = sinTheta2
  }

  return curves
}

export function parseDXF(dxfContent: string, layerId: string): DesignObject[] {
  const objects: DesignObject[] = []
  const lines = dxfContent.split('\n').map(l => l.trim())
  
  let i = 0
  let currentSection = ''
  
  while (i < lines.length) {
    const code = parseInt(lines[i])
    const value = lines[i + 1]
    
    if (code === 0 && value === 'SECTION') {
      i += 2
      if (parseInt(lines[i]) === 2) {
        currentSection = lines[i + 1]
        i += 2
      }
      continue
    }
    
    if (code === 0 && value === 'ENDSEC') {
      currentSection = ''
      i += 2
      continue
    }
    
    if (currentSection === 'ENTITIES') {
      if (code === 0) {
        const entityType = value
        i += 2
        
        const entity: Record<number, string> = {}
        while (i < lines.length) {
          const eCode = parseInt(lines[i])
          const eValue = lines[i + 1]
          if (eCode === 0) break
          entity[eCode] = eValue
          i += 2
        }
        
        const obj = parseDXFEntity(entityType, entity, layerId)
        if (obj) objects.push(obj)
        continue
      }
    }
    
    i += 2
  }
  
  return objects
}

function parseDXFEntity(type: string, entity: Record<number, string>, layerId: string): DesignObject | null {
  const style = {
    strokeColor: '#3b82f6',
    strokeWidth: 1,
    strokeOpacity: 1,
    fillColor: null as string | null,
    fillOpacity: 1,
  }

  switch (type) {
    case 'LINE': {
      const x1 = parseFloat(entity[10] || '0')
      const y1 = parseFloat(entity[20] || '0')
      const x2 = parseFloat(entity[11] || '0')
      const y2 = parseFloat(entity[21] || '0')
      
      return {
        id: crypto.randomUUID(),
        layerId,
        name: 'DXF Line',
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'line',
        params: { x2: x2 - x1, y2: y2 - y1 },
        transform: { x: x1, y: y1, rotation: 0, scaleX: 1, scaleY: 1 },
        style,
      } as VectorShape
    }
    
    case 'CIRCLE': {
      const cx = parseFloat(entity[10] || '0')
      const cy = parseFloat(entity[20] || '0')
      const r = parseFloat(entity[40] || '0')
      
      return {
        id: crypto.randomUUID(),
        layerId,
        name: 'DXF Circle',
        visible: true,
        locked: false,
        selected: false,
        type: 'shape',
        shapeType: 'ellipse',
        params: { radiusX: r, radiusY: r },
        transform: { x: cx, y: cy, rotation: 0, scaleX: 1, scaleY: 1 },
        style,
      } as VectorShape
    }
    
    case 'ARC': {
      const cx = parseFloat(entity[10] || '0')
      const cy = parseFloat(entity[20] || '0')
      const r = parseFloat(entity[40] || '0')
      const startAngle = parseFloat(entity[50] || '0') * Math.PI / 180
      const endAngle = parseFloat(entity[51] || '360') * Math.PI / 180
      
      const points: PathPoint[] = []
      const segments = 32
      const deltaAngle = (endAngle - startAngle) / segments
      
      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + i * deltaAngle
        points.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r,
          type: 'line'
        })
      }
      
      return {
        id: crypto.randomUUID(),
        layerId,
        name: 'DXF Arc',
        visible: true,
        locked: false,
        selected: false,
        type: 'path',
        points,
        closed: false,
        transform: { x: cx, y: cy, rotation: 0, scaleX: 1, scaleY: 1 },
        style,
      } as VectorPath
    }
    
    case 'LWPOLYLINE':
    case 'POLYLINE': {
      const points: PathPoint[] = []
      let closed = (parseInt(entity[70] || '0') & 1) === 1
      
      let idx = 10
      while (entity[idx] !== undefined) {
        const x = parseFloat(entity[idx] || '0')
        const y = parseFloat(entity[idx + 10] || '0')
        points.push({ x, y, type: 'line' })
        idx++
        if (entity[idx] === undefined && entity[idx + 10] !== undefined) break
      }
      
      if (points.length < 2) return null
      
      const bounds = getBounds(points)
      const centerX = (bounds.minX + bounds.maxX) / 2
      const centerY = (bounds.minY + bounds.maxY) / 2
      
      const centeredPoints = points.map(pt => ({
        ...pt,
        x: pt.x - centerX,
        y: pt.y - centerY,
      }))
      
      return {
        id: crypto.randomUUID(),
        layerId,
        name: 'DXF Polyline',
        visible: true,
        locked: false,
        selected: false,
        type: 'path',
        points: centeredPoints,
        closed,
        transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
        style,
      } as VectorPath
    }
    
    default:
      return null
  }
}
