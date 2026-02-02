export interface Project {
  id: string
  name: string
  createdAt: Date
  modifiedAt: Date
  
  canvas: CanvasSettings
  layers: Layer[]
  objects: DesignObject[]
  toolpaths: Toolpath[]
  
  material: {
    id: string
    thickness: number
  }
  
  notes: string
}

export interface CanvasSettings {
  width: number
  height: number
  unit: 'mm' | 'inch'
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  backgroundColor: string
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  color: string
  order: number
}

export type DesignObject = 
  | VectorPath
  | VectorShape
  | TextObject
  | ImageObject
  | Model3D

export interface BaseObject {
  id: string
  layerId: string
  name: string
  visible: boolean
  locked: boolean
  selected: boolean
  
  transform: Transform2D
  style: ObjectStyle
}

export interface Transform2D {
  x: number
  y: number
  rotation: number  // degrees
  scaleX: number
  scaleY: number
}

export interface ObjectStyle {
  fillColor: string | null
  fillOpacity: number
  strokeColor: string | null
  strokeWidth: number
  strokeOpacity: number
}

export interface VectorPath extends BaseObject {
  type: 'path'
  points: PathPoint[]
  closed: boolean
}

export interface PathPoint {
  x: number
  y: number
  type: 'move' | 'line' | 'curve'
  handleIn?: { x: number; y: number }
  handleOut?: { x: number; y: number }
}

export interface VectorShape extends BaseObject {
  type: 'shape'
  shapeType: ShapeType
  params: ShapeParams
}

export type ShapeType = 
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'star'
  | 'line'
  | 'arc'

export type ShapeParams = 
  | RectangleParams
  | EllipseParams
  | PolygonParams
  | StarParams
  | LineParams
  | ArcParams

export interface RectangleParams {
  width: number
  height: number
  cornerRadius: number
}

export interface EllipseParams {
  radiusX: number
  radiusY: number
}

export interface PolygonParams {
  sides: number
  radius: number
}

export interface StarParams {
  points: number
  outerRadius: number
  innerRadius: number
}

export interface LineParams {
  x2: number
  y2: number
}

export interface ArcParams {
  radius: number
  startAngle: number
  endAngle: number
}

export interface TextObject extends BaseObject {
  type: 'text'
  content: string
  fontFamily: string
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  letterSpacing: number
  lineHeight: number
  
  convertedToPath: boolean
  pathData?: PathPoint[][]
}

export interface ImageObject extends BaseObject {
  type: 'image'
  src: string  // base64 or file path
  originalWidth: number
  originalHeight: number
  width: number
  height: number
  
  traceSettings?: ImageTraceSettings
  tracedPaths?: PathPoint[][]
}

export interface ImageTraceSettings {
  mode: 'centerline' | 'outline' | 'color'
  threshold: number
  smoothing: number
  simplification: number
  minPathLength: number
}

export interface Model3D extends BaseObject {
  type: 'model3d'
  modelType: '3d-import' | 'heightmap' | '3d-text' | 'relief'
  
  meshData?: {
    vertices: Float32Array
    normals: Float32Array
    indices: Uint32Array
    boundingBox: { min: [number, number, number]; max: [number, number, number] }
  }
  
  heightmapSettings?: HeightmapSettings
  reliefSettings?: ReliefSettings
  
  width: number
  height: number
  depth: number  // Z height
}

export interface HeightmapSettings {
  imageSrc: string
  minHeight: number
  maxHeight: number
  invert: boolean
  smoothing: number
  baseHeight: number
}

export interface ReliefSettings {
  sourceImageSrc: string
  depth: number
  angle: number
  smoothing: number
  baseHeight: number
  clipToShape: boolean
}

export interface Toolpath {
  id: string
  name: string
  type: ToolpathType
  enabled: boolean
  order: number
  
  sourceObjectIds: string[]
  toolId: string
  
  settings: ToolpathSettings
  
  generatedGcode?: string[]
  estimatedTime?: number  // ms
  
  preview?: {
    paths: ToolpathPreviewPath[]
    boundingBox: { minX: number; minY: number; maxX: number; maxY: number; minZ: number; maxZ: number }
  }
}

export type ToolpathType =
  | 'profile'      // Cut along path (inside/outside/on)
  | 'pocket'       // Clear area inside path
  | 'drill'        // Drill holes at points
  | 'vcarve'       // V-carving
  | 'engrave'      // Follow path at fixed depth
  | '3d-rough'     // 3D roughing
  | '3d-finish'    // 3D finishing
  | 'facing'       // Face/surface entire area

export interface ToolpathSettings {
  cutDepth: number          // Total depth
  depthPerPass: number      // Depth per pass
  
  feedRate: number          // mm/min
  plungeRate: number        // mm/min
  spindleSpeed: number      // RPM
  spindleDirection: 'cw' | 'ccw'
  
  safeHeight: number        // Z safe travel
  
  profileSettings?: ProfileSettings
  pocketSettings?: PocketSettings
  drillSettings?: DrillSettings
  vcarveSettings?: VCarveSettings
  engraveSettings?: EngraveSettings
  rough3dSettings?: Rough3DSettings
  finish3dSettings?: Finish3DSettings
}

export interface ProfileSettings {
  cutSide: 'inside' | 'outside' | 'on'
  direction: 'climb' | 'conventional'
  
  leadIn: {
    enabled: boolean
    type: 'arc' | 'tangent' | 'perpendicular'
    length: number
  }
  
  leadOut: {
    enabled: boolean
    type: 'arc' | 'tangent' | 'perpendicular'
    length: number
  }
  
  tabs: {
    enabled: boolean
    count: number
    width: number
    height: number
    useAutoPlacement: boolean
  }
  
  ramp: {
    enabled: boolean
    type: 'helix' | 'zigzag' | 'plunge'
    angle: number
  }
  
  allowance: number  // Stock to leave
  separateFinalPass: boolean
  finalPassAllowance: number
}

export interface PocketSettings {
  direction: 'climb' | 'conventional'
  stepover: number  // percentage
  
  strategy: 'offset' | 'raster' | 'spiral'
  rasterAngle?: number
  
  startPoint: 'center' | 'corner'
  
  ramp: {
    enabled: boolean
    type: 'helix' | 'zigzag' | 'plunge'
    angle: number
  }
  
  allowance: number
  separateFinalPass: boolean
  finalPassAllowance: number
  
  restMachining: {
    enabled: boolean
    previousToolDiameter: number
  }
}

export interface DrillSettings {
  drillCycle: 'simple' | 'peck' | 'chip-break'
  peckDepth?: number
  retractHeight?: number
  dwellTime?: number  // ms
}

export interface VCarveSettings {
  flatDepth?: number  // Max depth for flat bottom
  flatToolId?: string // Tool for flat areas
  
  startDepth: number
  
  allowance: number
}

export interface EngraveSettings {
  depth: number
  multiPass: boolean
}

export interface Rough3DSettings {
  strategy: 'raster' | 'offset' | 'waterline'
  stepover: number
  rasterAngle?: number
  
  stockToLeave: number
  stockToLeaveZ: number
  
  boundaryMode: 'model' | 'stock' | 'selection'
  boundaryOffset: number
}

export interface Finish3DSettings {
  strategy: 'raster' | 'spiral' | 'radial' | 'scallop' | 'pencil'
  stepover: number
  rasterAngle?: number
  
  boundaryMode: 'model' | 'stock' | 'selection'
  boundaryOffset: number
  
  cuspHeight?: number  // Alternative to stepover
}

export interface ToolpathPreviewPath {
  type: 'rapid' | 'feed' | 'plunge' | 'retract'
  points: { x: number; y: number; z: number }[]
}

export type HistoryAction = {
  type: string
  timestamp: number
  data: unknown
  undo: () => void
  redo: () => void
}
