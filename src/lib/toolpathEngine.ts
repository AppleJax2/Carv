import type { VectorPath, DesignObject, PathPoint } from '@/types/design'
import type { Tool } from '@/types/machine'
import type { 
  Operation, 
  OperationSettings, 
  GeneratedToolpath, 
  ToolpathSegment, 
  Point3D,
  ToolpathStats,
  BoundingBox3D,
} from '@/types/project'

export interface ToolpathGeneratorOptions {
  operation: Operation
  tool: Tool
  objects: DesignObject[]
  stockThickness: number
  safeHeight: number
}

export function generateToolpath(options: ToolpathGeneratorOptions): GeneratedToolpath {
  const { operation, tool, objects, stockThickness, safeHeight } = options
  const settings = operation.settings
  
  const sourceObjects = objects.filter(obj => operation.sourceObjectIds.includes(obj.id))
  
  let segments: ToolpathSegment[] = []
  
  switch (operation.type) {
    case 'profile':
      segments = generateProfileToolpath(sourceObjects, settings, tool, stockThickness, safeHeight)
      break
    case 'pocket':
      segments = generatePocketToolpath(sourceObjects, settings, tool, stockThickness, safeHeight)
      break
    case 'drill':
      segments = generateDrillToolpath(sourceObjects, settings, tool, stockThickness, safeHeight)
      break
    case 'engrave':
      segments = generateEngraveToolpath(sourceObjects, settings, tool, safeHeight)
      break
    case 'vcarve':
      segments = generateVCarveToolpath(sourceObjects, settings, tool, safeHeight)
      break
    case 'facing':
      segments = generateFacingToolpath(sourceObjects, settings, tool, stockThickness, safeHeight)
      break
    case '3d-rough':
      segments = generate3DRoughToolpath(sourceObjects, settings, tool, stockThickness, safeHeight)
      break
    case '3d-finish':
      segments = generate3DFinishToolpath(sourceObjects, settings, tool, stockThickness, safeHeight)
      break
    default:
      segments = []
  }

  const stats = calculateToolpathStats(segments, settings.feedRate, settings.plungeRate)
  const boundingBox = calculateBoundingBox(segments)

  return {
    id: crypto.randomUUID(),
    generatedAt: new Date(),
    segments,
    stats,
    boundingBox,
  }
}

function generateProfileToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  stockThickness: number,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const toolRadius = tool.geometry.diameter / 2
  const profileSettings = settings.profileSettings
  
  const cutSide = profileSettings?.cutSide || 'outside'
  const direction = profileSettings?.direction || 'climb'
  
  const offsetDistance = cutSide === 'on' ? 0 : 
    cutSide === 'outside' ? toolRadius : -toolRadius

  for (const obj of objects) {
    const points = getObjectPoints(obj)
    if (points.length < 2) continue

    const offsetPoints = offsetDistance !== 0 
      ? offsetPolygon(points, offsetDistance) 
      : points

    if (direction === 'conventional') {
      offsetPoints.reverse()
    }

    const passes = Math.ceil(settings.cutDepth / settings.depthPerPass)
    
    for (let pass = 0; pass < passes; pass++) {
      const z = -Math.min((pass + 1) * settings.depthPerPass, settings.cutDepth)
      
      segments.push({
        type: 'rapid',
        start: { x: 0, y: 0, z: safeHeight },
        end: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: safeHeight },
      })

      if (settings.useRamping && settings.rampSettings) {
        const rampSegments = generateRampEntry(
          offsetPoints[0],
          z,
          safeHeight,
          settings.rampSettings,
          toolRadius,
        )
        segments.push(...rampSegments)
      } else {
        segments.push({
          type: 'rapid',
          start: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: safeHeight },
          end: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: settings.retractHeight },
        })
        
        segments.push({
          type: 'linear',
          start: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: settings.retractHeight },
          end: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: z },
          feedRate: settings.plungeRate,
        })
      }

      if (settings.useLeadInOut && settings.leadSettings) {
        const leadIn = generateLeadIn(
          offsetPoints[0],
          offsetPoints[1],
          z,
          settings.leadSettings,
        )
        segments.push(...leadIn)
      }

      for (let i = 1; i < offsetPoints.length; i++) {
        const prev = offsetPoints[i - 1]
        const curr = offsetPoints[i]
        
        segments.push({
          type: 'linear',
          start: { x: prev.x, y: prev.y, z },
          end: { x: curr.x, y: curr.y, z },
          feedRate: settings.feedRate,
        })
      }

      if (obj.type === 'path' && (obj as VectorPath).closed) {
        const last = offsetPoints[offsetPoints.length - 1]
        const first = offsetPoints[0]
        
        segments.push({
          type: 'linear',
          start: { x: last.x, y: last.y, z },
          end: { x: first.x, y: first.y, z },
          feedRate: settings.feedRate,
        })
      }

      if (settings.useLeadInOut && settings.leadSettings) {
        const leadOut = generateLeadOut(
          offsetPoints[offsetPoints.length - 2],
          offsetPoints[offsetPoints.length - 1],
          z,
          settings.leadSettings,
        )
        segments.push(...leadOut)
      }

      segments.push({
        type: 'rapid',
        start: { x: offsetPoints[offsetPoints.length - 1].x, y: offsetPoints[offsetPoints.length - 1].y, z },
        end: { x: offsetPoints[offsetPoints.length - 1].x, y: offsetPoints[offsetPoints.length - 1].y, z: safeHeight },
      })
    }

    if (settings.useTabs && settings.tabSettings) {
      insertTabs(segments, settings.tabSettings, settings.cutDepth)
    }
  }

  return segments
}

function generatePocketToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  stockThickness: number,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const toolRadius = tool.geometry.diameter / 2
  const pocketSettings = settings.pocketSettings
  
  const strategy = pocketSettings?.strategy || 'offset'
  const stepover = pocketSettings?.stepover || 40
  const stepoverDistance = (stepover / 100) * tool.geometry.diameter

  for (const obj of objects) {
    const points = getObjectPoints(obj)
    if (points.length < 3) continue

    const passes = Math.ceil(settings.cutDepth / settings.depthPerPass)
    
    for (let pass = 0; pass < passes; pass++) {
      const z = -Math.min((pass + 1) * settings.depthPerPass, settings.cutDepth)

      if (strategy === 'offset') {
        let currentOffset = toolRadius
        let offsetPoints = offsetPolygon(points, -currentOffset)
        
        while (offsetPoints.length >= 3 && polygonArea(offsetPoints) > 0) {
          segments.push({
            type: 'rapid',
            start: { x: 0, y: 0, z: safeHeight },
            end: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: safeHeight },
          })
          
          segments.push({
            type: 'rapid',
            start: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: safeHeight },
            end: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: settings.retractHeight },
          })
          
          segments.push({
            type: 'linear',
            start: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: settings.retractHeight },
            end: { x: offsetPoints[0].x, y: offsetPoints[0].y, z: z },
            feedRate: settings.plungeRate,
          })

          for (let i = 1; i < offsetPoints.length; i++) {
            segments.push({
              type: 'linear',
              start: { x: offsetPoints[i - 1].x, y: offsetPoints[i - 1].y, z },
              end: { x: offsetPoints[i].x, y: offsetPoints[i].y, z },
              feedRate: settings.feedRate,
            })
          }

          segments.push({
            type: 'linear',
            start: { x: offsetPoints[offsetPoints.length - 1].x, y: offsetPoints[offsetPoints.length - 1].y, z },
            end: { x: offsetPoints[0].x, y: offsetPoints[0].y, z },
            feedRate: settings.feedRate,
          })

          currentOffset += stepoverDistance
          offsetPoints = offsetPolygon(points, -currentOffset)
        }
      } else if (strategy === 'raster') {
        const bounds = getBounds(points)
        const rasterAngle = pocketSettings?.rasterAngle || 0
        
        const rasterLines = generateRasterLines(
          bounds,
          stepoverDistance,
          rasterAngle,
          points,
        )
        
        for (const line of rasterLines) {
          segments.push({
            type: 'rapid',
            start: { x: 0, y: 0, z: safeHeight },
            end: { x: line.start.x, y: line.start.y, z: safeHeight },
          })
          
          segments.push({
            type: 'linear',
            start: { x: line.start.x, y: line.start.y, z: safeHeight },
            end: { x: line.start.x, y: line.start.y, z: z },
            feedRate: settings.plungeRate,
          })
          
          segments.push({
            type: 'linear',
            start: { x: line.start.x, y: line.start.y, z },
            end: { x: line.end.x, y: line.end.y, z },
            feedRate: settings.feedRate,
          })
          
          segments.push({
            type: 'rapid',
            start: { x: line.end.x, y: line.end.y, z },
            end: { x: line.end.x, y: line.end.y, z: safeHeight },
          })
        }
      } else if (strategy === 'spiral') {
        const center = getPolygonCentroid(points)
        const maxRadius = getMaxDistanceFromCenter(points, center)
        
        let currentRadius = stepoverDistance
        let angle = 0
        const angleStep = 0.1
        
        segments.push({
          type: 'rapid',
          start: { x: 0, y: 0, z: safeHeight },
          end: { x: center.x, y: center.y, z: safeHeight },
        })
        
        segments.push({
          type: 'linear',
          start: { x: center.x, y: center.y, z: safeHeight },
          end: { x: center.x, y: center.y, z: z },
          feedRate: settings.plungeRate,
        })
        
        let prevPoint = { x: center.x, y: center.y }
        
        while (currentRadius < maxRadius) {
          const x = center.x + Math.cos(angle) * currentRadius
          const y = center.y + Math.sin(angle) * currentRadius
          
          if (pointInPolygon({ x, y }, points)) {
            segments.push({
              type: 'linear',
              start: { x: prevPoint.x, y: prevPoint.y, z },
              end: { x, y, z },
              feedRate: settings.feedRate,
            })
            prevPoint = { x, y }
          }
          
          angle += angleStep
          currentRadius += (stepoverDistance * angleStep) / (2 * Math.PI)
        }
      }

      segments.push({
        type: 'rapid',
        start: segments[segments.length - 1]?.end || { x: 0, y: 0, z },
        end: { x: segments[segments.length - 1]?.end?.x || 0, y: segments[segments.length - 1]?.end?.y || 0, z: safeHeight },
      })
    }
  }

  return segments
}

function generateDrillToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  stockThickness: number,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const drillSettings = settings.drillSettings
  const cycle = drillSettings?.cycle || 'simple'

  const drillPoints: { x: number; y: number }[] = []
  
  for (const obj of objects) {
    if (obj.type === 'shape' && (obj as any).shapeType === 'ellipse') {
      drillPoints.push({ x: obj.transform.x, y: obj.transform.y })
    } else {
      const center = getObjectCenter(obj)
      drillPoints.push(center)
    }
  }

  if (drillSettings?.orderOptimization === 'nearest-neighbor') {
    optimizeDrillOrder(drillPoints)
  }

  for (const point of drillPoints) {
    segments.push({
      type: 'rapid',
      start: { x: 0, y: 0, z: safeHeight },
      end: { x: point.x, y: point.y, z: safeHeight },
    })

    segments.push({
      type: 'rapid',
      start: { x: point.x, y: point.y, z: safeHeight },
      end: { x: point.x, y: point.y, z: settings.retractHeight },
    })

    if (cycle === 'simple') {
      segments.push({
        type: 'linear',
        start: { x: point.x, y: point.y, z: settings.retractHeight },
        end: { x: point.x, y: point.y, z: -settings.cutDepth },
        feedRate: settings.plungeRate,
      })
      
      if (drillSettings?.dwellTime && drillSettings.dwellTime > 0) {
      }
      
      segments.push({
        type: 'rapid',
        start: { x: point.x, y: point.y, z: -settings.cutDepth },
        end: { x: point.x, y: point.y, z: safeHeight },
      })
    } else if (cycle === 'peck') {
      const peckDepth = drillSettings?.peckDepth || 2
      const peckRetract = drillSettings?.peckRetract || 1
      
      let currentDepth = 0
      
      while (currentDepth < settings.cutDepth) {
        const targetDepth = Math.min(currentDepth + peckDepth, settings.cutDepth)
        
        segments.push({
          type: 'linear',
          start: { x: point.x, y: point.y, z: -currentDepth + peckRetract },
          end: { x: point.x, y: point.y, z: -targetDepth },
          feedRate: settings.plungeRate,
        })
        
        segments.push({
          type: 'rapid',
          start: { x: point.x, y: point.y, z: -targetDepth },
          end: { x: point.x, y: point.y, z: settings.retractHeight },
        })
        
        currentDepth = targetDepth
        
        if (currentDepth < settings.cutDepth) {
          segments.push({
            type: 'rapid',
            start: { x: point.x, y: point.y, z: settings.retractHeight },
            end: { x: point.x, y: point.y, z: -currentDepth + peckRetract },
          })
        }
      }
    } else if (cycle === 'chip-break') {
      const peckDepth = drillSettings?.peckDepth || 2
      const peckRetract = drillSettings?.peckRetract || 0.5
      
      let currentDepth = 0
      
      while (currentDepth < settings.cutDepth) {
        const targetDepth = Math.min(currentDepth + peckDepth, settings.cutDepth)
        
        segments.push({
          type: 'linear',
          start: { x: point.x, y: point.y, z: -currentDepth },
          end: { x: point.x, y: point.y, z: -targetDepth },
          feedRate: settings.plungeRate,
        })
        
        segments.push({
          type: 'rapid',
          start: { x: point.x, y: point.y, z: -targetDepth },
          end: { x: point.x, y: point.y, z: -targetDepth + peckRetract },
        })
        
        currentDepth = targetDepth
      }
      
      segments.push({
        type: 'rapid',
        start: { x: point.x, y: point.y, z: -settings.cutDepth },
        end: { x: point.x, y: point.y, z: safeHeight },
      })
    }
  }

  return segments
}

function generateEngraveToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const engraveSettings = settings.engraveSettings
  const depth = engraveSettings?.depth || settings.cutDepth

  for (const obj of objects) {
    const points = getObjectPoints(obj)
    if (points.length < 2) continue

    segments.push({
      type: 'rapid',
      start: { x: 0, y: 0, z: safeHeight },
      end: { x: points[0].x, y: points[0].y, z: safeHeight },
    })

    segments.push({
      type: 'linear',
      start: { x: points[0].x, y: points[0].y, z: safeHeight },
      end: { x: points[0].x, y: points[0].y, z: -depth },
      feedRate: settings.plungeRate,
    })

    for (let i = 1; i < points.length; i++) {
      segments.push({
        type: 'linear',
        start: { x: points[i - 1].x, y: points[i - 1].y, z: -depth },
        end: { x: points[i].x, y: points[i].y, z: -depth },
        feedRate: settings.feedRate,
      })
    }

    if (obj.type === 'path' && (obj as VectorPath).closed) {
      segments.push({
        type: 'linear',
        start: { x: points[points.length - 1].x, y: points[points.length - 1].y, z: -depth },
        end: { x: points[0].x, y: points[0].y, z: -depth },
        feedRate: settings.feedRate,
      })
    }

    segments.push({
      type: 'rapid',
      start: { x: points[points.length - 1].x, y: points[points.length - 1].y, z: -depth },
      end: { x: points[points.length - 1].x, y: points[points.length - 1].y, z: safeHeight },
    })
  }

  return segments
}

function generateVCarveToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const vcarveSettings = settings.vcarveSettings
  const maxDepth = vcarveSettings?.maxDepth || settings.cutDepth
  
  const toolAngle = (tool as any).geometry?.angle || 60
  const halfAngle = (toolAngle / 2) * (Math.PI / 180)

  for (const obj of objects) {
    const points = getObjectPoints(obj)
    if (points.length < 2) continue

    const medialAxis = computeMedialAxis(points)

    for (const segment of medialAxis) {
      const depth = Math.min(segment.width / (2 * Math.tan(halfAngle)), maxDepth)
      
      segments.push({
        type: 'rapid',
        start: { x: 0, y: 0, z: safeHeight },
        end: { x: segment.start.x, y: segment.start.y, z: safeHeight },
      })
      
      segments.push({
        type: 'linear',
        start: { x: segment.start.x, y: segment.start.y, z: safeHeight },
        end: { x: segment.start.x, y: segment.start.y, z: -depth },
        feedRate: settings.plungeRate,
      })
      
      segments.push({
        type: 'linear',
        start: { x: segment.start.x, y: segment.start.y, z: -depth },
        end: { x: segment.end.x, y: segment.end.y, z: -depth },
        feedRate: settings.feedRate,
      })
      
      segments.push({
        type: 'rapid',
        start: { x: segment.end.x, y: segment.end.y, z: -depth },
        end: { x: segment.end.x, y: segment.end.y, z: safeHeight },
      })
    }
  }

  return segments
}

function generateFacingToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  stockThickness: number,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const facingSettings = settings.facingSettings
  const stepover = facingSettings?.stepover || 70
  const stepoverDistance = (stepover / 100) * tool.geometry.diameter
  const rasterAngle = facingSettings?.rasterAngle || 0

  let bounds: { minX: number; minY: number; maxX: number; maxY: number }
  
  if (objects.length > 0) {
    bounds = getObjectsBounds(objects)
  } else {
    bounds = { minX: 0, minY: 0, maxX: 300, maxY: 300 }
  }

  const boundaryOffset = facingSettings?.boundaryOffset || 0
  bounds.minX -= boundaryOffset
  bounds.minY -= boundaryOffset
  bounds.maxX += boundaryOffset
  bounds.maxY += boundaryOffset

  const passes = Math.ceil(settings.cutDepth / settings.depthPerPass)
  
  for (let pass = 0; pass < passes; pass++) {
    const z = -Math.min((pass + 1) * settings.depthPerPass, settings.cutDepth)
    
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    const lineCount = Math.ceil(height / stepoverDistance)
    
    for (let i = 0; i <= lineCount; i++) {
      const y = bounds.minY + i * stepoverDistance
      const startX = i % 2 === 0 ? bounds.minX : bounds.maxX
      const endX = i % 2 === 0 ? bounds.maxX : bounds.minX
      
      segments.push({
        type: 'rapid',
        start: { x: 0, y: 0, z: safeHeight },
        end: { x: startX, y, z: safeHeight },
      })
      
      segments.push({
        type: 'linear',
        start: { x: startX, y, z: safeHeight },
        end: { x: startX, y, z: z },
        feedRate: settings.plungeRate,
      })
      
      segments.push({
        type: 'linear',
        start: { x: startX, y, z },
        end: { x: endX, y, z },
        feedRate: settings.feedRate,
      })
    }
    
    segments.push({
      type: 'rapid',
      start: segments[segments.length - 1]?.end || { x: 0, y: 0, z },
      end: { x: segments[segments.length - 1]?.end?.x || 0, y: segments[segments.length - 1]?.end?.y || 0, z: safeHeight },
    })
  }

  return segments
}

function generate3DRoughToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  stockThickness: number,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const roughSettings = settings.rough3dSettings
  const stepover = roughSettings?.stepover || 50
  const stepdown = roughSettings?.stepdown || settings.depthPerPass
  const stepoverDistance = (stepover / 100) * tool.geometry.diameter

  const model3D = objects.find(obj => obj.type === 'model3d') as any
  if (!model3D) return segments

  const heightmap = model3D.heightmap || generateHeightmapFromMesh(model3D)
  if (!heightmap) return segments

  const bounds = {
    minX: model3D.transform.x - model3D.dimensions.width / 2,
    maxX: model3D.transform.x + model3D.dimensions.width / 2,
    minY: model3D.transform.y - model3D.dimensions.height / 2,
    maxY: model3D.transform.y + model3D.dimensions.height / 2,
  }

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const lineCount = Math.ceil(height / stepoverDistance)

  for (let layer = 0; layer < Math.ceil(stockThickness / stepdown); layer++) {
    const targetZ = -Math.min((layer + 1) * stepdown, stockThickness)
    
    for (let i = 0; i <= lineCount; i++) {
      const y = bounds.minY + i * stepoverDistance
      const startX = i % 2 === 0 ? bounds.minX : bounds.maxX
      const endX = i % 2 === 0 ? bounds.maxX : bounds.minX
      const direction = i % 2 === 0 ? 1 : -1
      
      let prevX = startX
      let prevZ = safeHeight
      let cutting = false
      
      for (let x = startX; direction > 0 ? x <= endX : x >= endX; x += direction * tool.geometry.diameter / 4) {
        const modelZ = sampleHeightmap(heightmap, x, y, bounds, model3D.dimensions)
        const cutZ = Math.max(targetZ, -modelZ - (roughSettings?.stockToLeave || 0))
        
        if (!cutting) {
          segments.push({
            type: 'rapid',
            start: { x: prevX, y, z: safeHeight },
            end: { x, y, z: safeHeight },
          })
          segments.push({
            type: 'linear',
            start: { x, y, z: safeHeight },
            end: { x, y, z: cutZ },
            feedRate: settings.plungeRate,
          })
          cutting = true
        } else {
          segments.push({
            type: 'linear',
            start: { x: prevX, y, z: prevZ },
            end: { x, y, z: cutZ },
            feedRate: settings.feedRate,
          })
        }
        
        prevX = x
        prevZ = cutZ
      }
      
      segments.push({
        type: 'rapid',
        start: { x: prevX, y, z: prevZ },
        end: { x: prevX, y, z: safeHeight },
      })
    }
  }

  return segments
}

function generate3DFinishToolpath(
  objects: DesignObject[],
  settings: OperationSettings,
  tool: Tool,
  stockThickness: number,
  safeHeight: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const finishSettings = settings.finish3dSettings
  const stepover = finishSettings?.stepover || 10
  const stepoverDistance = (stepover / 100) * tool.geometry.diameter

  const model3D = objects.find(obj => obj.type === 'model3d') as any
  if (!model3D) return segments

  const heightmap = model3D.heightmap || generateHeightmapFromMesh(model3D)
  if (!heightmap) return segments

  const bounds = {
    minX: model3D.transform.x - model3D.dimensions.width / 2,
    maxX: model3D.transform.x + model3D.dimensions.width / 2,
    minY: model3D.transform.y - model3D.dimensions.height / 2,
    maxY: model3D.transform.y + model3D.dimensions.height / 2,
  }

  const height = bounds.maxY - bounds.minY
  const lineCount = Math.ceil(height / stepoverDistance)

  for (let i = 0; i <= lineCount; i++) {
    const y = bounds.minY + i * stepoverDistance
    const startX = i % 2 === 0 ? bounds.minX : bounds.maxX
    const endX = i % 2 === 0 ? bounds.maxX : bounds.minX
    const direction = i % 2 === 0 ? 1 : -1
    
    let prevX = startX
    let prevZ = safeHeight
    let cutting = false
    
    for (let x = startX; direction > 0 ? x <= endX : x >= endX; x += direction * tool.geometry.diameter / 8) {
      const modelZ = sampleHeightmap(heightmap, x, y, bounds, model3D.dimensions)
      const cutZ = -modelZ
      
      if (!cutting) {
        segments.push({
          type: 'rapid',
          start: { x: prevX, y, z: safeHeight },
          end: { x, y, z: safeHeight },
        })
        segments.push({
          type: 'linear',
          start: { x, y, z: safeHeight },
          end: { x, y, z: cutZ },
          feedRate: settings.plungeRate,
        })
        cutting = true
      } else {
        segments.push({
          type: 'linear',
          start: { x: prevX, y, z: prevZ },
          end: { x, y, z: cutZ },
          feedRate: settings.feedRate,
        })
      }
      
      prevX = x
      prevZ = cutZ
    }
    
    segments.push({
      type: 'rapid',
      start: { x: prevX, y, z: prevZ },
      end: { x: prevX, y, z: safeHeight },
    })
  }

  return segments
}

function getObjectPoints(obj: DesignObject): { x: number; y: number }[] {
  if (obj.type === 'path') {
    const path = obj as VectorPath
    return path.points.map(p => ({
      x: p.x * path.transform.scaleX + path.transform.x,
      y: p.y * path.transform.scaleY + path.transform.y,
    }))
  } else if (obj.type === 'shape') {
    return shapeToPoints(obj as any)
  }
  return []
}

function shapeToPoints(shape: any): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const { transform, shapeType, params } = shape
  
  if (shapeType === 'rectangle') {
    const hw = params.width / 2
    const hh = params.height / 2
    points.push(
      { x: transform.x - hw, y: transform.y - hh },
      { x: transform.x + hw, y: transform.y - hh },
      { x: transform.x + hw, y: transform.y + hh },
      { x: transform.x - hw, y: transform.y + hh },
    )
  } else if (shapeType === 'ellipse') {
    const segments = 32
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push({
        x: transform.x + Math.cos(angle) * params.radiusX,
        y: transform.y + Math.sin(angle) * params.radiusY,
      })
    }
  } else if (shapeType === 'polygon') {
    for (let i = 0; i < params.sides; i++) {
      const angle = (i / params.sides) * Math.PI * 2 - Math.PI / 2
      points.push({
        x: transform.x + Math.cos(angle) * params.radius,
        y: transform.y + Math.sin(angle) * params.radius,
      })
    }
  }
  
  return points
}

function getObjectCenter(obj: DesignObject): { x: number; y: number } {
  const points = getObjectPoints(obj)
  if (points.length === 0) return { x: obj.transform.x, y: obj.transform.y }
  
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function offsetPolygon(points: { x: number; y: number }[], distance: number): { x: number; y: number }[] {
  if (points.length < 3) return points
  
  const result: { x: number; y: number }[] = []
  const n = points.length
  
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]
    
    const v1 = normalize({ x: curr.x - prev.x, y: curr.y - prev.y })
    const v2 = normalize({ x: next.x - curr.x, y: next.y - curr.y })
    
    const n1 = { x: -v1.y, y: v1.x }
    const n2 = { x: -v2.y, y: v2.x }
    
    const bisector = normalize({ x: n1.x + n2.x, y: n1.y + n2.y })
    const dot = n1.x * bisector.x + n1.y * bisector.y
    const miterLength = dot !== 0 ? distance / dot : distance
    
    result.push({
      x: curr.x + bisector.x * miterLength,
      y: curr.y + bisector.y * miterLength,
    })
  }
  
  return result
}

function normalize(v: { x: number; y: number }): { x: number; y: number } {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function polygonArea(points: { x: number; y: number }[]): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  return Math.abs(area / 2)
}

function getBounds(points: { x: number; y: number }[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

function getObjectsBounds(objects: DesignObject[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const obj of objects) {
    const points = getObjectPoints(obj)
    for (const p of points) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
  }
  return { minX, minY, maxX, maxY }
}

function pointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
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

function getPolygonCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

function getMaxDistanceFromCenter(points: { x: number; y: number }[], center: { x: number; y: number }): number {
  let maxDist = 0
  for (const p of points) {
    const dist = Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2)
    maxDist = Math.max(maxDist, dist)
  }
  return maxDist
}

function generateRampEntry(
  startPoint: { x: number; y: number },
  targetZ: number,
  safeHeight: number,
  rampSettings: any,
  toolRadius: number,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const rampType = rampSettings.type || 'helix'
  const rampAngle = rampSettings.angle || 3
  
  if (rampType === 'helix') {
    const helixRadius = rampSettings.helixDiameter ? rampSettings.helixDiameter / 2 : toolRadius * 0.8
    const rampAngleRad = rampAngle * Math.PI / 180
    const zPerRevolution = 2 * Math.PI * helixRadius * Math.tan(rampAngleRad)
    const totalZ = safeHeight - targetZ
    const revolutions = totalZ / zPerRevolution
    
    let currentZ = safeHeight
    let angle = 0
    const angleStep = 0.1
    
    while (currentZ > targetZ) {
      const x = startPoint.x + Math.cos(angle) * helixRadius
      const y = startPoint.y + Math.sin(angle) * helixRadius
      const nextAngle = angle + angleStep
      const nextX = startPoint.x + Math.cos(nextAngle) * helixRadius
      const nextY = startPoint.y + Math.sin(nextAngle) * helixRadius
      const nextZ = Math.max(currentZ - (zPerRevolution * angleStep / (2 * Math.PI)), targetZ)
      
      segments.push({
        type: 'arc-cw',
        start: { x, y, z: currentZ },
        end: { x: nextX, y: nextY, z: nextZ },
        center: { x: startPoint.x, y: startPoint.y, z: currentZ },
        radius: helixRadius,
      })
      
      currentZ = nextZ
      angle = nextAngle
    }
  } else if (rampType === 'zigzag') {
    const rampLength = Math.abs(targetZ - safeHeight) / Math.tan(rampAngle * Math.PI / 180)
    
    segments.push({
      type: 'linear',
      start: { x: startPoint.x, y: startPoint.y, z: safeHeight },
      end: { x: startPoint.x + rampLength, y: startPoint.y, z: targetZ },
    })
  }
  
  return segments
}

function generateLeadIn(
  startPoint: { x: number; y: number },
  nextPoint: { x: number; y: number },
  z: number,
  leadSettings: any,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const leadType = leadSettings.leadInType || 'arc'
  const radius = leadSettings.leadInRadius || 5
  
  if (leadType === 'arc') {
    const dx = nextPoint.x - startPoint.x
    const dy = nextPoint.y - startPoint.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const nx = -dy / len
    const ny = dx / len
    
    const arcStart = {
      x: startPoint.x + nx * radius,
      y: startPoint.y + ny * radius,
    }
    
    segments.push({
      type: 'arc-cw',
      start: { x: arcStart.x, y: arcStart.y, z },
      end: { x: startPoint.x, y: startPoint.y, z },
      center: { x: startPoint.x + nx * radius / 2, y: startPoint.y + ny * radius / 2, z },
      radius: radius / 2,
    })
  }
  
  return segments
}

function generateLeadOut(
  prevPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
  z: number,
  leadSettings: any,
): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []
  const leadType = leadSettings.leadOutType || 'arc'
  const radius = leadSettings.leadOutRadius || 5
  
  if (leadType === 'arc') {
    const dx = endPoint.x - prevPoint.x
    const dy = endPoint.y - prevPoint.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const nx = -dy / len
    const ny = dx / len
    
    const arcEnd = {
      x: endPoint.x + nx * radius,
      y: endPoint.y + ny * radius,
    }
    
    segments.push({
      type: 'arc-cw',
      start: { x: endPoint.x, y: endPoint.y, z },
      end: { x: arcEnd.x, y: arcEnd.y, z },
      center: { x: endPoint.x + nx * radius / 2, y: endPoint.y + ny * radius / 2, z },
      radius: radius / 2,
    })
  }
  
  return segments
}

function insertTabs(
  segments: ToolpathSegment[],
  tabSettings: any,
  cutDepth: number,
): void {
  const tabHeight = tabSettings.height || 2
  const tabWidth = tabSettings.width || 5
  const tabCount = tabSettings.count || 4
  
}

function optimizeDrillOrder(points: { x: number; y: number }[]): void {
  for (let i = 0; i < points.length - 1; i++) {
    let minDist = Infinity
    let minIdx = i + 1
    
    for (let j = i + 1; j < points.length; j++) {
      const dist = Math.sqrt(
        (points[i].x - points[j].x) ** 2 + 
        (points[i].y - points[j].y) ** 2
      )
      if (dist < minDist) {
        minDist = dist
        minIdx = j
      }
    }
    
    if (minIdx !== i + 1) {
      [points[i + 1], points[minIdx]] = [points[minIdx], points[i + 1]]
    }
  }
}

function computeMedialAxis(points: { x: number; y: number }[]): { start: { x: number; y: number }; end: { x: number; y: number }; width: number }[] {
  const result: { start: { x: number; y: number }; end: { x: number; y: number }; width: number }[] = []
  
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]
    const end = points[i + 1]
    const width = 5
    
    result.push({ start, end, width })
  }
  
  return result
}

function generateRasterLines(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  stepover: number,
  angle: number,
  polygon: { x: number; y: number }[],
): { start: { x: number; y: number }; end: { x: number; y: number } }[] {
  const lines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = []
  
  const height = bounds.maxY - bounds.minY
  const lineCount = Math.ceil(height / stepover)
  
  for (let i = 0; i <= lineCount; i++) {
    const y = bounds.minY + i * stepover
    
    const intersections: number[] = []
    for (let j = 0; j < polygon.length; j++) {
      const p1 = polygon[j]
      const p2 = polygon[(j + 1) % polygon.length]
      
      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        const x = p1.x + (y - p1.y) / (p2.y - p1.y) * (p2.x - p1.x)
        intersections.push(x)
      }
    }
    
    intersections.sort((a, b) => a - b)
    
    for (let j = 0; j < intersections.length - 1; j += 2) {
      lines.push({
        start: { x: intersections[j], y },
        end: { x: intersections[j + 1], y },
      })
    }
  }
  
  return lines
}

function generateHeightmapFromMesh(model: any): number[][] | null {
  if (!model.mesh) return null
  
  const resolution = 100
  const heightmap: number[][] = []
  
  for (let y = 0; y < resolution; y++) {
    heightmap[y] = []
    for (let x = 0; x < resolution; x++) {
      heightmap[y][x] = 0
    }
  }
  
  return heightmap
}

function sampleHeightmap(
  heightmap: number[][],
  x: number,
  y: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  dimensions: { width: number; height: number; depth: number },
): number {
  const resolution = heightmap.length
  const normalizedX = (x - bounds.minX) / (bounds.maxX - bounds.minX)
  const normalizedY = (y - bounds.minY) / (bounds.maxY - bounds.minY)
  
  const pixelX = Math.floor(normalizedX * (resolution - 1))
  const pixelY = Math.floor(normalizedY * (resolution - 1))
  
  const clampedX = Math.max(0, Math.min(resolution - 1, pixelX))
  const clampedY = Math.max(0, Math.min(resolution - 1, pixelY))
  
  return heightmap[clampedY][clampedX] * dimensions.depth
}

function calculateToolpathStats(
  segments: ToolpathSegment[],
  feedRate: number,
  plungeRate: number,
): ToolpathStats {
  let totalDistance = 0
  let cuttingDistance = 0
  let rapidDistance = 0
  let plungeCount = 0
  let retractCount = 0
  let maxDepth = 0
  
  for (const segment of segments) {
    const dx = segment.end.x - segment.start.x
    const dy = segment.end.y - segment.start.y
    const dz = segment.end.z - segment.start.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    
    totalDistance += dist
    
    if (segment.type === 'rapid') {
      rapidDistance += dist
      if (dz > 0) retractCount++
    } else {
      cuttingDistance += dist
      if (dz < 0 && Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        plungeCount++
      }
    }
    
    maxDepth = Math.max(maxDepth, -segment.end.z)
  }
  
  const rapidTime = rapidDistance / 5000
  const cuttingTime = cuttingDistance / feedRate
  const estimatedTime = (rapidTime + cuttingTime) * 60
  
  return {
    totalDistance,
    cuttingDistance,
    rapidDistance,
    estimatedTime,
    plungeCount,
    retractCount,
    maxDepth,
    passCount: plungeCount,
  }
}

function calculateBoundingBox(segments: ToolpathSegment[]): BoundingBox3D {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  
  for (const segment of segments) {
    minX = Math.min(minX, segment.start.x, segment.end.x)
    minY = Math.min(minY, segment.start.y, segment.end.y)
    minZ = Math.min(minZ, segment.start.z, segment.end.z)
    maxX = Math.max(maxX, segment.start.x, segment.end.x)
    maxY = Math.max(maxY, segment.start.y, segment.end.y)
    maxZ = Math.max(maxZ, segment.start.z, segment.end.z)
  }
  
  return { minX, minY, minZ, maxX, maxY, maxZ }
}

export function toolpathToGcode(
  toolpath: GeneratedToolpath,
  tool: Tool,
  settings: OperationSettings,
  postProcessor: any,
): string {
  const lines: string[] = []
  let lineNumber = postProcessor?.useLineNumbers ? 10 : 0
  
  const addLine = (code: string) => {
    if (postProcessor?.useLineNumbers) {
      lines.push(`N${lineNumber} ${code}`)
      lineNumber += 10
    } else {
      lines.push(code)
    }
  }
  
  if (postProcessor?.programStart) {
    for (const line of postProcessor.programStart) {
      addLine(line)
    }
  }
  
  addLine('G21')
  addLine('G90')
  addLine(`G0 Z${settings.safeHeight.toFixed(3)}`)
  addLine(`M3 S${settings.spindleSpeed}`)
  
  for (const segment of toolpath.segments) {
    const x = segment.end.x.toFixed(3)
    const y = segment.end.y.toFixed(3)
    const z = segment.end.z.toFixed(3)
    
    if (segment.type === 'rapid') {
      addLine(`G0 X${x} Y${y} Z${z}`)
    } else if (segment.type === 'linear') {
      const f = segment.feedRate?.toFixed(0) || settings.feedRate.toFixed(0)
      addLine(`G1 X${x} Y${y} Z${z} F${f}`)
    } else if (segment.type === 'arc-cw') {
      const i = (segment.center!.x - segment.start.x).toFixed(3)
      const j = (segment.center!.y - segment.start.y).toFixed(3)
      addLine(`G2 X${x} Y${y} Z${z} I${i} J${j}`)
    } else if (segment.type === 'arc-ccw') {
      const i = (segment.center!.x - segment.start.x).toFixed(3)
      const j = (segment.center!.y - segment.start.y).toFixed(3)
      addLine(`G3 X${x} Y${y} Z${z} I${i} J${j}`)
    }
  }
  
  addLine('M5')
  addLine(`G0 Z${settings.safeHeight.toFixed(3)}`)
  addLine('G0 X0 Y0')
  
  if (postProcessor?.programEnd) {
    for (const line of postProcessor.programEnd) {
      addLine(line)
    }
  }
  
  addLine('M30')
  
  return lines.join('\n')
}
