import type { Toolpath, ToolpathSettings } from '@/types/design'
import type { Tool, MachineConfig, PostProcessorConfig } from '@/types/machine'
import type { DesignObject, PathPoint } from '@/types/design'

export interface GcodeGeneratorOptions {
  toolpath: Toolpath
  tool: Tool
  objects: DesignObject[]
  machineConfig: MachineConfig
  postProcessor: PostProcessorConfig
}

export interface GeneratedGcode {
  gcode: string[]
  estimatedTime: number
  boundingBox: {
    minX: number
    minY: number
    maxX: number
    maxY: number
    minZ: number
    maxZ: number
  }
  stats: {
    totalDistance: number
    cuttingDistance: number
    rapidDistance: number
    plunges: number
    retracts: number
  }
}

export function generateGcode(options: GcodeGeneratorOptions): GeneratedGcode {
  const { toolpath, tool, objects, machineConfig, postProcessor } = options
  const settings = toolpath.settings

  const gcode: string[] = []
  let lineNumber = postProcessor.useLineNumbers ? postProcessor.lineNumberIncrement : 0

  const addLine = (line: string) => {
    if (postProcessor.useLineNumbers) {
      gcode.push(`N${lineNumber} ${line}`)
      lineNumber += postProcessor.lineNumberIncrement
    } else {
      gcode.push(line)
    }
  }

  const stats = {
    totalDistance: 0,
    cuttingDistance: 0,
    rapidDistance: 0,
    plunges: 0,
    retracts: 0,
  }

  let currentX = 0, currentY = 0, currentZ = settings.safeHeight
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let minZ = 0, maxZ = settings.safeHeight

  const updateBounds = (x: number, y: number, z: number) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  const rapid = (x?: number, y?: number, z?: number) => {
    const parts = ['G0']
    if (x !== undefined) parts.push(`X${formatNumber(x, postProcessor.decimalPlaces)}`)
    if (y !== undefined) parts.push(`Y${formatNumber(y, postProcessor.decimalPlaces)}`)
    if (z !== undefined) parts.push(`Z${formatNumber(z, postProcessor.decimalPlaces)}`)
    addLine(parts.join(' '))

    const dist = Math.sqrt(
      (x !== undefined ? (x - currentX) ** 2 : 0) +
      (y !== undefined ? (y - currentY) ** 2 : 0) +
      (z !== undefined ? (z - currentZ) ** 2 : 0)
    )
    stats.rapidDistance += dist
    stats.totalDistance += dist

    if (x !== undefined) currentX = x
    if (y !== undefined) currentY = y
    if (z !== undefined) currentZ = z
    updateBounds(currentX, currentY, currentZ)
  }

  const linear = (x?: number, y?: number, z?: number, f?: number) => {
    const parts = ['G1']
    if (x !== undefined) parts.push(`X${formatNumber(x, postProcessor.decimalPlaces)}`)
    if (y !== undefined) parts.push(`Y${formatNumber(y, postProcessor.decimalPlaces)}`)
    if (z !== undefined) parts.push(`Z${formatNumber(z, postProcessor.decimalPlaces)}`)
    if (f !== undefined) parts.push(`F${f}`)
    addLine(parts.join(' '))

    const dist = Math.sqrt(
      (x !== undefined ? (x - currentX) ** 2 : 0) +
      (y !== undefined ? (y - currentY) ** 2 : 0) +
      (z !== undefined ? (z - currentZ) ** 2 : 0)
    )
    stats.cuttingDistance += dist
    stats.totalDistance += dist

    if (z !== undefined && z < currentZ) stats.plunges++
    if (z !== undefined && z > currentZ) stats.retracts++

    if (x !== undefined) currentX = x
    if (y !== undefined) currentY = y
    if (z !== undefined) currentZ = z
    updateBounds(currentX, currentY, currentZ)
  }

  for (const line of postProcessor.programStart) {
    addLine(line)
  }

  addLine(`G21 ; mm mode`)
  addLine(`G90 ; absolute positioning`)
  if (postProcessor.arcPlane) addLine(postProcessor.arcPlane)

  addLine(`; Tool: ${tool.name} (${tool.geometry.diameter}mm)`)
  addLine(`${machineConfig.spindle.clockwise} S${settings.spindleSpeed}`)
  
  if (machineConfig.spindle.spindleDelayMs > 0) {
    addLine(`G4 P${machineConfig.spindle.spindleDelayMs / 1000}`)
  }

  rapid(undefined, undefined, settings.safeHeight)

  const sourceObjects = objects.filter(obj => toolpath.sourceObjectIds.includes(obj.id))
  const cmd = { rapid, linear, addLine }

  switch (toolpath.type) {
    case 'profile':
      generateProfileToolpath(sourceObjects, settings, tool, cmd)
      break
    case 'pocket':
      generatePocketToolpath(sourceObjects, settings, tool, cmd)
      break
    case 'drill':
      generateDrillToolpath(sourceObjects, settings, tool, cmd)
      break
    case 'engrave':
      generateEngraveToolpath(sourceObjects, settings, tool, cmd)
      break
    default:
      addLine(`; Toolpath type ${toolpath.type} not yet implemented`)
  }

  rapid(undefined, undefined, settings.safeHeight)
  addLine('M5 ; spindle off')

  for (const line of postProcessor.programEnd) {
    addLine(line)
  }

  const feedRate = settings.feedRate
  const rapidRate = machineConfig.rapids.xy
  const estimatedTime = (stats.cuttingDistance / feedRate + stats.rapidDistance / rapidRate) * 60 * 1000

  return {
    gcode,
    estimatedTime,
    boundingBox: { minX, minY, maxX, maxY, minZ, maxZ },
    stats,
  }
}

interface GcodeCommands {
  rapid: (x?: number, y?: number, z?: number) => void
  linear: (x?: number, y?: number, z?: number, f?: number) => void
  addLine: (line: string) => void
}

function generateProfileToolpath(
  objects: DesignObject[],
  settings: ToolpathSettings,
  tool: Tool,
  cmd: GcodeCommands
) {
  const profileSettings = settings.profileSettings || {
    cutSide: 'outside' as const,
    direction: 'climb' as const,
    leadIn: { enabled: false, type: 'arc' as const, length: 5 },
    leadOut: { enabled: false, type: 'arc' as const, length: 5 },
    tabs: { enabled: false, count: 4, width: 5, height: 2, useAutoPlacement: true },
    ramp: { enabled: false, type: 'helix' as const, angle: 3 },
    allowance: 0,
    separateFinalPass: false,
    finalPassAllowance: 0.1,
  }

  const toolRadius = tool.geometry.diameter / 2
  const offset = profileSettings.cutSide === 'inside' ? -toolRadius :
                 profileSettings.cutSide === 'outside' ? toolRadius : 0

  for (const obj of objects) {
    const points = getObjectPoints(obj)
    if (points.length < 2) continue

    const offsetPoints = offsetPath(points, offset + profileSettings.allowance)
    const numPasses = Math.ceil(settings.cutDepth / settings.depthPerPass)
    
    for (let pass = 0; pass < numPasses; pass++) {
      const passDepth = Math.min((pass + 1) * settings.depthPerPass, settings.cutDepth)

      cmd.addLine(`; Profile pass ${pass + 1}/${numPasses} at Z${-passDepth}`)

      const startPoint = offsetPoints[0]
      cmd.rapid(startPoint.x, startPoint.y)
      cmd.linear(undefined, undefined, -passDepth, settings.plungeRate)

      for (let i = 1; i < offsetPoints.length; i++) {
        cmd.linear(offsetPoints[i].x, offsetPoints[i].y, undefined, settings.feedRate)
      }

      if (offsetPoints.length > 2) {
        cmd.linear(offsetPoints[0].x, offsetPoints[0].y, undefined, settings.feedRate)
      }

      cmd.rapid(undefined, undefined, settings.safeHeight)
    }
  }
}

function generatePocketToolpath(
  objects: DesignObject[],
  settings: ToolpathSettings,
  tool: Tool,
  cmd: GcodeCommands
) {
  const pocketSettings = settings.pocketSettings || {
    direction: 'climb' as const,
    stepover: 40,
    strategy: 'offset' as const,
    startPoint: 'center' as const,
    ramp: { enabled: false, type: 'helix' as const, angle: 3 },
    allowance: 0,
    separateFinalPass: false,
    finalPassAllowance: 0.1,
    restMachining: { enabled: false, previousToolDiameter: 6 },
  }

  const toolRadius = tool.geometry.diameter / 2
  const stepoverDist = tool.geometry.diameter * (pocketSettings.stepover / 100)

  for (const obj of objects) {
    const points = getObjectPoints(obj)
    if (points.length < 3) continue

    const numPasses = Math.ceil(settings.cutDepth / settings.depthPerPass)

    for (let pass = 0; pass < numPasses; pass++) {
      const passDepth = Math.min((pass + 1) * settings.depthPerPass, settings.cutDepth)

      cmd.addLine(`; Pocket pass ${pass + 1}/${numPasses} at Z${-passDepth}`)

      let currentOffset = toolRadius + pocketSettings.allowance
      const offsetPaths: { x: number; y: number }[][] = []
      
      while (true) {
        const offsetPoints = offsetPath(points, -currentOffset)
        if (offsetPoints.length < 3) break
        
        const area = calculateArea(offsetPoints)
        if (area < toolRadius * toolRadius) break
        
        offsetPaths.push(offsetPoints)
        currentOffset += stepoverDist
      }

      if (pocketSettings.startPoint === 'center') {
        offsetPaths.reverse()
      }

      for (const path of offsetPaths) {
        cmd.rapid(path[0].x, path[0].y)
        cmd.linear(undefined, undefined, -passDepth, settings.plungeRate)

        for (let i = 1; i < path.length; i++) {
          cmd.linear(path[i].x, path[i].y, undefined, settings.feedRate)
        }
        cmd.linear(path[0].x, path[0].y, undefined, settings.feedRate)

        cmd.rapid(undefined, undefined, settings.safeHeight)
      }
    }
  }
}

function generateDrillToolpath(
  objects: DesignObject[],
  settings: ToolpathSettings,
  _tool: Tool,
  cmd: GcodeCommands
) {
  const drillSettings = settings.drillSettings || {
    drillCycle: 'simple' as const,
    peckDepth: 2,
    retractHeight: 1,
    dwellTime: 0,
  }

  for (const obj of objects) {
    const center = getObjectCenter(obj)
    
    cmd.addLine(`; Drill at (${center.x.toFixed(2)}, ${center.y.toFixed(2)})`)
    cmd.rapid(center.x, center.y)

    if (drillSettings.drillCycle === 'simple') {
      cmd.linear(undefined, undefined, -settings.cutDepth, settings.plungeRate)
      if (drillSettings.dwellTime && drillSettings.dwellTime > 0) {
        cmd.addLine(`G4 P${drillSettings.dwellTime / 1000}`)
      }
      cmd.rapid(undefined, undefined, settings.safeHeight)
    } else if (drillSettings.drillCycle === 'peck') {
      const peckDepth = drillSettings.peckDepth || 2
      let currentDepth = 0
      
      while (currentDepth < settings.cutDepth) {
        currentDepth = Math.min(currentDepth + peckDepth, settings.cutDepth)
        cmd.linear(undefined, undefined, -currentDepth, settings.plungeRate)
        cmd.rapid(undefined, undefined, drillSettings.retractHeight || 1)
      }
      cmd.rapid(undefined, undefined, settings.safeHeight)
    }
  }
}

function generateEngraveToolpath(
  objects: DesignObject[],
  settings: ToolpathSettings,
  _tool: Tool,
  cmd: GcodeCommands
) {
  const engraveDepth = settings.engraveSettings?.depth || settings.cutDepth

  for (const obj of objects) {
    const points = getObjectPoints(obj)
    if (points.length < 2) continue

    cmd.addLine(`; Engrave path`)
    
    const startPoint = points[0]
    cmd.rapid(startPoint.x, startPoint.y)
    cmd.linear(undefined, undefined, -engraveDepth, settings.plungeRate)

    for (let i = 1; i < points.length; i++) {
      cmd.linear(points[i].x, points[i].y, undefined, settings.feedRate)
    }

    cmd.rapid(undefined, undefined, settings.safeHeight)
  }
}

function getObjectPoints(obj: DesignObject): { x: number; y: number }[] {
  if (obj.type === 'path') {
    const path = obj as any
    return path.points.map((pt: PathPoint) => ({
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
      const points: { x: number; y: number }[] = []
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
      const points: { x: number; y: number }[] = []
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

function getObjectCenter(obj: DesignObject): { x: number; y: number } {
  return { x: obj.transform.x, y: obj.transform.y }
}

function offsetPath(points: { x: number; y: number }[], distance: number): { x: number; y: number }[] {
  if (points.length < 2) return points
  
  const result: { x: number; y: number }[] = []
  
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]
    
    const dx1 = curr.x - prev.x
    const dy1 = curr.y - prev.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    
    const dx2 = next.x - curr.x
    const dy2 = next.y - curr.y
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
    
    result.push({
      x: curr.x + nx * distance,
      y: curr.y + ny * distance,
    })
  }
  
  return result
}

function calculateArea(points: { x: number; y: number }[]): number {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

function formatNumber(n: number, decimals: number): string {
  return n.toFixed(decimals)
}

export function estimateJobTime(gcode: string[], feedRate: number, rapidRate: number): number {
  let time = 0
  let lastX = 0, lastY = 0, lastZ = 0
  let currentFeed = feedRate
  
  for (const line of gcode) {
    const trimmed = line.trim()
    if (trimmed.startsWith(';') || trimmed.length === 0) continue
    
    const isRapid = trimmed.includes('G0')
    const isFeed = trimmed.includes('G1')
    
    const xMatch = trimmed.match(/X([-\d.]+)/)
    const yMatch = trimmed.match(/Y([-\d.]+)/)
    const zMatch = trimmed.match(/Z([-\d.]+)/)
    const fMatch = trimmed.match(/F([\d.]+)/)
    
    const x = xMatch ? parseFloat(xMatch[1]) : lastX
    const y = yMatch ? parseFloat(yMatch[1]) : lastY
    const z = zMatch ? parseFloat(zMatch[1]) : lastZ
    
    if (fMatch) currentFeed = parseFloat(fMatch[1])
    
    const dist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + (z - lastZ) ** 2)
    
    if (isRapid) {
      time += dist / rapidRate
    } else if (isFeed) {
      time += dist / currentFeed
    }
    
    lastX = x
    lastY = y
    lastZ = z
  }
  
  return time * 60 * 1000
}
