export interface SimulationPoint {
  x: number
  y: number
  z: number
  type: 'rapid' | 'linear' | 'arc'
  feedRate: number
  time: number
}

export interface SimulationData {
  points: SimulationPoint[]
  totalTime: number
  totalDistance: number
  bounds: {
    minX: number; maxX: number
    minY: number; maxY: number
    minZ: number; maxZ: number
  }
}

export function parseGcodeForSimulation(
  gcode: string[],
  rapidRate: number = 5000
): SimulationData {
  const points: SimulationPoint[] = []
  
  let currentX = 0, currentY = 0, currentZ = 0
  let currentFeed = 1000
  let totalTime = 0
  let totalDistance = 0
  let isAbsolute = true
  
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity

  points.push({
    x: currentX,
    y: currentY,
    z: currentZ,
    type: 'rapid',
    feedRate: rapidRate,
    time: 0,
  })

  for (const line of gcode) {
    const trimmed = line.trim().toUpperCase()
    if (trimmed.startsWith(';') || trimmed.length === 0) continue

    if (trimmed.includes('G90')) isAbsolute = true
    if (trimmed.includes('G91')) isAbsolute = false

    const isRapid = trimmed.includes('G0 ') || trimmed.startsWith('G0')
    const isLinear = trimmed.includes('G1 ') || trimmed.startsWith('G1')
    const isArcCW = trimmed.includes('G2 ') || trimmed.startsWith('G2')
    const isArcCCW = trimmed.includes('G3 ') || trimmed.startsWith('G3')

    if (!isRapid && !isLinear && !isArcCW && !isArcCCW) continue

    const xMatch = trimmed.match(/X([-\d.]+)/)
    const yMatch = trimmed.match(/Y([-\d.]+)/)
    const zMatch = trimmed.match(/Z([-\d.]+)/)
    const fMatch = trimmed.match(/F([\d.]+)/)

    if (fMatch) currentFeed = parseFloat(fMatch[1])

    let newX = currentX, newY = currentY, newZ = currentZ

    if (xMatch) {
      newX = isAbsolute ? parseFloat(xMatch[1]) : currentX + parseFloat(xMatch[1])
    }
    if (yMatch) {
      newY = isAbsolute ? parseFloat(yMatch[1]) : currentY + parseFloat(yMatch[1])
    }
    if (zMatch) {
      newZ = isAbsolute ? parseFloat(zMatch[1]) : currentZ + parseFloat(zMatch[1])
    }

    const dist = Math.sqrt(
      (newX - currentX) ** 2 + 
      (newY - currentY) ** 2 + 
      (newZ - currentZ) ** 2
    )

    const rate = isRapid ? rapidRate : currentFeed
    const segmentTime = (dist / rate) * 60

    totalDistance += dist
    totalTime += segmentTime

    minX = Math.min(minX, newX)
    maxX = Math.max(maxX, newX)
    minY = Math.min(minY, newY)
    maxY = Math.max(maxY, newY)
    minZ = Math.min(minZ, newZ)
    maxZ = Math.max(maxZ, newZ)

    points.push({
      x: newX,
      y: newY,
      z: newZ,
      type: isRapid ? 'rapid' : isArcCW || isArcCCW ? 'arc' : 'linear',
      feedRate: rate,
      time: totalTime,
    })

    currentX = newX
    currentY = newY
    currentZ = newZ
  }

  return {
    points,
    totalTime,
    totalDistance,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  }
}

export interface MaterialRemovalGrid {
  data: Float32Array
  width: number
  height: number
  cellSize: number
  originX: number
  originY: number
  stockHeight: number
}

export function createMaterialGrid(
  stockWidth: number,
  stockHeight: number,
  stockDepth: number,
  resolution: number = 1
): MaterialRemovalGrid {
  const cellSize = resolution
  const width = Math.ceil(stockWidth / cellSize)
  const height = Math.ceil(stockHeight / cellSize)
  
  const data = new Float32Array(width * height)
  data.fill(stockDepth)

  return {
    data,
    width,
    height,
    cellSize,
    originX: 0,
    originY: 0,
    stockHeight: stockDepth,
  }
}

export function simulateMaterialRemoval(
  grid: MaterialRemovalGrid,
  simulation: SimulationData,
  toolDiameter: number,
  stepSize: number = 0.5
): void {
  const toolRadius = toolDiameter / 2
  const toolRadiusCells = Math.ceil(toolRadius / grid.cellSize)

  for (let i = 1; i < simulation.points.length; i++) {
    const p0 = simulation.points[i - 1]
    const p1 = simulation.points[i]

    if (p1.type === 'rapid') continue
    if (p1.z >= 0) continue

    const dx = p1.x - p0.x
    const dy = p1.y - p0.y
    const dz = p1.z - p0.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    
    if (dist < 0.001) continue

    const steps = Math.max(1, Math.ceil(dist / stepSize))

    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      const x = p0.x + dx * t
      const y = p0.y + dy * t
      const z = p0.z + dz * t

      if (z >= 0) continue

      const cutDepth = -z

      const cellX = Math.floor((x - grid.originX) / grid.cellSize)
      const cellY = Math.floor((y - grid.originY) / grid.cellSize)

      for (let cy = -toolRadiusCells; cy <= toolRadiusCells; cy++) {
        for (let cx = -toolRadiusCells; cx <= toolRadiusCells; cx++) {
          const gx = cellX + cx
          const gy = cellY + cy

          if (gx < 0 || gx >= grid.width || gy < 0 || gy >= grid.height) continue

          const worldX = grid.originX + (gx + 0.5) * grid.cellSize
          const worldY = grid.originY + (gy + 0.5) * grid.cellSize
          const distFromTool = Math.sqrt((worldX - x) ** 2 + (worldY - y) ** 2)

          if (distFromTool <= toolRadius) {
            const idx = gy * grid.width + gx
            const newHeight = grid.stockHeight - cutDepth
            grid.data[idx] = Math.min(grid.data[idx], newHeight)
          }
        }
      }
    }
  }
}

export function getPointAtTime(
  simulation: SimulationData,
  time: number
): { x: number; y: number; z: number; progress: number } {
  if (time <= 0 || simulation.points.length === 0) {
    const p = simulation.points[0] || { x: 0, y: 0, z: 0 }
    return { x: p.x, y: p.y, z: p.z, progress: 0 }
  }

  if (time >= simulation.totalTime) {
    const p = simulation.points[simulation.points.length - 1]
    return { x: p.x, y: p.y, z: p.z, progress: 1 }
  }

  for (let i = 1; i < simulation.points.length; i++) {
    const p0 = simulation.points[i - 1]
    const p1 = simulation.points[i]

    if (time >= p0.time && time <= p1.time) {
      const segmentDuration = p1.time - p0.time
      const t = segmentDuration > 0 ? (time - p0.time) / segmentDuration : 0

      return {
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
        z: p0.z + (p1.z - p0.z) * t,
        progress: time / simulation.totalTime,
      }
    }
  }

  const p = simulation.points[simulation.points.length - 1]
  return { x: p.x, y: p.y, z: p.z, progress: 1 }
}

export function formatSimulationTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}
