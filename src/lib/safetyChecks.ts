import type { GeneratedToolpath, ToolpathSegment, Setup, Keepout, BoundingBox3D } from '@/types/project'
import type { Tool, MachineConfig } from '@/types/machine'

export interface SafetyCheckResult {
  passed: boolean
  checks: SafetyCheck[]
  warnings: SafetyWarning[]
  errors: SafetyError[]
}

export interface SafetyCheck {
  id: string
  name: string
  description: string
  passed: boolean
  category: 'bounds' | 'tool' | 'feeds' | 'depth' | 'collision' | 'general'
}

export interface SafetyWarning {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
  location?: { x: number; y: number; z: number }
  suggestion?: string
}

export interface SafetyError {
  code: string
  message: string
  location?: { x: number; y: number; z: number }
  blocksExecution: boolean
}

export function performSafetyChecks(
  toolpath: GeneratedToolpath,
  tool: Tool,
  setup: Setup,
  machineConfig: MachineConfig,
  keepouts: Keepout[],
): SafetyCheckResult {
  const checks: SafetyCheck[] = []
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []

  const boundsCheck = checkMachineBounds(toolpath, machineConfig)
  checks.push(boundsCheck.check)
  warnings.push(...boundsCheck.warnings)
  errors.push(...boundsCheck.errors)

  const stockCheck = checkStockBounds(toolpath, setup)
  checks.push(stockCheck.check)
  warnings.push(...stockCheck.warnings)
  errors.push(...stockCheck.errors)

  const depthCheck = checkCutDepth(toolpath, tool, setup)
  checks.push(depthCheck.check)
  warnings.push(...depthCheck.warnings)
  errors.push(...depthCheck.errors)

  const feedCheck = checkFeedRates(toolpath, tool, machineConfig)
  checks.push(feedCheck.check)
  warnings.push(...feedCheck.warnings)
  errors.push(...feedCheck.errors)

  const toolCheck = checkToolCompatibility(tool, toolpath)
  checks.push(toolCheck.check)
  warnings.push(...toolCheck.warnings)
  errors.push(...toolCheck.errors)

  const keepoutCheck = checkKeepouts(toolpath, keepouts, tool)
  checks.push(keepoutCheck.check)
  warnings.push(...keepoutCheck.warnings)
  errors.push(...keepoutCheck.errors)

  const rapidCheck = checkRapidMoves(toolpath, setup)
  checks.push(rapidCheck.check)
  warnings.push(...rapidCheck.warnings)
  errors.push(...rapidCheck.errors)

  const passed = errors.filter(e => e.blocksExecution).length === 0

  return { passed, checks, warnings, errors }
}

function checkMachineBounds(
  toolpath: GeneratedToolpath,
  machineConfig: MachineConfig,
): { check: SafetyCheck; warnings: SafetyWarning[]; errors: SafetyError[] } {
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []
  
  const bounds = toolpath.boundingBox
  const machineTravel = machineConfig.workArea

  let passed = true

  if (bounds.maxX > machineTravel.x) {
    errors.push({
      code: 'BOUNDS_X_MAX',
      message: `Toolpath exceeds X+ limit: ${bounds.maxX.toFixed(1)}mm > ${machineTravel.x}mm`,
      location: { x: bounds.maxX, y: 0, z: 0 },
      blocksExecution: true,
    })
    passed = false
  }

  if (bounds.minX < 0) {
    errors.push({
      code: 'BOUNDS_X_MIN',
      message: `Toolpath exceeds X- limit: ${bounds.minX.toFixed(1)}mm < 0mm`,
      location: { x: bounds.minX, y: 0, z: 0 },
      blocksExecution: true,
    })
    passed = false
  }

  if (bounds.maxY > machineTravel.y) {
    errors.push({
      code: 'BOUNDS_Y_MAX',
      message: `Toolpath exceeds Y+ limit: ${bounds.maxY.toFixed(1)}mm > ${machineTravel.y}mm`,
      location: { x: 0, y: bounds.maxY, z: 0 },
      blocksExecution: true,
    })
    passed = false
  }

  if (bounds.minY < 0) {
    errors.push({
      code: 'BOUNDS_Y_MIN',
      message: `Toolpath exceeds Y- limit: ${bounds.minY.toFixed(1)}mm < 0mm`,
      location: { x: 0, y: bounds.minY, z: 0 },
      blocksExecution: true,
    })
    passed = false
  }

  if (bounds.minZ < -machineTravel.z) {
    errors.push({
      code: 'BOUNDS_Z_MIN',
      message: `Toolpath exceeds Z- limit: ${bounds.minZ.toFixed(1)}mm < -${machineTravel.z}mm`,
      location: { x: 0, y: 0, z: bounds.minZ },
      blocksExecution: true,
    })
    passed = false
  }

  const marginX = Math.min(bounds.minX, machineTravel.x - bounds.maxX)
  const marginY = Math.min(bounds.minY, machineTravel.y - bounds.maxY)
  
  if (marginX < 10 || marginY < 10) {
    warnings.push({
      code: 'BOUNDS_MARGIN',
      message: 'Toolpath is close to machine limits',
      severity: 'medium',
      suggestion: 'Consider repositioning the workpiece for more clearance',
    })
  }

  return {
    check: {
      id: 'machine-bounds',
      name: 'Machine Bounds',
      description: 'Verify toolpath stays within machine travel limits',
      passed,
      category: 'bounds',
    },
    warnings,
    errors,
  }
}

function checkStockBounds(
  toolpath: GeneratedToolpath,
  setup: Setup,
): { check: SafetyCheck; warnings: SafetyWarning[]; errors: SafetyError[] } {
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []
  
  const bounds = toolpath.boundingBox
  const stock = setup.stock.dimensions

  let passed = true

  if (bounds.maxX > stock.width || bounds.minX < 0) {
    warnings.push({
      code: 'STOCK_X_BOUNDS',
      message: 'Toolpath extends beyond stock width',
      severity: 'high',
      suggestion: 'Verify stock dimensions or adjust design position',
    })
  }

  if (bounds.maxY > stock.height || bounds.minY < 0) {
    warnings.push({
      code: 'STOCK_Y_BOUNDS',
      message: 'Toolpath extends beyond stock height',
      severity: 'high',
      suggestion: 'Verify stock dimensions or adjust design position',
    })
  }

  if (Math.abs(bounds.minZ) > stock.thickness) {
    errors.push({
      code: 'STOCK_Z_DEPTH',
      message: `Cut depth (${Math.abs(bounds.minZ).toFixed(1)}mm) exceeds stock thickness (${stock.thickness}mm)`,
      location: { x: 0, y: 0, z: bounds.minZ },
      blocksExecution: false,
    })
    warnings.push({
      code: 'CUT_THROUGH',
      message: 'Toolpath will cut through the material',
      severity: 'high',
      suggestion: 'Ensure wasteboard is in place and sacrificial',
    })
  }

  return {
    check: {
      id: 'stock-bounds',
      name: 'Stock Bounds',
      description: 'Verify toolpath stays within stock dimensions',
      passed,
      category: 'bounds',
    },
    warnings,
    errors,
  }
}

function checkCutDepth(
  toolpath: GeneratedToolpath,
  tool: Tool,
  setup: Setup,
): { check: SafetyCheck; warnings: SafetyWarning[]; errors: SafetyError[] } {
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []
  
  const maxDepth = Math.abs(toolpath.boundingBox.minZ)
  const fluteLength = tool.geometry.fluteLength || tool.geometry.diameter * 3

  let passed = true

  if (maxDepth > fluteLength) {
    errors.push({
      code: 'DEPTH_EXCEEDS_FLUTE',
      message: `Cut depth (${maxDepth.toFixed(1)}mm) exceeds tool flute length (${fluteLength.toFixed(1)}mm)`,
      blocksExecution: true,
    })
    passed = false
  }

  if (maxDepth > fluteLength * 0.8) {
    warnings.push({
      code: 'DEPTH_NEAR_FLUTE_LIMIT',
      message: 'Cut depth is close to tool flute length limit',
      severity: 'medium',
      suggestion: 'Consider using a longer tool or reducing cut depth',
    })
  }

  const depthPerPass = toolpath.stats.maxDepth / toolpath.stats.passCount
  const recommendedDepthPerPass = tool.geometry.diameter * 0.5

  if (depthPerPass > recommendedDepthPerPass * 2) {
    warnings.push({
      code: 'AGGRESSIVE_DEPTH_PER_PASS',
      message: `Depth per pass (${depthPerPass.toFixed(1)}mm) may be too aggressive`,
      severity: 'medium',
      suggestion: `Consider reducing to ${recommendedDepthPerPass.toFixed(1)}mm or less`,
    })
  }

  return {
    check: {
      id: 'cut-depth',
      name: 'Cut Depth',
      description: 'Verify cut depth is within tool capabilities',
      passed,
      category: 'depth',
    },
    warnings,
    errors,
  }
}

function checkFeedRates(
  toolpath: GeneratedToolpath,
  tool: Tool,
  machineConfig: MachineConfig,
): { check: SafetyCheck; warnings: SafetyWarning[]; errors: SafetyError[] } {
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []

  let passed = true
  let maxFeedRate = 0
  let maxPlungeRate = 0

  for (const segment of toolpath.segments) {
    if (segment.type === 'linear' && segment.feedRate) {
      const dz = segment.end.z - segment.start.z
      const dx = segment.end.x - segment.start.x
      const dy = segment.end.y - segment.start.y
      
      if (dz < 0 && Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
        maxPlungeRate = Math.max(maxPlungeRate, segment.feedRate)
      } else {
        maxFeedRate = Math.max(maxFeedRate, segment.feedRate)
      }
    }
  }

  const maxMachineFeed = machineConfig.rapids?.xy || 5000
  if (maxFeedRate > maxMachineFeed) {
    errors.push({
      code: 'FEED_EXCEEDS_MACHINE',
      message: `Feed rate (${maxFeedRate}mm/min) exceeds machine maximum (${maxMachineFeed}mm/min)`,
      blocksExecution: false,
    })
  }

  const recommendedMaxFeed = tool.defaultFeedRate ? tool.defaultFeedRate * 1.5 : 2000
  if (maxFeedRate > recommendedMaxFeed) {
    warnings.push({
      code: 'FEED_HIGH',
      message: `Feed rate (${maxFeedRate}mm/min) is higher than recommended for this tool`,
      severity: 'medium',
      suggestion: `Consider reducing to ${recommendedMaxFeed.toFixed(0)}mm/min or less`,
    })
  }

  const recommendedMaxPlunge = tool.defaultPlungeRate ? tool.defaultPlungeRate * 1.5 : 500
  if (maxPlungeRate > recommendedMaxPlunge) {
    warnings.push({
      code: 'PLUNGE_HIGH',
      message: `Plunge rate (${maxPlungeRate}mm/min) is higher than recommended`,
      severity: 'medium',
      suggestion: `Consider reducing to ${recommendedMaxPlunge.toFixed(0)}mm/min or less`,
    })
  }

  return {
    check: {
      id: 'feed-rates',
      name: 'Feed Rates',
      description: 'Verify feed rates are within safe limits',
      passed,
      category: 'feeds',
    },
    warnings,
    errors,
  }
}

function checkToolCompatibility(
  tool: Tool,
  toolpath: GeneratedToolpath,
): { check: SafetyCheck; warnings: SafetyWarning[]; errors: SafetyError[] } {
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []

  let passed = true

  if (!tool.geometry.diameter || tool.geometry.diameter <= 0) {
    errors.push({
      code: 'TOOL_NO_DIAMETER',
      message: 'Tool has no valid diameter specified',
      blocksExecution: true,
    })
    passed = false
  }

  return {
    check: {
      id: 'tool-compatibility',
      name: 'Tool Compatibility',
      description: 'Verify tool is suitable for the operation',
      passed,
      category: 'tool',
    },
    warnings,
    errors,
  }
}

function checkKeepouts(
  toolpath: GeneratedToolpath,
  keepouts: Keepout[],
  tool: Tool,
): { check: SafetyCheck; warnings: SafetyWarning[]; errors: SafetyError[] } {
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []

  let passed = true
  const toolRadius = tool.geometry.diameter / 2

  for (const keepout of keepouts) {
    for (const segment of toolpath.segments) {
      if (segment.type === 'rapid' && !keepout.avoidRapids) continue
      if (segment.type !== 'rapid' && !keepout.avoidCuts) continue

      const collision = checkSegmentKeepoutCollision(segment, keepout, toolRadius)
      
      if (collision) {
        if (keepout.avoidCuts && segment.type !== 'rapid') {
          errors.push({
            code: 'KEEPOUT_COLLISION',
            message: `Toolpath collides with keepout zone: ${keepout.name}`,
            location: collision,
            blocksExecution: true,
          })
          passed = false
        } else {
          warnings.push({
            code: 'KEEPOUT_RAPID_COLLISION',
            message: `Rapid move passes through keepout zone: ${keepout.name}`,
            severity: 'high',
            location: collision,
            suggestion: 'Adjust safe height or reposition keepout',
          })
        }
      }
    }
  }

  return {
    check: {
      id: 'keepouts',
      name: 'Keepout Zones',
      description: 'Verify toolpath avoids defined keepout zones',
      passed,
      category: 'collision',
    },
    warnings,
    errors,
  }
}

function checkSegmentKeepoutCollision(
  segment: ToolpathSegment,
  keepout: Keepout,
  toolRadius: number,
): { x: number; y: number; z: number } | null {
  const steps = 10
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = segment.start.x + (segment.end.x - segment.start.x) * t
    const y = segment.start.y + (segment.end.y - segment.start.y) * t
    const z = segment.start.z + (segment.end.z - segment.start.z) * t

    if (z < keepout.height) {
      const expandedRadius = toolRadius + 2

      if (keepout.shape === 'rectangle') {
        const dims = keepout.dimensions as { width: number; height: number }
        const halfW = dims.width / 2 + expandedRadius
        const halfH = dims.height / 2 + expandedRadius
        
        if (Math.abs(x - keepout.position.x) < halfW && 
            Math.abs(y - keepout.position.y) < halfH) {
          return { x, y, z }
        }
      } else if (keepout.shape === 'circle') {
        const dims = keepout.dimensions as { radius: number }
        const dist = Math.sqrt(
          (x - keepout.position.x) ** 2 + 
          (y - keepout.position.y) ** 2
        )
        
        if (dist < dims.radius + expandedRadius) {
          return { x, y, z }
        }
      }
    }
  }

  return null
}

function checkRapidMoves(
  toolpath: GeneratedToolpath,
  setup: Setup,
): { check: SafetyCheck; warnings: SafetyWarning[]; errors: SafetyError[] } {
  const warnings: SafetyWarning[] = []
  const errors: SafetyError[] = []

  let passed = true
  const stockTop = 0
  const safeHeight = 5

  for (const segment of toolpath.segments) {
    if (segment.type === 'rapid') {
      if (segment.end.z < stockTop + safeHeight && segment.end.z > stockTop) {
        const dx = Math.abs(segment.end.x - segment.start.x)
        const dy = Math.abs(segment.end.y - segment.start.y)
        
        if (dx > 1 || dy > 1) {
          warnings.push({
            code: 'RAPID_NEAR_STOCK',
            message: 'Rapid move close to stock surface',
            severity: 'medium',
            location: { x: segment.end.x, y: segment.end.y, z: segment.end.z },
            suggestion: 'Consider increasing safe height',
          })
        }
      }

      if (segment.end.z < stockTop && segment.start.z < stockTop) {
        const dx = Math.abs(segment.end.x - segment.start.x)
        const dy = Math.abs(segment.end.y - segment.start.y)
        
        if (dx > 0.1 || dy > 0.1) {
          errors.push({
            code: 'RAPID_IN_MATERIAL',
            message: 'Rapid move while below stock surface',
            location: { x: segment.end.x, y: segment.end.y, z: segment.end.z },
            blocksExecution: true,
          })
          passed = false
        }
      }
    }
  }

  return {
    check: {
      id: 'rapid-moves',
      name: 'Rapid Moves',
      description: 'Verify rapid moves are safe',
      passed,
      category: 'general',
    },
    warnings,
    errors,
  }
}

export interface JobChecklist {
  items: JobChecklistItem[]
  allRequired: boolean
  completedCount: number
  totalCount: number
}

export interface JobChecklistItem {
  id: string
  label: string
  description?: string
  required: boolean
  checked: boolean
  category: 'safety' | 'setup' | 'tool' | 'workholding' | 'verification'
}

export function createDefaultChecklist(
  tool: Tool,
  setup: Setup,
): JobChecklist {
  const items: JobChecklistItem[] = [
    {
      id: 'spindle-off',
      label: 'Spindle is OFF',
      description: 'Verify spindle is not running before setup',
      required: true,
      checked: false,
      category: 'safety',
    },
    {
      id: 'estop-accessible',
      label: 'E-Stop is accessible',
      description: 'Emergency stop button is within reach',
      required: true,
      checked: false,
      category: 'safety',
    },
    {
      id: 'safety-glasses',
      label: 'Safety glasses on',
      description: 'Wearing appropriate eye protection',
      required: true,
      checked: false,
      category: 'safety',
    },
    {
      id: 'dust-collection',
      label: 'Dust collection running',
      description: 'Dust collection system is active',
      required: false,
      checked: false,
      category: 'safety',
    },
    {
      id: 'tool-installed',
      label: `Tool installed: ${tool.name}`,
      description: `${tool.geometry.diameter}mm ${tool.type}`,
      required: true,
      checked: false,
      category: 'tool',
    },
    {
      id: 'tool-tight',
      label: 'Collet/tool holder tight',
      description: 'Tool is securely held in spindle',
      required: true,
      checked: false,
      category: 'tool',
    },
    {
      id: 'tool-length',
      label: 'Tool length verified',
      description: 'Sufficient tool stickout for operation',
      required: true,
      checked: false,
      category: 'tool',
    },
    {
      id: 'stock-secured',
      label: 'Stock is secured',
      description: 'Workpiece is clamped or held firmly',
      required: true,
      checked: false,
      category: 'workholding',
    },
    {
      id: 'clamps-clear',
      label: 'Clamps clear of toolpath',
      description: 'No clamps in the cutting area',
      required: true,
      checked: false,
      category: 'workholding',
    },
    {
      id: 'wasteboard-ok',
      label: 'Wasteboard in place',
      description: 'Sacrificial surface ready if cutting through',
      required: false,
      checked: false,
      category: 'workholding',
    },
    {
      id: 'origin-set',
      label: 'Work origin set',
      description: 'XYZ zero position is correct',
      required: true,
      checked: false,
      category: 'setup',
    },
    {
      id: 'z-probed',
      label: 'Z height probed/set',
      description: 'Tool height is zeroed to stock surface',
      required: true,
      checked: false,
      category: 'setup',
    },
    {
      id: 'dry-run',
      label: 'Dry run completed',
      description: 'Ran toolpath with spindle off to verify',
      required: false,
      checked: false,
      category: 'verification',
    },
    {
      id: 'bounds-verified',
      label: 'Bounds verified',
      description: 'Toolpath stays within stock and machine limits',
      required: true,
      checked: false,
      category: 'verification',
    },
  ]

  return {
    items,
    allRequired: items.filter(i => i.required).every(i => i.checked),
    completedCount: items.filter(i => i.checked).length,
    totalCount: items.length,
  }
}

export function canStartJob(checklist: JobChecklist): { canStart: boolean; missingItems: string[] } {
  const missingItems = checklist.items
    .filter(item => item.required && !item.checked)
    .map(item => item.label)

  return {
    canStart: missingItems.length === 0,
    missingItems,
  }
}
