export interface MachineConfig {
  id: string
  name: string
  
  workspace: {
    width: number      // X axis travel (mm)
    depth: number      // Y axis travel (mm)
    height: number     // Z axis travel (mm)
    originPosition: 'front-left' | 'front-right' | 'back-left' | 'back-right' | 'center'
  }
  
  workArea: {
    x: number  // X travel (mm)
    y: number  // Y travel (mm)
    z: number  // Z travel (mm)
  }
  
  axes: {
    x: AxisConfig
    y: AxisConfig
    z: AxisConfig
    a?: AxisConfig  // Optional rotary
  }
  
  spindle: SpindleConfig
  
  homing: {
    enabled: boolean
    direction: {
      x: 'min' | 'max'
      y: 'min' | 'max'
      z: 'min' | 'max'
    }
    seekRate: number      // mm/min
    feedRate: number      // mm/min
    pullOff: number       // mm
    sequence: 'z-first' | 'xy-first' | 'all-together'
  }
  
  probe: {
    enabled: boolean
    type: 'touch-plate' | 'touch-probe' | 'none'
    plateThickness: number  // mm
    diameter: number        // mm (for touch probes)
    feedRate: number        // mm/min
    seekRate: number        // mm/min
    retract: number         // mm
  }
  
  limits: {
    softLimitsEnabled: boolean
    hardLimitsEnabled: boolean
  }
  
  rapids: {
    xy: number  // mm/min
    z: number   // mm/min
  }
  
  safeHeight: number  // Z safe travel height (mm)
  
  firmware: 'grbl' | 'grbl-hal' | 'marlin' | 'fluid-nc'
  
  postProcessor: PostProcessorConfig
}

export interface AxisConfig {
  stepsPerMm: number
  maxRate: number           // mm/min
  acceleration: number      // mm/sec²
  maxTravel: number         // mm
  invertDirection: boolean
  invertLimitSwitch: boolean
}

export interface SpindleConfig {
  type: 'pwm' | 'relay' | 'vfd' | 'manual'
  minRpm: number
  maxRpm: number
  pwmMinValue: number       // 0-255 or 0-1000 depending on firmware
  pwmMaxValue: number
  spindleDelayMs: number    // Time to wait for spindle to reach speed
  clockwise: 'M3' | 'M4'
}

export interface PostProcessorConfig {
  name: string
  fileExtension: string
  lineEnding: '\n' | '\r\n'
  
  programStart: string[]
  programEnd: string[]
  toolChangeStart: string[]
  toolChangeEnd: string[]
  
  useLineNumbers: boolean
  lineNumberIncrement: number
  
  arcSupport: boolean
  arcPlane: 'G17' | 'G18' | 'G19'
  
  decimalPlaces: number
  
  spindleSpeedInHeader: boolean
  coolantSupport: boolean
}

export interface Tool {
  id: string
  name: string
  type: ToolType
  
  geometry: {
    diameter: number        // mm
    fluteLength: number     // mm
    overallLength: number   // mm
    shankDiameter: number   // mm
    numberOfFlutes: number
    tipAngle?: number       // degrees (for V-bits, drills)
    cornerRadius?: number   // mm (for bull nose)
  }
  
  defaultFeedRate: number   // mm/min
  defaultPlungeRate: number // mm/min
  defaultSpindleSpeed: number // RPM
  defaultDepthPerPass: number // mm
  defaultStepover: number   // percentage (0-100)
  
  notes: string
}

export type ToolType = 
  | 'flat-end-mill'
  | 'ball-end-mill'
  | 'bull-nose'
  | 'v-bit'
  | 'engraving-bit'
  | 'drill'
  | 'chamfer'
  | 'face-mill'
  | 'custom'

export interface Material {
  id: string
  name: string
  category: 'wood' | 'plastic' | 'metal' | 'composite' | 'foam' | 'other'
  
  defaultThickness: number  // mm
  
  feedRateMultiplier: number      // 1.0 = 100%
  plungeRateMultiplier: number
  spindleSpeedMultiplier: number
  depthPerPassMultiplier: number
  
  notes: string
}

export const DEFAULT_MACHINE_PRESETS: Partial<MachineConfig>[] = [
  {
    name: 'Shapeoko 4 Standard',
    workspace: { width: 425, depth: 425, height: 95, originPosition: 'front-left' },
    firmware: 'grbl',
    rapids: { xy: 10000, z: 5000 },
    safeHeight: 15,
  },
  {
    name: 'X-Carve 1000mm',
    workspace: { width: 750, depth: 750, height: 65, originPosition: 'front-left' },
    firmware: 'grbl',
    rapids: { xy: 8000, z: 2000 },
    safeHeight: 10,
  },
  {
    name: 'Onefinity Woodworker',
    workspace: { width: 816, depth: 816, height: 133, originPosition: 'front-left' },
    firmware: 'grbl',
    rapids: { xy: 10000, z: 3000 },
    safeHeight: 15,
  },
  {
    name: 'MPCNC Primo',
    workspace: { width: 600, depth: 600, height: 80, originPosition: 'front-left' },
    firmware: 'marlin',
    rapids: { xy: 3000, z: 1500 },
    safeHeight: 10,
  },
  {
    name: 'Custom Machine',
    workspace: { width: 300, depth: 300, height: 100, originPosition: 'front-left' },
    firmware: 'grbl',
    rapids: { xy: 5000, z: 2000 },
    safeHeight: 10,
  },
]

export const DEFAULT_TOOLS: Tool[] = [
  {
    id: 'flat-6mm',
    name: '6mm Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 6,
      fluteLength: 22,
      overallLength: 50,
      shankDiameter: 6,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1500,
    defaultPlungeRate: 500,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 2,
    defaultStepover: 40,
    notes: 'General purpose wood/plastic',
  },
  {
    id: 'flat-3mm',
    name: '3mm Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 3,
      fluteLength: 12,
      overallLength: 38,
      shankDiameter: 3,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 300,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 1,
    defaultStepover: 40,
    notes: 'Detail work',
  },
  {
    id: 'vbit-60',
    name: '60° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 6,
      fluteLength: 10,
      overallLength: 40,
      shankDiameter: 6,
      numberOfFlutes: 2,
      tipAngle: 60,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1,
    defaultStepover: 30,
    notes: 'V-carving, chamfering',
  },
  {
    id: 'vbit-90',
    name: '90° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 12,
      fluteLength: 15,
      overallLength: 45,
      shankDiameter: 6,
      numberOfFlutes: 2,
      tipAngle: 90,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 30,
    notes: 'V-carving, lettering',
  },
  {
    id: 'ball-6mm',
    name: '6mm Ball End Mill',
    type: 'ball-end-mill',
    geometry: {
      diameter: 6,
      fluteLength: 22,
      overallLength: 50,
      shankDiameter: 6,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 15,
    notes: '3D finishing, contours',
  },
]

export const DEFAULT_MATERIALS: Material[] = [
  {
    id: 'softwood',
    name: 'Softwood (Pine, Cedar)',
    category: 'wood',
    defaultThickness: 19,
    feedRateMultiplier: 1.2,
    plungeRateMultiplier: 1.0,
    spindleSpeedMultiplier: 1.0,
    depthPerPassMultiplier: 1.2,
    notes: 'Easy to cut, watch for tear-out',
  },
  {
    id: 'hardwood',
    name: 'Hardwood (Oak, Maple)',
    category: 'wood',
    defaultThickness: 19,
    feedRateMultiplier: 0.7,
    plungeRateMultiplier: 0.6,
    spindleSpeedMultiplier: 1.0,
    depthPerPassMultiplier: 0.6,
    notes: 'Slower feeds, shallower passes',
  },
  {
    id: 'plywood',
    name: 'Plywood / MDF',
    category: 'wood',
    defaultThickness: 18,
    feedRateMultiplier: 1.0,
    plungeRateMultiplier: 0.8,
    spindleSpeedMultiplier: 1.0,
    depthPerPassMultiplier: 1.0,
    notes: 'Dusty, use dust collection',
  },
  {
    id: 'acrylic',
    name: 'Acrylic',
    category: 'plastic',
    defaultThickness: 6,
    feedRateMultiplier: 0.8,
    plungeRateMultiplier: 0.5,
    spindleSpeedMultiplier: 0.8,
    depthPerPassMultiplier: 0.5,
    notes: 'Single flute preferred, avoid melting',
  },
  {
    id: 'hdpe',
    name: 'HDPE / UHMW',
    category: 'plastic',
    defaultThickness: 12,
    feedRateMultiplier: 1.0,
    plungeRateMultiplier: 0.7,
    spindleSpeedMultiplier: 0.7,
    depthPerPassMultiplier: 0.8,
    notes: 'Gummy, use sharp tools',
  },
  {
    id: 'aluminum',
    name: 'Aluminum 6061',
    category: 'metal',
    defaultThickness: 6,
    feedRateMultiplier: 0.3,
    plungeRateMultiplier: 0.2,
    spindleSpeedMultiplier: 1.2,
    depthPerPassMultiplier: 0.2,
    notes: 'Use cutting fluid, single flute',
  },
  {
    id: 'foam',
    name: 'Foam (EVA, XPS)',
    category: 'foam',
    defaultThickness: 25,
    feedRateMultiplier: 2.0,
    plungeRateMultiplier: 1.5,
    spindleSpeedMultiplier: 0.6,
    depthPerPassMultiplier: 3.0,
    notes: 'Very fast, low RPM to avoid melting',
  },
]
