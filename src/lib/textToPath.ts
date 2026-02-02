import type { PathPoint, VectorPath, TextObject } from '@/types/design'

interface FontMetrics {
  unitsPerEm: number
  ascender: number
  descender: number
}

interface GlyphPath {
  commands: PathCommand[]
  advanceWidth: number
}

type PathCommand = 
  | { type: 'M'; x: number; y: number }
  | { type: 'L'; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | { type: 'Z' }

const BUILT_IN_FONTS: Record<string, { metrics: FontMetrics; glyphs: Record<string, GlyphPath> }> = {
  'CNC Sans': createCNCSansFont(),
  'CNC Serif': createCNCSerifFont(),
  'CNC Mono': createCNCMonoFont(),
}

export function textToPath(text: TextObject, layerId: string): VectorPath[] {
  const paths: VectorPath[] = []
  const font = BUILT_IN_FONTS['CNC Sans']
  
  if (!font) return paths

  const scale = text.fontSize / font.metrics.unitsPerEm
  let cursorX = 0
  let cursorY = 0
  const lineHeight = text.lineHeight * text.fontSize

  const lines = text.content.split('\n')

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx]
    cursorX = 0
    
    if (text.textAlign === 'center') {
      const lineWidth = measureLineWidth(line, font, scale, text.letterSpacing)
      cursorX = -lineWidth / 2
    } else if (text.textAlign === 'right') {
      const lineWidth = measureLineWidth(line, font, scale, text.letterSpacing)
      cursorX = -lineWidth
    }

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const glyph = font.glyphs[char] || font.glyphs['?']
      
      if (!glyph) {
        cursorX += text.fontSize * 0.5
        continue
      }

      const charPaths = commandsToPathPoints(glyph.commands, cursorX, cursorY, scale)
      
      for (const points of charPaths) {
        if (points.length < 2) continue

        const bounds = getPathBounds(points)
        const centerX = (bounds.minX + bounds.maxX) / 2
        const centerY = (bounds.minY + bounds.maxY) / 2

        const centeredPoints = points.map(pt => ({
          ...pt,
          x: pt.x - centerX,
          y: pt.y - centerY,
          handleIn: pt.handleIn ? { x: pt.handleIn.x - centerX, y: pt.handleIn.y - centerY } : undefined,
          handleOut: pt.handleOut ? { x: pt.handleOut.x - centerX, y: pt.handleOut.y - centerY } : undefined,
        }))

        paths.push({
          id: crypto.randomUUID(),
          layerId,
          name: `Text: "${char}"`,
          visible: true,
          locked: false,
          selected: false,
          type: 'path',
          points: centeredPoints,
          closed: true,
          transform: {
            x: text.transform.x + centerX,
            y: text.transform.y + centerY,
            rotation: text.transform.rotation,
            scaleX: text.transform.scaleX,
            scaleY: text.transform.scaleY,
          },
          style: { ...text.style },
        })
      }

      cursorX += glyph.advanceWidth * scale + text.letterSpacing
    }

    cursorY -= lineHeight
  }

  return paths
}

function measureLineWidth(line: string, font: typeof BUILT_IN_FONTS['CNC Sans'], scale: number, letterSpacing: number): number {
  let width = 0
  for (const char of line) {
    const glyph = font.glyphs[char] || font.glyphs['?']
    if (glyph) {
      width += glyph.advanceWidth * scale + letterSpacing
    } else {
      width += scale * font.metrics.unitsPerEm * 0.5
    }
  }
  return width - letterSpacing
}

function commandsToPathPoints(commands: PathCommand[], offsetX: number, offsetY: number, scale: number): PathPoint[][] {
  const paths: PathPoint[][] = []
  let currentPath: PathPoint[] = []
  let currentX = 0, currentY = 0

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M':
        if (currentPath.length > 0) {
          paths.push(currentPath)
        }
        currentPath = []
        currentX = cmd.x * scale + offsetX
        currentY = cmd.y * scale + offsetY
        currentPath.push({ x: currentX, y: currentY, type: 'line' })
        break

      case 'L':
        currentX = cmd.x * scale + offsetX
        currentY = cmd.y * scale + offsetY
        currentPath.push({ x: currentX, y: currentY, type: 'line' })
        break

      case 'C':
        const h1x = cmd.x1 * scale + offsetX
        const h1y = cmd.y1 * scale + offsetY
        const h2x = cmd.x2 * scale + offsetX
        const h2y = cmd.y2 * scale + offsetY
        currentX = cmd.x * scale + offsetX
        currentY = cmd.y * scale + offsetY

        if (currentPath.length > 0) {
          currentPath[currentPath.length - 1].handleOut = { x: h1x, y: h1y }
        }
        currentPath.push({
          x: currentX,
          y: currentY,
          type: 'curve',
          handleIn: { x: h2x, y: h2y },
        })
        break

      case 'Q':
        const qx1 = cmd.x1 * scale + offsetX
        const qy1 = cmd.y1 * scale + offsetY
        const prevX = currentX
        const prevY = currentY
        currentX = cmd.x * scale + offsetX
        currentY = cmd.y * scale + offsetY

        const cp1x = prevX + 2/3 * (qx1 - prevX)
        const cp1y = prevY + 2/3 * (qy1 - prevY)
        const cp2x = currentX + 2/3 * (qx1 - currentX)
        const cp2y = currentY + 2/3 * (qy1 - currentY)

        if (currentPath.length > 0) {
          currentPath[currentPath.length - 1].handleOut = { x: cp1x, y: cp1y }
        }
        currentPath.push({
          x: currentX,
          y: currentY,
          type: 'curve',
          handleIn: { x: cp2x, y: cp2y },
        })
        break

      case 'Z':
        if (currentPath.length > 0) {
          paths.push(currentPath)
          currentPath = []
        }
        break
    }
  }

  if (currentPath.length > 0) {
    paths.push(currentPath)
  }

  return paths
}

function getPathBounds(points: PathPoint[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  for (const pt of points) {
    minX = Math.min(minX, pt.x)
    minY = Math.min(minY, pt.y)
    maxX = Math.max(maxX, pt.x)
    maxY = Math.max(maxY, pt.y)
  }
  
  return { minX, minY, maxX, maxY }
}

function createCNCSansFont(): { metrics: FontMetrics; glyphs: Record<string, GlyphPath> } {
  const metrics: FontMetrics = {
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
  }

  const glyphs: Record<string, GlyphPath> = {
    ' ': { commands: [], advanceWidth: 250 },
    
    'A': {
      commands: [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 300, y: 700 },
        { type: 'L', x: 600, y: 0 },
        { type: 'L', x: 480, y: 0 },
        { type: 'L', x: 400, y: 200 },
        { type: 'L', x: 200, y: 200 },
        { type: 'L', x: 120, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 240, y: 300 },
        { type: 'L', x: 360, y: 300 },
        { type: 'L', x: 300, y: 500 },
        { type: 'Z' },
      ],
      advanceWidth: 650,
    },
    
    'B': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 350, y: 700 },
        { type: 'C', x1: 500, y1: 700, x2: 520, y2: 550, x: 350, y: 400 },
        { type: 'L', x: 400, y: 400 },
        { type: 'C', x1: 550, y1: 400, x2: 550, y2: 0, x: 350, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 200, y: 100 },
        { type: 'L', x: 320, y: 100 },
        { type: 'C', x1: 400, y1: 100, x2: 400, y2: 300, x: 320, y: 300 },
        { type: 'L', x: 200, y: 300 },
        { type: 'Z' },
        { type: 'M', x: 200, y: 400 },
        { type: 'L', x: 320, y: 400 },
        { type: 'C', x1: 400, y1: 400, x2: 400, y2: 600, x: 320, y: 600 },
        { type: 'L', x: 200, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 580,
    },
    
    'C': {
      commands: [
        { type: 'M', x: 500, y: 100 },
        { type: 'C', x1: 400, y1: 0, x2: 100, y2: 0, x: 100, y: 350 },
        { type: 'C', x1: 100, y1: 700, x2: 400, y2: 700, x: 500, y: 600 },
        { type: 'L', x: 420, y: 520 },
        { type: 'C', x1: 350, y1: 600, x2: 220, y2: 600, x: 220, y: 350 },
        { type: 'C', x1: 220, y1: 100, x2: 350, y2: 100, x: 420, y: 180 },
        { type: 'Z' },
      ],
      advanceWidth: 550,
    },
    
    'D': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 300, y: 700 },
        { type: 'C', x1: 550, y1: 700, x2: 550, y2: 0, x: 300, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 200, y: 100 },
        { type: 'L', x: 280, y: 100 },
        { type: 'C', x1: 420, y1: 100, x2: 420, y2: 600, x: 280, y: 600 },
        { type: 'L', x: 200, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 600,
    },
    
    'E': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 480, y: 700 },
        { type: 'L', x: 480, y: 600 },
        { type: 'L', x: 200, y: 600 },
        { type: 'L', x: 200, y: 400 },
        { type: 'L', x: 420, y: 400 },
        { type: 'L', x: 420, y: 300 },
        { type: 'L', x: 200, y: 300 },
        { type: 'L', x: 200, y: 100 },
        { type: 'L', x: 480, y: 100 },
        { type: 'L', x: 480, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 530,
    },
    
    'F': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 480, y: 700 },
        { type: 'L', x: 480, y: 600 },
        { type: 'L', x: 200, y: 600 },
        { type: 'L', x: 200, y: 400 },
        { type: 'L', x: 420, y: 400 },
        { type: 'L', x: 420, y: 300 },
        { type: 'L', x: 200, y: 300 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 500,
    },
    
    'G': {
      commands: [
        { type: 'M', x: 500, y: 100 },
        { type: 'C', x1: 400, y1: 0, x2: 100, y2: 0, x: 100, y: 350 },
        { type: 'C', x1: 100, y1: 700, x2: 400, y2: 700, x: 500, y: 600 },
        { type: 'L', x: 420, y: 520 },
        { type: 'C', x1: 350, y1: 600, x2: 220, y2: 600, x: 220, y: 350 },
        { type: 'C', x1: 220, y1: 100, x2: 350, y2: 100, x: 420, y: 180 },
        { type: 'L', x: 500, y: 100 },
        { type: 'L', x: 500, y: 300 },
        { type: 'L', x: 320, y: 300 },
        { type: 'L', x: 320, y: 200 },
        { type: 'L', x: 500, y: 200 },
        { type: 'Z' },
      ],
      advanceWidth: 580,
    },
    
    'H': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 200, y: 700 },
        { type: 'L', x: 200, y: 400 },
        { type: 'L', x: 400, y: 400 },
        { type: 'L', x: 400, y: 700 },
        { type: 'L', x: 520, y: 700 },
        { type: 'L', x: 520, y: 0 },
        { type: 'L', x: 400, y: 0 },
        { type: 'L', x: 400, y: 300 },
        { type: 'L', x: 200, y: 300 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 600,
    },
    
    'I': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 100 },
        { type: 'L', x: 140, y: 100 },
        { type: 'L', x: 140, y: 600 },
        { type: 'L', x: 80, y: 600 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 320, y: 700 },
        { type: 'L', x: 320, y: 600 },
        { type: 'L', x: 260, y: 600 },
        { type: 'L', x: 260, y: 100 },
        { type: 'L', x: 320, y: 100 },
        { type: 'L', x: 320, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 400,
    },
    
    'J': {
      commands: [
        { type: 'M', x: 300, y: 700 },
        { type: 'L', x: 420, y: 700 },
        { type: 'L', x: 420, y: 200 },
        { type: 'C', x1: 420, y1: 0, x2: 200, y2: 0, x: 100, y: 150 },
        { type: 'L', x: 180, y: 230 },
        { type: 'C', x1: 240, y1: 100, x2: 300, y2: 100, x: 300, y: 200 },
        { type: 'Z' },
      ],
      advanceWidth: 500,
    },
    
    'K': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 200, y: 700 },
        { type: 'L', x: 200, y: 400 },
        { type: 'L', x: 400, y: 700 },
        { type: 'L', x: 550, y: 700 },
        { type: 'L', x: 300, y: 350 },
        { type: 'L', x: 550, y: 0 },
        { type: 'L', x: 400, y: 0 },
        { type: 'L', x: 200, y: 300 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 580,
    },
    
    'L': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 200, y: 700 },
        { type: 'L', x: 200, y: 100 },
        { type: 'L', x: 450, y: 100 },
        { type: 'L', x: 450, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 500,
    },
    
    'M': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 200, y: 700 },
        { type: 'L', x: 350, y: 400 },
        { type: 'L', x: 500, y: 700 },
        { type: 'L', x: 620, y: 700 },
        { type: 'L', x: 620, y: 0 },
        { type: 'L', x: 500, y: 0 },
        { type: 'L', x: 500, y: 500 },
        { type: 'L', x: 350, y: 200 },
        { type: 'L', x: 200, y: 500 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 700,
    },
    
    'N': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 200, y: 700 },
        { type: 'L', x: 420, y: 200 },
        { type: 'L', x: 420, y: 700 },
        { type: 'L', x: 540, y: 700 },
        { type: 'L', x: 540, y: 0 },
        { type: 'L', x: 420, y: 0 },
        { type: 'L', x: 200, y: 500 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 620,
    },
    
    'O': {
      commands: [
        { type: 'M', x: 300, y: 0 },
        { type: 'C', x1: 80, y1: 0, x2: 80, y2: 700, x: 300, y: 700 },
        { type: 'C', x1: 520, y1: 700, x2: 520, y2: 0, x: 300, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 300, y: 100 },
        { type: 'C', x1: 400, y1: 100, x2: 400, y2: 600, x: 300, y: 600 },
        { type: 'C', x1: 200, y1: 600, x2: 200, y2: 100, x: 300, y: 100 },
        { type: 'Z' },
      ],
      advanceWidth: 600,
    },
    
    'P': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 350, y: 700 },
        { type: 'C', x1: 520, y1: 700, x2: 520, y2: 300, x: 350, y: 300 },
        { type: 'L', x: 200, y: 300 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 200, y: 400 },
        { type: 'L', x: 320, y: 400 },
        { type: 'C', x1: 400, y1: 400, x2: 400, y2: 600, x: 320, y: 600 },
        { type: 'L', x: 200, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    'Q': {
      commands: [
        { type: 'M', x: 300, y: 0 },
        { type: 'C', x1: 80, y1: 0, x2: 80, y2: 700, x: 300, y: 700 },
        { type: 'C', x1: 520, y1: 700, x2: 520, y2: 0, x: 300, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 300, y: 100 },
        { type: 'C', x1: 400, y1: 100, x2: 400, y2: 600, x: 300, y: 600 },
        { type: 'C', x1: 200, y1: 600, x2: 200, y2: 100, x: 300, y: 100 },
        { type: 'Z' },
        { type: 'M', x: 350, y: 150 },
        { type: 'L', x: 520, y: -50 },
        { type: 'L', x: 450, y: -50 },
        { type: 'L', x: 300, y: 100 },
        { type: 'Z' },
      ],
      advanceWidth: 600,
    },
    
    'R': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 350, y: 700 },
        { type: 'C', x1: 520, y1: 700, x2: 520, y2: 350, x: 350, y: 350 },
        { type: 'L', x: 500, y: 0 },
        { type: 'L', x: 370, y: 0 },
        { type: 'L', x: 240, y: 300 },
        { type: 'L', x: 200, y: 300 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 200, y: 400 },
        { type: 'L', x: 320, y: 400 },
        { type: 'C', x1: 400, y1: 400, x2: 400, y2: 600, x: 320, y: 600 },
        { type: 'L', x: 200, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 580,
    },
    
    'S': {
      commands: [
        { type: 'M', x: 450, y: 600 },
        { type: 'C', x1: 400, y1: 700, x2: 100, y2: 700, x: 100, y: 550 },
        { type: 'C', x1: 100, y1: 400, x2: 200, y2: 380, x: 300, y: 350 },
        { type: 'C', x1: 400, y1: 320, x2: 420, y2: 300, x: 420, y: 200 },
        { type: 'C', x1: 420, y1: 100, x2: 350, y2: 100, x: 280, y: 100 },
        { type: 'C', x1: 200, y1: 100, x2: 120, y2: 150, x: 100, y: 200 },
        { type: 'L', x: 180, y: 280 },
        { type: 'C', x1: 200, y1: 200, x2: 280, y2: 200, x: 300, y: 200 },
        { type: 'C', x1: 320, y1: 200, x2: 320, y2: 280, x: 300, y: 300 },
        { type: 'C', x1: 200, y1: 330, x2: 100, y2: 350, x: 100, y: 500 },
        { type: 'C', x1: 100, y1: 600, x2: 200, y2: 600, x: 280, y: 600 },
        { type: 'C', x1: 350, y1: 600, x2: 400, y2: 550, x: 450, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 520,
    },
    
    'T': {
      commands: [
        { type: 'M', x: 220, y: 0 },
        { type: 'L', x: 220, y: 600 },
        { type: 'L', x: 50, y: 600 },
        { type: 'L', x: 50, y: 700 },
        { type: 'L', x: 510, y: 700 },
        { type: 'L', x: 510, y: 600 },
        { type: 'L', x: 340, y: 600 },
        { type: 'L', x: 340, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    'U': {
      commands: [
        { type: 'M', x: 80, y: 700 },
        { type: 'L', x: 200, y: 700 },
        { type: 'L', x: 200, y: 250 },
        { type: 'C', x1: 200, y1: 100, x2: 280, y2: 100, x: 300, y: 100 },
        { type: 'C', x1: 320, y1: 100, x2: 400, y2: 100, x: 400, y: 250 },
        { type: 'L', x: 400, y: 700 },
        { type: 'L', x: 520, y: 700 },
        { type: 'L', x: 520, y: 250 },
        { type: 'C', x1: 520, y1: 0, x2: 300, y2: 0, x: 300, y: 0 },
        { type: 'C', x1: 300, y1: 0, x2: 80, y2: 0, x: 80, y: 250 },
        { type: 'Z' },
      ],
      advanceWidth: 600,
    },
    
    'V': {
      commands: [
        { type: 'M', x: 0, y: 700 },
        { type: 'L', x: 130, y: 700 },
        { type: 'L', x: 300, y: 200 },
        { type: 'L', x: 470, y: 700 },
        { type: 'L', x: 600, y: 700 },
        { type: 'L', x: 360, y: 0 },
        { type: 'L', x: 240, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 600,
    },
    
    'W': {
      commands: [
        { type: 'M', x: 0, y: 700 },
        { type: 'L', x: 100, y: 700 },
        { type: 'L', x: 200, y: 200 },
        { type: 'L', x: 350, y: 600 },
        { type: 'L', x: 500, y: 200 },
        { type: 'L', x: 600, y: 700 },
        { type: 'L', x: 700, y: 700 },
        { type: 'L', x: 550, y: 0 },
        { type: 'L', x: 450, y: 0 },
        { type: 'L', x: 350, y: 350 },
        { type: 'L', x: 250, y: 0 },
        { type: 'L', x: 150, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 750,
    },
    
    'X': {
      commands: [
        { type: 'M', x: 0, y: 0 },
        { type: 'L', x: 200, y: 350 },
        { type: 'L', x: 0, y: 700 },
        { type: 'L', x: 140, y: 700 },
        { type: 'L', x: 280, y: 450 },
        { type: 'L', x: 420, y: 700 },
        { type: 'L', x: 560, y: 700 },
        { type: 'L', x: 360, y: 350 },
        { type: 'L', x: 560, y: 0 },
        { type: 'L', x: 420, y: 0 },
        { type: 'L', x: 280, y: 250 },
        { type: 'L', x: 140, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    'Y': {
      commands: [
        { type: 'M', x: 0, y: 700 },
        { type: 'L', x: 140, y: 700 },
        { type: 'L', x: 280, y: 400 },
        { type: 'L', x: 420, y: 700 },
        { type: 'L', x: 560, y: 700 },
        { type: 'L', x: 340, y: 300 },
        { type: 'L', x: 340, y: 0 },
        { type: 'L', x: 220, y: 0 },
        { type: 'L', x: 220, y: 300 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    'Z': {
      commands: [
        { type: 'M', x: 50, y: 700 },
        { type: 'L', x: 500, y: 700 },
        { type: 'L', x: 500, y: 600 },
        { type: 'L', x: 180, y: 100 },
        { type: 'L', x: 500, y: 100 },
        { type: 'L', x: 500, y: 0 },
        { type: 'L', x: 50, y: 0 },
        { type: 'L', x: 50, y: 100 },
        { type: 'L', x: 370, y: 600 },
        { type: 'L', x: 50, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 550,
    },

    '0': {
      commands: [
        { type: 'M', x: 280, y: 0 },
        { type: 'C', x1: 80, y1: 0, x2: 80, y2: 700, x: 280, y: 700 },
        { type: 'C', x1: 480, y1: 700, x2: 480, y2: 0, x: 280, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 280, y: 100 },
        { type: 'C', x1: 360, y1: 100, x2: 360, y2: 600, x: 280, y: 600 },
        { type: 'C', x1: 200, y1: 600, x2: 200, y2: 100, x: 280, y: 100 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    '1': {
      commands: [
        { type: 'M', x: 180, y: 0 },
        { type: 'L', x: 180, y: 550 },
        { type: 'L', x: 80, y: 450 },
        { type: 'L', x: 80, y: 570 },
        { type: 'L', x: 240, y: 700 },
        { type: 'L', x: 300, y: 700 },
        { type: 'L', x: 300, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 400,
    },
    
    '2': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 100 },
        { type: 'L', x: 350, y: 100 },
        { type: 'C', x1: 200, y1: 250, x2: 80, y2: 400, x: 80, y: 550 },
        { type: 'C', x1: 80, y1: 700, x2: 200, y2: 700, x: 300, y: 700 },
        { type: 'C', x1: 400, y1: 700, x2: 480, y2: 650, x: 480, y: 550 },
        { type: 'L', x: 360, y: 550 },
        { type: 'C', x1: 360, y1: 600, x2: 330, y2: 600, x: 300, y: 600 },
        { type: 'C', x1: 250, y1: 600, x2: 200, y2: 580, x: 200, y: 500 },
        { type: 'C', x1: 200, y1: 400, x2: 300, y2: 280, x: 480, y: 100 },
        { type: 'L', x: 480, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    '3': {
      commands: [
        { type: 'M', x: 100, y: 100 },
        { type: 'C', x1: 150, y1: 0, x2: 400, y2: 0, x: 400, y: 180 },
        { type: 'C', x1: 400, y1: 300, x2: 300, y2: 350, x: 280, y: 350 },
        { type: 'C', x1: 300, y1: 350, x2: 420, y2: 400, x: 420, y: 520 },
        { type: 'C', x1: 420, y1: 700, x2: 150, y2: 700, x: 100, y: 600 },
        { type: 'L', x: 180, y: 530 },
        { type: 'C', x1: 220, y1: 600, x2: 300, y2: 600, x: 300, y: 520 },
        { type: 'C', x1: 300, y1: 450, x2: 250, y2: 420, x: 200, y: 420 },
        { type: 'L', x: 200, y: 320 },
        { type: 'C', x1: 250, y1: 320, x2: 280, y2: 280, x: 280, y: 200 },
        { type: 'C', x1: 280, y1: 100, x2: 220, y2: 100, x: 180, y: 170 },
        { type: 'Z' },
      ],
      advanceWidth: 500,
    },
    
    '4': {
      commands: [
        { type: 'M', x: 320, y: 0 },
        { type: 'L', x: 320, y: 200 },
        { type: 'L', x: 50, y: 200 },
        { type: 'L', x: 50, y: 300 },
        { type: 'L', x: 280, y: 700 },
        { type: 'L', x: 440, y: 700 },
        { type: 'L', x: 440, y: 300 },
        { type: 'L', x: 520, y: 300 },
        { type: 'L', x: 520, y: 200 },
        { type: 'L', x: 440, y: 200 },
        { type: 'L', x: 440, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 320, y: 300 },
        { type: 'L', x: 320, y: 500 },
        { type: 'L', x: 180, y: 300 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    '5': {
      commands: [
        { type: 'M', x: 100, y: 100 },
        { type: 'C', x1: 150, y1: 0, x2: 450, y2: 0, x: 450, y: 250 },
        { type: 'C', x1: 450, y1: 500, x2: 200, y2: 500, x: 200, y: 400 },
        { type: 'L', x: 200, y: 600 },
        { type: 'L', x: 450, y: 600 },
        { type: 'L', x: 450, y: 700 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 80, y: 350 },
        { type: 'C', x1: 120, y1: 400, x2: 200, y2: 400, x: 280, y: 400 },
        { type: 'C', x1: 330, y1: 400, x2: 330, y2: 250, x: 280, y: 250 },
        { type: 'C', x1: 230, y1: 250, x2: 200, y2: 100, x: 180, y: 170 },
        { type: 'Z' },
      ],
      advanceWidth: 530,
    },
    
    '6': {
      commands: [
        { type: 'M', x: 280, y: 0 },
        { type: 'C', x1: 100, y1: 0, x2: 100, y2: 350, x: 100, y: 350 },
        { type: 'C', x1: 100, y1: 700, x2: 350, y2: 700, x: 420, y: 580 },
        { type: 'L', x: 340, y: 510 },
        { type: 'C', x1: 300, y1: 600, x2: 220, y2: 600, x: 220, y: 450 },
        { type: 'C', x1: 250, y1: 500, x2: 320, y2: 500, x: 380, y: 450 },
        { type: 'C', x1: 460, y1: 380, x2: 460, y2: 0, x: 280, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 280, y: 100 },
        { type: 'C', x1: 340, y1: 100, x2: 340, y2: 400, x: 280, y: 400 },
        { type: 'C', x1: 220, y1: 400, x2: 220, y2: 100, x: 280, y: 100 },
        { type: 'Z' },
      ],
      advanceWidth: 540,
    },
    
    '7': {
      commands: [
        { type: 'M', x: 80, y: 600 },
        { type: 'L', x: 80, y: 700 },
        { type: 'L', x: 480, y: 700 },
        { type: 'L', x: 480, y: 620 },
        { type: 'L', x: 250, y: 0 },
        { type: 'L', x: 120, y: 0 },
        { type: 'L', x: 350, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 540,
    },
    
    '8': {
      commands: [
        { type: 'M', x: 280, y: 0 },
        { type: 'C', x1: 100, y1: 0, x2: 100, y2: 200, x: 150, y: 300 },
        { type: 'C', x1: 100, y1: 400, x2: 100, y2: 700, x: 280, y: 700 },
        { type: 'C', x1: 460, y1: 700, x2: 460, y2: 400, x: 410, y: 300 },
        { type: 'C', x1: 460, y1: 200, x2: 460, y2: 0, x: 280, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 280, y: 100 },
        { type: 'C', x1: 340, y1: 100, x2: 340, y2: 250, x: 280, y: 300 },
        { type: 'C', x1: 220, y1: 250, x2: 220, y2: 100, x: 280, y: 100 },
        { type: 'Z' },
        { type: 'M', x: 280, y: 400 },
        { type: 'C', x1: 340, y1: 450, x2: 340, y2: 600, x: 280, y: 600 },
        { type: 'C', x1: 220, y1: 600, x2: 220, y2: 450, x: 280, y: 400 },
        { type: 'Z' },
      ],
      advanceWidth: 560,
    },
    
    '9': {
      commands: [
        { type: 'M', x: 280, y: 700 },
        { type: 'C', x1: 460, y1: 700, x2: 460, y2: 350, x: 460, y: 350 },
        { type: 'C', x1: 460, y1: 0, x2: 210, y2: 0, x: 140, y: 120 },
        { type: 'L', x: 220, y: 190 },
        { type: 'C', x1: 260, y1: 100, x2: 340, y2: 100, x: 340, y: 250 },
        { type: 'C', x1: 310, y1: 200, x2: 240, y2: 200, x: 180, y: 250 },
        { type: 'C', x1: 100, y1: 320, x2: 100, y2: 700, x: 280, y: 700 },
        { type: 'Z' },
        { type: 'M', x: 280, y: 600 },
        { type: 'C', x1: 220, y1: 600, x2: 220, y2: 300, x: 280, y: 300 },
        { type: 'C', x1: 340, y1: 300, x2: 340, y2: 600, x: 280, y: 600 },
        { type: 'Z' },
      ],
      advanceWidth: 540,
    },

    '.': {
      commands: [
        { type: 'M', x: 80, y: 0 },
        { type: 'L', x: 80, y: 120 },
        { type: 'L', x: 200, y: 120 },
        { type: 'L', x: 200, y: 0 },
        { type: 'Z' },
      ],
      advanceWidth: 280,
    },
    
    ',': {
      commands: [
        { type: 'M', x: 80, y: -100 },
        { type: 'L', x: 80, y: 120 },
        { type: 'L', x: 200, y: 120 },
        { type: 'L', x: 200, y: 0 },
        { type: 'L', x: 140, y: -100 },
        { type: 'Z' },
      ],
      advanceWidth: 280,
    },
    
    '-': {
      commands: [
        { type: 'M', x: 80, y: 300 },
        { type: 'L', x: 80, y: 400 },
        { type: 'L', x: 320, y: 400 },
        { type: 'L', x: 320, y: 300 },
        { type: 'Z' },
      ],
      advanceWidth: 400,
    },
    
    '?': {
      commands: [
        { type: 'M', x: 200, y: 0 },
        { type: 'L', x: 200, y: 120 },
        { type: 'L', x: 320, y: 120 },
        { type: 'L', x: 320, y: 0 },
        { type: 'Z' },
        { type: 'M', x: 200, y: 200 },
        { type: 'L', x: 200, y: 350 },
        { type: 'C', x1: 200, y1: 450, x2: 400, y2: 500, x: 400, y: 550 },
        { type: 'C', x1: 400, y1: 700, x2: 100, y2: 700, x: 100, y: 550 },
        { type: 'L', x: 200, y: 550 },
        { type: 'C', x1: 200, y1: 600, x2: 280, y2: 600, x: 280, y: 550 },
        { type: 'C', x1: 280, y1: 500, x2: 320, y2: 450, x: 320, y: 350 },
        { type: 'L', x: 320, y: 200 },
        { type: 'Z' },
      ],
      advanceWidth: 480,
    },
  }

  for (let i = 97; i <= 122; i++) {
    const lower = String.fromCharCode(i)
    const upper = String.fromCharCode(i - 32)
    if (glyphs[upper] && !glyphs[lower]) {
      glyphs[lower] = {
        commands: glyphs[upper].commands.map(cmd => {
          if (cmd.type === 'M' || cmd.type === 'L') {
            return { ...cmd, y: cmd.y * 0.7 }
          }
          if (cmd.type === 'C') {
            return { ...cmd, y: cmd.y * 0.7, y1: cmd.y1 * 0.7, y2: cmd.y2 * 0.7 }
          }
          if (cmd.type === 'Q') {
            return { ...cmd, y: cmd.y * 0.7, y1: cmd.y1 * 0.7 }
          }
          return cmd
        }),
        advanceWidth: glyphs[upper].advanceWidth * 0.85,
      }
    }
  }

  return { metrics, glyphs }
}

function createCNCSerifFont(): { metrics: FontMetrics; glyphs: Record<string, GlyphPath> } {
  return createCNCSansFont()
}

function createCNCMonoFont(): { metrics: FontMetrics; glyphs: Record<string, GlyphPath> } {
  const base = createCNCSansFont()
  const monoWidth = 600
  
  for (const key in base.glyphs) {
    base.glyphs[key].advanceWidth = monoWidth
  }
  
  return base
}

export function getAvailableFonts(): string[] {
  return Object.keys(BUILT_IN_FONTS)
}
