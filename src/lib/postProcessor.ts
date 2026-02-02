import type { GeneratedToolpath, ToolpathSegment, OperationSettings } from '@/types/project'
import type { Tool, MachineConfig } from '@/types/machine'

export interface PostProcessorConfig {
  id: string
  name: string
  description: string
  controller: 'grbl' | 'grbl-hal' | 'marlin' | 'mach3' | 'linuxcnc' | 'uccnc' | 'custom'
  
  units: 'mm' | 'inch'
  
  programStart: string[]
  programEnd: string[]
  toolChangeStart: string[]
  toolChangeEnd: string[]
  
  useLineNumbers: boolean
  lineNumberIncrement: number
  lineNumberStart: number
  
  decimalPlaces: number
  
  arcSupport: boolean
  arcPlane: 'XY' | 'XZ' | 'YZ'
  maxArcRadius: number
  
  rapidFeedRate?: number
  
  spindleStartDelay: number
  
  coolantCodes: {
    flood: string
    mist: string
    air: string
    off: string
  }
  
  safetyHeight: number
  
  modalGroups: boolean
  
  commentStyle: 'parentheses' | 'semicolon' | 'none'
  
  customMacros: Record<string, string>
}

export const PRESET_POST_PROCESSORS: Record<string, PostProcessorConfig> = {
  'grbl-1.1': {
    id: 'grbl-1.1',
    name: 'GRBL 1.1',
    description: 'Standard GRBL 1.1 controller',
    controller: 'grbl',
    units: 'mm',
    programStart: ['G21', 'G90', 'G17'],
    programEnd: ['M5', 'G0 Z10', 'G0 X0 Y0', 'M30'],
    toolChangeStart: ['M5', 'G0 Z25'],
    toolChangeEnd: [],
    useLineNumbers: false,
    lineNumberIncrement: 10,
    lineNumberStart: 10,
    decimalPlaces: 3,
    arcSupport: true,
    arcPlane: 'XY',
    maxArcRadius: 1000,
    spindleStartDelay: 3,
    coolantCodes: { flood: 'M8', mist: 'M7', air: '', off: 'M9' },
    safetyHeight: 10,
    modalGroups: true,
    commentStyle: 'semicolon',
    customMacros: {},
  },
  'grbl-hal': {
    id: 'grbl-hal',
    name: 'grblHAL',
    description: 'grblHAL controller with extended features',
    controller: 'grbl-hal',
    units: 'mm',
    programStart: ['G21', 'G90', 'G17', 'G54'],
    programEnd: ['M5', 'M9', 'G0 Z25', 'G0 X0 Y0', 'M30'],
    toolChangeStart: ['M5', 'M9', 'G0 Z50', 'M0 ; Tool change'],
    toolChangeEnd: ['G43 H1'],
    useLineNumbers: false,
    lineNumberIncrement: 10,
    lineNumberStart: 10,
    decimalPlaces: 4,
    arcSupport: true,
    arcPlane: 'XY',
    maxArcRadius: 2000,
    spindleStartDelay: 5,
    coolantCodes: { flood: 'M8', mist: 'M7', air: 'M7', off: 'M9' },
    safetyHeight: 25,
    modalGroups: true,
    commentStyle: 'semicolon',
    customMacros: {
      'probe-z': 'G38.2 Z-25 F100',
      'set-wcs': 'G10 L20 P1 Z0',
    },
  },
  'marlin': {
    id: 'marlin',
    name: 'Marlin',
    description: 'Marlin firmware for 3D printer/CNC hybrids',
    controller: 'marlin',
    units: 'mm',
    programStart: ['G21', 'G90', 'M82'],
    programEnd: ['M5', 'G0 Z10', 'G0 X0 Y0', 'M84'],
    toolChangeStart: ['M5', 'G0 Z25'],
    toolChangeEnd: [],
    useLineNumbers: false,
    lineNumberIncrement: 1,
    lineNumberStart: 1,
    decimalPlaces: 3,
    arcSupport: true,
    arcPlane: 'XY',
    maxArcRadius: 500,
    spindleStartDelay: 2,
    coolantCodes: { flood: '', mist: '', air: '', off: '' },
    safetyHeight: 10,
    modalGroups: true,
    commentStyle: 'semicolon',
    customMacros: {},
  },
  'linuxcnc': {
    id: 'linuxcnc',
    name: 'LinuxCNC',
    description: 'LinuxCNC/EMC2 controller',
    controller: 'linuxcnc',
    units: 'mm',
    programStart: ['%', 'O1000', 'G21', 'G90', 'G17', 'G40', 'G49', 'G54'],
    programEnd: ['M5', 'M9', 'G0 Z50', 'G0 X0 Y0', 'M30', '%'],
    toolChangeStart: ['M5', 'M9', 'G0 Z50', 'M6 T1'],
    toolChangeEnd: ['G43 H1'],
    useLineNumbers: true,
    lineNumberIncrement: 10,
    lineNumberStart: 10,
    decimalPlaces: 4,
    arcSupport: true,
    arcPlane: 'XY',
    maxArcRadius: 5000,
    spindleStartDelay: 5,
    coolantCodes: { flood: 'M8', mist: 'M7', air: 'M7', off: 'M9' },
    safetyHeight: 50,
    modalGroups: true,
    commentStyle: 'parentheses',
    customMacros: {},
  },
  'mach3': {
    id: 'mach3',
    name: 'Mach3/Mach4',
    description: 'Mach3 and Mach4 controllers',
    controller: 'mach3',
    units: 'mm',
    programStart: ['G21', 'G90', 'G17', 'G40', 'G49', 'G54'],
    programEnd: ['M5', 'M9', 'G0 Z25', 'G0 X0 Y0', 'M30'],
    toolChangeStart: ['M5', 'M9', 'G0 Z50', 'M6 T1'],
    toolChangeEnd: ['G43 H1'],
    useLineNumbers: true,
    lineNumberIncrement: 10,
    lineNumberStart: 10,
    decimalPlaces: 4,
    arcSupport: true,
    arcPlane: 'XY',
    maxArcRadius: 5000,
    spindleStartDelay: 5,
    coolantCodes: { flood: 'M8', mist: 'M7', air: '', off: 'M9' },
    safetyHeight: 25,
    modalGroups: true,
    commentStyle: 'parentheses',
    customMacros: {},
  },
}

export class PostProcessor {
  private config: PostProcessorConfig
  private lineNumber: number
  private lines: string[] = []
  private lastX?: number
  private lastY?: number
  private lastZ?: number
  private lastF?: number

  constructor(config: PostProcessorConfig) {
    this.config = config
    this.lineNumber = config.lineNumberStart
  }

  process(
    toolpath: GeneratedToolpath,
    tool: Tool,
    settings: OperationSettings,
    machineConfig: MachineConfig,
  ): string {
    this.lines = []
    this.lineNumber = this.config.lineNumberStart
    this.lastX = undefined
    this.lastY = undefined
    this.lastZ = undefined
    this.lastF = undefined

    this.addComment(`Generated by Carv`)
    this.addComment(`Tool: ${tool.name} (${tool.geometry.diameter}mm)`)
    this.addComment(`Operation: ${settings.cutDepth}mm depth, ${settings.feedRate}mm/min`)
    this.addBlankLine()

    for (const line of this.config.programStart) {
      this.addLine(line)
    }
    this.addBlankLine()

    this.addLine(`M3 S${settings.spindleSpeed}`)
    if (this.config.spindleStartDelay > 0) {
      this.addLine(`G4 P${this.config.spindleStartDelay}`)
    }
    this.addBlankLine()

    if (settings.coolant && settings.coolant !== 'off') {
      const coolantCode = this.config.coolantCodes[settings.coolant]
      if (coolantCode) {
        this.addLine(coolantCode)
      }
    }

    this.addLine(`G0 Z${this.formatNumber(this.config.safetyHeight)}`)
    this.addBlankLine()

    for (const segment of toolpath.segments) {
      this.processSegment(segment, settings)
    }

    this.addBlankLine()
    for (const line of this.config.programEnd) {
      this.addLine(line)
    }

    return this.lines.join('\n')
  }

  private processSegment(segment: ToolpathSegment, settings: OperationSettings): void {
    const x = this.formatNumber(segment.end.x)
    const y = this.formatNumber(segment.end.y)
    const z = this.formatNumber(segment.end.z)

    if (segment.type === 'rapid') {
      let code = 'G0'
      
      if (!this.config.modalGroups || this.lastX !== segment.end.x) {
        code += ` X${x}`
      }
      if (!this.config.modalGroups || this.lastY !== segment.end.y) {
        code += ` Y${y}`
      }
      if (!this.config.modalGroups || this.lastZ !== segment.end.z) {
        code += ` Z${z}`
      }
      
      if (code !== 'G0') {
        this.addLine(code)
      }
    } else if (segment.type === 'linear') {
      let code = 'G1'
      const feedRate = segment.feedRate || settings.feedRate
      
      if (!this.config.modalGroups || this.lastX !== segment.end.x) {
        code += ` X${x}`
      }
      if (!this.config.modalGroups || this.lastY !== segment.end.y) {
        code += ` Y${y}`
      }
      if (!this.config.modalGroups || this.lastZ !== segment.end.z) {
        code += ` Z${z}`
      }
      if (!this.config.modalGroups || this.lastF !== feedRate) {
        code += ` F${feedRate.toFixed(0)}`
        this.lastF = feedRate
      }
      
      if (code !== 'G1') {
        this.addLine(code)
      }
    } else if (segment.type === 'arc-cw' || segment.type === 'arc-ccw') {
      if (!this.config.arcSupport) {
        this.linearizeArc(segment, settings)
        return
      }

      const gCode = segment.type === 'arc-cw' ? 'G2' : 'G3'
      const i = this.formatNumber(segment.center!.x - segment.start.x)
      const j = this.formatNumber(segment.center!.y - segment.start.y)
      const feedRate = segment.feedRate || settings.feedRate
      
      let code = `${gCode} X${x} Y${y}`
      
      if (segment.end.z !== segment.start.z) {
        code += ` Z${z}`
      }
      
      code += ` I${i} J${j}`
      
      if (!this.config.modalGroups || this.lastF !== feedRate) {
        code += ` F${feedRate.toFixed(0)}`
        this.lastF = feedRate
      }
      
      this.addLine(code)
    } else if (segment.type === 'helix') {
      if (!this.config.arcSupport) {
        this.linearizeArc(segment, settings)
        return
      }

      const i = this.formatNumber(segment.center!.x - segment.start.x)
      const j = this.formatNumber(segment.center!.y - segment.start.y)
      const feedRate = segment.feedRate || settings.feedRate
      
      this.addLine(`G2 X${x} Y${y} Z${z} I${i} J${j} F${feedRate.toFixed(0)}`)
    }

    this.lastX = segment.end.x
    this.lastY = segment.end.y
    this.lastZ = segment.end.z
  }

  private linearizeArc(segment: ToolpathSegment, settings: OperationSettings): void {
    const center = segment.center!
    const startAngle = Math.atan2(segment.start.y - center.y, segment.start.x - center.x)
    const endAngle = Math.atan2(segment.end.y - center.y, segment.end.x - center.x)
    const radius = segment.radius || Math.sqrt(
      (segment.start.x - center.x) ** 2 + (segment.start.y - center.y) ** 2
    )
    
    let angleDiff = endAngle - startAngle
    if (segment.type === 'arc-cw' && angleDiff > 0) angleDiff -= 2 * Math.PI
    if (segment.type === 'arc-ccw' && angleDiff < 0) angleDiff += 2 * Math.PI
    
    const segments = Math.max(4, Math.ceil(Math.abs(angleDiff) / (Math.PI / 16)))
    const zStep = (segment.end.z - segment.start.z) / segments
    
    for (let i = 1; i <= segments; i++) {
      const t = i / segments
      const angle = startAngle + angleDiff * t
      const x = center.x + Math.cos(angle) * radius
      const y = center.y + Math.sin(angle) * radius
      const z = segment.start.z + zStep * i
      
      const feedRate = segment.feedRate || settings.feedRate
      this.addLine(`G1 X${this.formatNumber(x)} Y${this.formatNumber(y)} Z${this.formatNumber(z)} F${feedRate.toFixed(0)}`)
    }
  }

  private addLine(code: string): void {
    if (this.config.useLineNumbers) {
      this.lines.push(`N${this.lineNumber} ${code}`)
      this.lineNumber += this.config.lineNumberIncrement
    } else {
      this.lines.push(code)
    }
  }

  private addComment(text: string): void {
    switch (this.config.commentStyle) {
      case 'parentheses':
        this.addLine(`(${text})`)
        break
      case 'semicolon':
        this.addLine(`; ${text}`)
        break
      case 'none':
        break
    }
  }

  private addBlankLine(): void {
    this.lines.push('')
  }

  private formatNumber(value: number): string {
    return value.toFixed(this.config.decimalPlaces)
  }

  generateToolChange(
    newTool: Tool,
    toolNumber: number,
  ): string {
    const lines: string[] = []
    
    for (const line of this.config.toolChangeStart) {
      lines.push(line.replace('T1', `T${toolNumber}`))
    }
    
    lines.push(`; Tool: ${newTool.name}`)
    lines.push(`; Diameter: ${newTool.geometry.diameter}mm`)
    
    for (const line of this.config.toolChangeEnd) {
      lines.push(line.replace('H1', `H${toolNumber}`))
    }
    
    return lines.join('\n')
  }
}

export function createPostProcessor(configId: string): PostProcessor {
  const config = PRESET_POST_PROCESSORS[configId] || PRESET_POST_PROCESSORS['grbl-1.1']
  return new PostProcessor(config)
}

export function validateGcode(gcode: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const lines = gcode.split('\n')
  
  let hasSpindleStart = false
  let hasSpindleStop = false
  let hasProgramEnd = false
  let currentZ = 0
  let minZ = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const lineNum = i + 1
    
    if (!line || line.startsWith(';') || line.startsWith('(')) continue
    
    if (line.includes('M3') || line.includes('M03')) hasSpindleStart = true
    if (line.includes('M5') || line.includes('M05')) hasSpindleStop = true
    if (line.includes('M30') || line.includes('M2') || line.includes('M02')) hasProgramEnd = true
    
    const zMatch = line.match(/Z(-?\d+\.?\d*)/i)
    if (zMatch) {
      currentZ = parseFloat(zMatch[1])
      minZ = Math.min(minZ, currentZ)
    }
    
    if (line.match(/G0[^0-9]/) && !line.includes('Z') && currentZ < 0) {
      warnings.push(`Line ${lineNum}: Rapid move while below Z0`)
    }
    
    if (line.match(/G[23]/) && !line.match(/[IJ]/)) {
      errors.push(`Line ${lineNum}: Arc command missing I/J parameters`)
    }
    
    if (line.match(/G1[^0-9]/) && !line.match(/F\d/)) {
      warnings.push(`Line ${lineNum}: Feed move without explicit feed rate`)
    }
  }
  
  if (!hasSpindleStart) {
    warnings.push('No spindle start command (M3) found')
  }
  if (!hasSpindleStop) {
    warnings.push('No spindle stop command (M5) found')
  }
  if (!hasProgramEnd) {
    warnings.push('No program end command (M30/M2) found')
  }
  
  if (minZ < -100) {
    warnings.push(`Deep cut detected: ${minZ}mm - verify this is intentional`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

export function estimateJobTime(gcode: string, rapidFeedRate: number = 5000): number {
  const lines = gcode.split('\n')
  let totalTime = 0
  let currentX = 0, currentY = 0, currentZ = 0
  let currentFeedRate = 1000
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('(')) continue
    
    const xMatch = trimmed.match(/X(-?\d+\.?\d*)/i)
    const yMatch = trimmed.match(/Y(-?\d+\.?\d*)/i)
    const zMatch = trimmed.match(/Z(-?\d+\.?\d*)/i)
    const fMatch = trimmed.match(/F(\d+\.?\d*)/i)
    
    const newX = xMatch ? parseFloat(xMatch[1]) : currentX
    const newY = yMatch ? parseFloat(yMatch[1]) : currentY
    const newZ = zMatch ? parseFloat(zMatch[1]) : currentZ
    
    if (fMatch) {
      currentFeedRate = parseFloat(fMatch[1])
    }
    
    const distance = Math.sqrt(
      (newX - currentX) ** 2 + 
      (newY - currentY) ** 2 + 
      (newZ - currentZ) ** 2
    )
    
    const isRapid = trimmed.match(/G0[^0-9]/)
    const feedRate = isRapid ? rapidFeedRate : currentFeedRate
    
    if (distance > 0 && feedRate > 0) {
      totalTime += distance / feedRate
    }
    
    if (trimmed.match(/G4\s*P(\d+\.?\d*)/i)) {
      const dwellMatch = trimmed.match(/G4\s*P(\d+\.?\d*)/i)
      if (dwellMatch) {
        totalTime += parseFloat(dwellMatch[1])
      }
    }
    
    currentX = newX
    currentY = newY
    currentZ = newZ
  }
  
  return totalTime * 60
}

export function splitGcodeByTool(gcode: string): Map<number, string> {
  const toolSections = new Map<number, string>()
  const lines = gcode.split('\n')
  
  let currentTool = 1
  let currentSection: string[] = []
  let header: string[] = []
  let inHeader = true
  
  for (const line of lines) {
    const toolMatch = line.match(/T(\d+)/i)
    
    if (toolMatch) {
      if (currentSection.length > 0) {
        toolSections.set(currentTool, [...header, ...currentSection].join('\n'))
      }
      currentTool = parseInt(toolMatch[1])
      currentSection = [line]
      inHeader = false
    } else if (inHeader && (line.match(/^[GMN]/) || line.trim() === '')) {
      header.push(line)
    } else {
      currentSection.push(line)
      inHeader = false
    }
  }
  
  if (currentSection.length > 0) {
    toolSections.set(currentTool, [...header, ...currentSection].join('\n'))
  }
  
  return toolSections
}
