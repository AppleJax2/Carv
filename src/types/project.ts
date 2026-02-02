import type { DesignObject, Layer, Toolpath } from './design'
import type { MachineConfig, Tool, Material } from './machine'

export interface Project {
  id: string
  name: string
  version: number
  createdAt: Date
  modifiedAt: Date
  
  canvas: CanvasSettings
  layers: Layer[]
  objects: DesignObject[]
  
  setups: Setup[]
  
  defaultMaterial: MaterialReference
  notes: string
  
  metadata: ProjectMetadata
}

export interface ProjectMetadata {
  author?: string
  description?: string
  tags?: string[]
  thumbnail?: string
  estimatedTime?: number
  lastMachineProfile?: string
}

export interface CanvasSettings {
  width: number
  height: number
  unit: 'mm' | 'inch'
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  showRulers: boolean
  showOrigin: boolean
  backgroundColor: string
  gridColor: string
  majorGridColor: string
  majorGridInterval: number
}

export interface Setup {
  id: string
  name: string
  order: number
  enabled: boolean
  
  stock: StockDefinition
  workCoordinateSystem: WorkCoordinateSystem
  
  operations: Operation[]
  
  notes: string
}

export interface StockDefinition {
  type: 'rectangular' | 'cylindrical' | 'from-model'
  
  dimensions: {
    width: number
    height: number
    thickness: number
  }
  
  material: MaterialReference
  
  grainDirection?: 'x' | 'y' | 'none'
  
  offset: {
    top: number
    bottom: number
    sides: number
  }
  
  modelId?: string
}

export interface MaterialReference {
  id: string
  name: string
  thickness: number
}

export interface WorkCoordinateSystem {
  origin: OriginPosition
  
  customOrigin?: {
    x: number
    y: number
    z: number
  }
  
  zZeroPosition: 'top' | 'bottom' | 'wasteboard'
  
  probeSettings?: {
    useProbe: boolean
    probeType: 'touch-plate' | 'xyz-probe' | 'tool-setter'
    plateThickness: number
  }
}

export type OriginPosition = 
  | 'front-left'
  | 'front-right'
  | 'back-left'
  | 'back-right'
  | 'center'
  | 'custom'

export interface Operation {
  id: string
  name: string
  type: OperationType
  order: number
  enabled: boolean
  
  toolId: string
  
  sourceObjectIds: string[]
  boundaryObjectId?: string
  
  settings: OperationSettings
  
  toolpath?: GeneratedToolpath
  
  warnings: OperationWarning[]
  errors: OperationError[]
}

export type OperationType = 
  | 'profile'
  | 'pocket'
  | 'drill'
  | 'bore'
  | 'thread'
  | 'engrave'
  | 'vcarve'
  | 'facing'
  | '3d-rough'
  | '3d-finish'
  | '3d-pencil'
  | 'contour-3d'
  | 'trace'

export interface OperationSettings {
  cutDepth: number
  depthPerPass: number
  
  feedRate: number
  plungeRate: number
  retractRate: number
  
  spindleSpeed: number
  spindleDirection: 'cw' | 'ccw'
  
  coolant: 'off' | 'flood' | 'mist' | 'air'
  
  safeHeight: number
  retractHeight: number
  
  stockToLeave: number
  stockToLeaveZ: number
  
  useRamping: boolean
  rampSettings?: RampSettings
  
  useTabs: boolean
  tabSettings?: TabSettings
  
  useLeadInOut: boolean
  leadSettings?: LeadSettings
  
  profileSettings?: ProfileOperationSettings
  pocketSettings?: PocketOperationSettings
  drillSettings?: DrillOperationSettings
  vcarveSettings?: VCarveOperationSettings
  engraveSettings?: EngraveOperationSettings
  facingSettings?: FacingOperationSettings
  rough3dSettings?: Rough3DOperationSettings
  finish3dSettings?: Finish3DOperationSettings
}

export interface RampSettings {
  type: 'helix' | 'zigzag' | 'plunge' | 'profile'
  angle: number
  helixDiameter?: number
  clearanceHeight?: number
}

export interface TabSettings {
  enabled: boolean
  count: number
  width: number
  height: number
  useAutoPlacement: boolean
  positions?: { distance: number }[]
  triangular: boolean
}

export interface LeadSettings {
  leadInType: 'none' | 'arc' | 'tangent' | 'perpendicular' | 'helix'
  leadOutType: 'none' | 'arc' | 'tangent' | 'perpendicular'
  leadInRadius: number
  leadOutRadius: number
  leadInAngle: number
  leadOutAngle: number
}

export interface ProfileOperationSettings {
  cutSide: 'inside' | 'outside' | 'on'
  direction: 'climb' | 'conventional'
  
  multipleDepths: boolean
  
  compensation: 'computer' | 'controller' | 'none'
  
  cornerMode: 'sharp' | 'round' | 'chamfer'
  cornerRadius?: number
  
  separateLastPass: boolean
  lastPassAllowance: number
  
  orderOptimization: 'none' | 'minimize-rapids' | 'inside-first'
}

export interface PocketOperationSettings {
  strategy: 'offset' | 'raster' | 'spiral' | 'adaptive'
  direction: 'climb' | 'conventional'
  
  stepover: number
  stepoverType: 'percent' | 'absolute'
  
  startPoint: 'center' | 'corner' | 'outside'
  
  rasterAngle?: number
  
  islands: 'machine-around' | 'ignore' | 'start-from'
  
  restMachining: boolean
  previousToolDiameter?: number
  
  separateLastPass: boolean
  lastPassAllowance: number
}

export interface DrillOperationSettings {
  cycle: 'simple' | 'peck' | 'chip-break' | 'deep-peck' | 'tapping'
  
  peckDepth: number
  peckRetract: number
  
  dwellTime: number
  
  spotDrill: boolean
  spotDepth: number
  
  orderOptimization: 'none' | 'minimize-rapids' | 'nearest-neighbor'
}

export interface VCarveOperationSettings {
  maxDepth: number
  flatDepth?: number
  flatToolId?: string
  
  startDepth: number
  
  cornerAction: 'none' | 'sharp' | 'loop'
}

export interface EngraveOperationSettings {
  depth: number
  multiPass: boolean
  passCount: number
  
  followContour: boolean
}

export interface FacingOperationSettings {
  strategy: 'raster' | 'spiral' | 'offset'
  stepover: number
  
  boundaryMode: 'stock' | 'selection' | 'offset'
  boundaryOffset: number
  
  rasterAngle: number
  
  multipleDepths: boolean
}

export interface Rough3DOperationSettings {
  strategy: 'adaptive' | 'raster' | 'offset' | 'waterline' | 'morphed-spiral'
  
  stepover: number
  stepdown: number
  
  rasterAngle?: number
  
  boundaryMode: 'model' | 'stock' | 'selection'
  boundaryOffset: number
  
  stockToLeave: number
  stockToLeaveZ?: number
  
  restMachining: boolean
  previousToolDiameter?: number
  
  flatAreaDetection: boolean
  flatAreaToolId?: string
}

export interface Finish3DOperationSettings {
  strategy: 'raster' | 'spiral' | 'radial' | 'scallop' | 'pencil' | 'contour' | 'morphed-spiral'
  
  stepover: number
  stepoverType: 'percent' | 'absolute' | 'cusp-height'
  cuspHeight?: number
  
  rasterAngle?: number
  
  boundaryMode: 'model' | 'stock' | 'selection'
  boundaryOffset: number
  
  steepShallowSplit: boolean
  steepAngle?: number
  shallowStrategy?: string
}

export interface GeneratedToolpath {
  id: string
  generatedAt: Date
  
  segments: ToolpathSegment[]
  
  stats: ToolpathStats
  boundingBox: BoundingBox3D
}

export interface ToolpathSegment {
  type: 'rapid' | 'linear' | 'arc-cw' | 'arc-ccw' | 'helix'
  
  start: Point3D
  end: Point3D
  
  center?: Point3D
  radius?: number
  
  feedRate?: number
}

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface BoundingBox3D {
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
}

export interface ToolpathStats {
  totalDistance: number
  cuttingDistance: number
  rapidDistance: number
  
  estimatedTime: number
  
  plungeCount: number
  retractCount: number
  
  maxDepth: number
  passCount: number
}

export interface OperationWarning {
  code: string
  message: string
  severity: 'info' | 'warning'
  objectId?: string
  location?: Point3D
}

export interface OperationError {
  code: string
  message: string
  objectId?: string
  location?: Point3D
}

export interface Job {
  id: string
  name: string
  createdAt: Date
  
  projectId: string
  projectVersion: number
  
  setupIds: string[]
  operationIds: string[]
  
  machineProfileId: string
  postProcessorId: string
  
  gcodeFiles: GCodeFile[]
  
  checklist: JobChecklistItem[]
  
  runs: JobRun[]
}

export interface GCodeFile {
  id: string
  name: string
  content: string
  
  toolId: string
  setupId: string
  
  stats: ToolpathStats
  boundingBox: BoundingBox3D
}

export interface JobChecklistItem {
  id: string
  label: string
  required: boolean
  checked: boolean
  category: 'safety' | 'setup' | 'tool' | 'workholding' | 'verification'
}

export interface JobRun {
  id: string
  startedAt: Date
  completedAt?: Date
  
  status: 'completed' | 'paused' | 'stopped' | 'error' | 'in-progress'
  
  machineProfileId: string
  
  notes?: string
  
  errorMessage?: string
  errorLine?: number
}

export interface Keepout {
  id: string
  name: string
  type: 'clamp' | 'fixture' | 'obstacle' | 'custom'
  
  shape: 'rectangle' | 'circle' | 'polygon'
  
  position: { x: number; y: number }
  dimensions: { width: number; height: number } | { radius: number } | { points: { x: number; y: number }[] }
  
  height: number
  
  avoidRapids: boolean
  avoidCuts: boolean
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  width: 300,
  height: 300,
  unit: 'mm',
  gridSize: 10,
  snapToGrid: true,
  showGrid: true,
  showRulers: true,
  showOrigin: true,
  backgroundColor: '#1a1a2e',
  gridColor: '#1e3a5f',
  majorGridColor: '#2563eb',
  majorGridInterval: 5,
}

export const DEFAULT_STOCK: StockDefinition = {
  type: 'rectangular',
  dimensions: {
    width: 300,
    height: 300,
    thickness: 18,
  },
  material: {
    id: 'plywood',
    name: '3/4" Plywood',
    thickness: 18,
  },
  grainDirection: 'x',
  offset: {
    top: 0,
    bottom: 0,
    sides: 0,
  },
}

export const DEFAULT_WCS: WorkCoordinateSystem = {
  origin: 'front-left',
  zZeroPosition: 'top',
}

export function createDefaultSetup(name: string = 'Setup 1'): Setup {
  return {
    id: crypto.randomUUID(),
    name,
    order: 0,
    enabled: true,
    stock: { ...DEFAULT_STOCK },
    workCoordinateSystem: { ...DEFAULT_WCS },
    operations: [],
    notes: '',
  }
}

export function createDefaultProject(name: string): Project {
  return {
    id: crypto.randomUUID(),
    name,
    version: 1,
    createdAt: new Date(),
    modifiedAt: new Date(),
    canvas: { ...DEFAULT_CANVAS_SETTINGS },
    layers: [
      {
        id: 'default',
        name: 'Layer 1',
        visible: true,
        locked: false,
        color: '#3b82f6',
        order: 0,
      },
    ],
    objects: [],
    setups: [createDefaultSetup()],
    defaultMaterial: {
      id: 'plywood',
      name: '3/4" Plywood',
      thickness: 18,
    },
    notes: '',
    metadata: {},
  }
}

export const PROJECT_VERSION = 1

export function migrateProject(project: any): Project {
  let currentVersion = project.version || 0
  
  if (currentVersion < 1) {
    project.version = 1
    project.setups = project.setups || [createDefaultSetup()]
    project.metadata = project.metadata || {}
    project.canvas = {
      ...DEFAULT_CANVAS_SETTINGS,
      ...project.canvas,
    }
    
    if (project.toolpaths && project.toolpaths.length > 0) {
      const setup = project.setups[0]
      setup.operations = project.toolpaths.map((tp: Toolpath, idx: number) => ({
        id: tp.id,
        name: tp.name,
        type: tp.type,
        order: idx,
        enabled: tp.enabled,
        toolId: tp.toolId,
        sourceObjectIds: tp.sourceObjectIds,
        settings: {
          cutDepth: tp.settings.cutDepth,
          depthPerPass: tp.settings.depthPerPass,
          feedRate: tp.settings.feedRate,
          plungeRate: tp.settings.plungeRate,
          retractRate: tp.settings.plungeRate,
          spindleSpeed: tp.settings.spindleSpeed,
          spindleDirection: tp.settings.spindleDirection,
          coolant: 'off',
          safeHeight: tp.settings.safeHeight,
          retractHeight: tp.settings.safeHeight,
          stockToLeave: 0,
          stockToLeaveZ: 0,
          useRamping: false,
          useTabs: tp.settings.profileSettings?.tabs?.enabled || false,
          useLeadInOut: false,
        },
        warnings: [],
        errors: [],
      }))
      delete project.toolpaths
    }
  }
  
  return project as Project
}
