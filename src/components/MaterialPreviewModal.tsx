import { useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, ContactShadows, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useDesignStore } from '@/store/useDesignStore'
import { Button } from './ui/button'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { formatDimension } from '@/lib/utils'
import {
  X,
  Eye,
  EyeOff,
  Layers,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Box,
  Loader2,
} from 'lucide-react'
import type { DesignObject } from '@/types/design'

// ============================================================================
// Types
// ============================================================================

interface MaterialPreviewModalProps {
  onClose: () => void
  onProceedToManufacture: () => void
}

interface PreviewToolpath {
  id: string
  type: 'profile' | 'pocket' | 'engrave' | 'vcarve'
  objectIds: string[]
  toolId: string
  depth: number
  paths: THREE.Vector3[][]
}

interface PreviewWarning {
  type: 'info' | 'warning' | 'error'
  message: string
}

// ============================================================================
// Material Block Component (Three.js)
// ============================================================================

function MaterialBlock({
  width,
  height,
  thickness,
  color,
  toolpaths,
  showToolpaths,
  objects,
}: {
  width: number
  height: number
  thickness: number
  color: string
  toolpaths: PreviewToolpath[]
  showToolpaths: boolean
  objects: DesignObject[]
}) {
  const materialGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(width, height, thickness)
    geo.translate(width / 2, height / 2, thickness / 2)
    return geo
  }, [width, height, thickness])

  const woodTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    
    // Base color
    ctx.fillStyle = color
    ctx.fillRect(0, 0, 512, 512)
    
    // Wood grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i < 50; i++) {
      const y = Math.random() * 512
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(
        128, y + (Math.random() - 0.5) * 20,
        384, y + (Math.random() - 0.5) * 20,
        512, y + (Math.random() - 0.5) * 10
      )
      ctx.stroke()
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(width / 100, height / 100)
    return texture
  }, [color, width, height])

  // Generate carved geometry from design objects
  const carvedMesh = useMemo(() => {
    if (objects.length === 0) return null

    const group = new THREE.Group()

    objects.forEach(obj => {
      // Find matching toolpath for this object
      const toolpath = toolpaths.find(tp => tp.objectIds.includes(obj.id))
      const carveDepth = toolpath?.depth || 3

      let shape: THREE.Shape | null = null
      let objWidth = 0
      let objHeight = 0

      if (obj.type === 'shape') {
        // VectorShape - check shapeType
        const shapeObj = obj
        if (shapeObj.shapeType === 'rectangle') {
          const params = shapeObj.params as { width: number; height: number; cornerRadius: number }
          objWidth = params.width * obj.transform.scaleX
          objHeight = params.height * obj.transform.scaleY
          shape = new THREE.Shape()
          shape.moveTo(0, 0)
          shape.lineTo(objWidth, 0)
          shape.lineTo(objWidth, objHeight)
          shape.lineTo(0, objHeight)
          shape.closePath()
        } else if (shapeObj.shapeType === 'ellipse') {
          const params = shapeObj.params as { radiusX: number; radiusY: number }
          const rx = params.radiusX * obj.transform.scaleX
          const ry = params.radiusY * obj.transform.scaleY
          shape = new THREE.Shape()
          shape.ellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
          objWidth = rx * 2
          objHeight = ry * 2
        } else if (shapeObj.shapeType === 'polygon') {
          const params = shapeObj.params as { sides: number; radius: number }
          const radius = params.radius * obj.transform.scaleX
          const sides = params.sides
          shape = new THREE.Shape()
          for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) shape.moveTo(x, y)
            else shape.lineTo(x, y)
          }
          shape.closePath()
          objWidth = radius * 2
          objHeight = radius * 2
        }
      } else if (obj.type === 'path') {
        // VectorPath
        const pathObj = obj
        if (pathObj.points && pathObj.points.length > 0) {
          shape = new THREE.Shape()
          pathObj.points.forEach((pt, i) => {
            const x = pt.x * obj.transform.scaleX
            const y = pt.y * obj.transform.scaleY
            if (i === 0) shape!.moveTo(x, y)
            else shape!.lineTo(x, y)
          })
          if (pathObj.closed) shape.closePath()
        }
      }

      if (shape) {
        const extrudeSettings = {
          depth: carveDepth,
          bevelEnabled: false,
        }
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
        geometry.translate(obj.transform.x, obj.transform.y, thickness - carveDepth)
        geometry.rotateZ(obj.transform.rotation * Math.PI / 180)

        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color).multiplyScalar(0.7),
          roughness: 0.8,
          metalness: 0.1,
        })

        const mesh = new THREE.Mesh(geometry, material)
        group.add(mesh)
      }
    })

    return group
  }, [objects, toolpaths, thickness, color])

  return (
    <group>
      {/* Main material block */}
      <mesh geometry={materialGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          map={woodTexture}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Carved areas (darker) */}
      {carvedMesh && <primitive object={carvedMesh} />}

      {/* Toolpath visualization */}
      {showToolpaths && toolpaths.map(tp => (
        <group key={tp.id}>
          {tp.paths.map((path, pathIdx) => {
            if (path.length < 2) return null
            const points = path.map(p => [p.x, p.y, thickness + 2] as [number, number, number])
            return (
              <Line
                key={pathIdx}
                points={points}
                color={tp.type === 'pocket' ? '#4CAF50' : tp.type === 'profile' ? '#2196F3' : '#FF9800'}
                lineWidth={2}
              />
            )
          })}
        </group>
      ))}

      {/* Wasteboard grid */}
      <gridHelper
        args={[Math.max(width, height) * 1.5, 20, '#333', '#222']}
        position={[width / 2, height / 2, -1]}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

// ============================================================================
// Preview Scene
// ============================================================================

function PreviewScene({
  width,
  height,
  thickness,
  color,
  toolpaths,
  showToolpaths,
  objects,
}: {
  width: number
  height: number
  thickness: number
  color: string
  toolpaths: PreviewToolpath[]
  showToolpaths: boolean
  objects: DesignObject[]
}) {
  const cameraDistance = Math.max(width, height) * 1.5

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={[width / 2, -height * 0.8, cameraDistance * 0.8]}
        fov={45}
        near={1}
        far={cameraDistance * 10}
      />
      <OrbitControls
        target={[width / 2, height / 2, thickness / 2]}
        enableDamping
        dampingFactor={0.1}
        minDistance={50}
        maxDistance={cameraDistance * 3}
      />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[width, height, thickness * 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight
        position={[-width, -height, thickness * 3]}
        intensity={0.3}
      />

      {/* Material */}
      <MaterialBlock
        width={width}
        height={height}
        thickness={thickness}
        color={color}
        toolpaths={toolpaths}
        showToolpaths={showToolpaths}
        objects={objects}
      />

      {/* Contact shadows for realism */}
      <ContactShadows
        position={[width / 2, height / 2, -0.5]}
        opacity={0.4}
        scale={Math.max(width, height) * 2}
        blur={2}
        far={10}
      />
    </>
  )
}

// ============================================================================
// Main Modal Component
// ============================================================================

export function MaterialPreviewModal({
  onClose,
  onProceedToManufacture,
}: MaterialPreviewModalProps) {
  const { project, tools, machineConfig } = useDesignStore()

  // State
  const [isGenerating, setIsGenerating] = useState(true)
  const [selectedBitId, setSelectedBitId] = useState<string | null>(null)
  const [showToolpaths, setShowToolpaths] = useState(true)
  const [toolpaths, setToolpaths] = useState<PreviewToolpath[]>([])
  const [warnings, setWarnings] = useState<PreviewWarning[]>([])
  const [estimatedTime, setEstimatedTime] = useState(0)

  // Material settings from project
  const materialWidth = project?.canvas.width || 300
  const materialHeight = project?.canvas.height || 300
  const materialThickness = 18 // Default, could come from setup
  const materialColor = '#C4A484' // Wood color
  const unit = project?.canvas.unit || 'mm'

  // Get available bits
  const availableBits = useMemo(() => {
    return tools.filter(t => t.type === 'flat-end-mill' || t.type === 'v-bit' || t.type === 'ball-end-mill')
  }, [tools])

  // Set default bit
  useEffect(() => {
    if (!selectedBitId && availableBits.length > 0) {
      setSelectedBitId(availableBits[0].id)
    }
  }, [availableBits, selectedBitId])

  // Get selected bit
  const selectedBit = useMemo(() => {
    return tools.find(t => t.id === selectedBitId) || null
  }, [tools, selectedBitId])

  // Auto-generate toolpaths when modal opens or bit changes
  useEffect(() => {
    if (!project || !selectedBit) return

    setIsGenerating(true)
    const newWarnings: PreviewWarning[] = []

    // Simulate toolpath generation (in real implementation, use toolpathEngine)
    const timer = setTimeout(() => {
      const generatedToolpaths: PreviewToolpath[] = []
      let totalTime = 0

      // Generate toolpaths for each design object
      project.objects.forEach(obj => {
        // Only process shapes and paths
        if (obj.type !== 'shape' && obj.type !== 'path') return

        // Determine operation type and dimensions based on object type
        let isClosed = true
        let objWidth = 100
        let objHeight = 100

        if (obj.type === 'shape') {
          // VectorShape - get dimensions from params
          if (obj.shapeType === 'rectangle') {
            const params = obj.params as { width: number; height: number }
            objWidth = params.width * obj.transform.scaleX
            objHeight = params.height * obj.transform.scaleY
          } else if (obj.shapeType === 'ellipse') {
            const params = obj.params as { radiusX: number; radiusY: number }
            objWidth = params.radiusX * 2 * obj.transform.scaleX
            objHeight = params.radiusY * 2 * obj.transform.scaleY
          } else if (obj.shapeType === 'polygon') {
            const params = obj.params as { radius: number }
            objWidth = params.radius * 2 * obj.transform.scaleX
            objHeight = params.radius * 2 * obj.transform.scaleY
          }
        } else if (obj.type === 'path') {
          // VectorPath
          isClosed = obj.closed
          // Estimate dimensions from points
          if (obj.points && obj.points.length > 0) {
            const xs = obj.points.map(p => p.x)
            const ys = obj.points.map(p => p.y)
            objWidth = (Math.max(...xs) - Math.min(...xs)) * obj.transform.scaleX
            objHeight = (Math.max(...ys) - Math.min(...ys)) * obj.transform.scaleY
          }
        }

        const operationType = isClosed ? 'pocket' : 'engrave'
        const bitDiameter = selectedBit.geometry.diameter
        const stepover = bitDiameter * 0.4
        const feedRate = selectedBit.defaultFeedRate || 1000
        const depth = 3 // Default carve depth

        // Calculate approximate area for time estimation
        const area = objWidth * objHeight
        const passes = Math.ceil(area / (stepover * bitDiameter))
        const pathLength = passes * Math.sqrt(area)
        const opTime = (pathLength / feedRate) * (depth / 1)

        totalTime += opTime

        // Generate simplified toolpath visualization
        const paths: THREE.Vector3[][] = []
        const x = obj.transform.x
        const y = obj.transform.y
        
        if (operationType === 'pocket' && objWidth > 0 && objHeight > 0) {
          // Generate pocket toolpath (spiral inward pattern)
          for (let offset = stepover; offset < Math.min(objWidth, objHeight) / 2; offset += stepover) {
            const path: THREE.Vector3[] = [
              new THREE.Vector3(x + offset, y + offset, 0),
              new THREE.Vector3(x + objWidth - offset, y + offset, 0),
              new THREE.Vector3(x + objWidth - offset, y + objHeight - offset, 0),
              new THREE.Vector3(x + offset, y + objHeight - offset, 0),
              new THREE.Vector3(x + offset, y + offset, 0),
            ]
            paths.push(path)
          }
        } else if (obj.type === 'path' && obj.points) {
          // Profile/engrave - follow outline
          const path: THREE.Vector3[] = []
          obj.points.forEach(pt => {
            path.push(new THREE.Vector3(
              x + pt.x * obj.transform.scaleX,
              y + pt.y * obj.transform.scaleY,
              0
            ))
          })
          if (path.length > 0) paths.push(path)
        }

        // Check for warnings
        if (bitDiameter > Math.min(objWidth, objHeight) * 0.5) {
          newWarnings.push({
            type: 'warning',
            message: `Bit may be too large for "${obj.name}" - some details may not be carved`,
          })
        }

        generatedToolpaths.push({
          id: crypto.randomUUID(),
          type: operationType,
          objectIds: [obj.id],
          toolId: selectedBit.id,
          depth,
          paths,
        })
      })

      // Check for general warnings
      if (project.objects.length === 0) {
        newWarnings.push({
          type: 'info',
          message: 'No design objects to preview. Add shapes or import a design.',
        })
      }

      if (!machineConfig) {
        newWarnings.push({
          type: 'warning',
          message: 'No machine configured. Time estimates may be inaccurate.',
        })
      }

      setToolpaths(generatedToolpaths)
      setWarnings(newWarnings)
      setEstimatedTime(Math.max(1, Math.round(totalTime)))
      setIsGenerating(false)
    }, 500) // Simulate generation time

    return () => clearTimeout(timer)
  }, [project, selectedBit, machineConfig])

  // Format time display
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!project) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-card p-6 rounded-lg">
          <p className="text-muted-foreground">No project loaded</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold">Material Preview</h2>
            <p className="text-xs text-muted-foreground">
              {project.name} — {formatDimension(materialWidth, unit, { showUnit: false })} × {formatDimension(materialHeight, unit)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onProceedToManufacture}>
            <ChevronRight className="w-4 h-4 mr-1" />
            Proceed to Manufacture
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Preview */}
        <div className="flex-1 relative bg-[#0a0a14]">
          {isGenerating ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Generating preview...</p>
              </div>
            </div>
          ) : (
            <Canvas shadows>
              <PreviewScene
                width={materialWidth}
                height={materialHeight}
                thickness={materialThickness}
                color={materialColor}
                toolpaths={toolpaths}
                showToolpaths={showToolpaths}
                objects={project.objects}
              />
            </Canvas>
          )}

          {/* View Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowToolpaths(!showToolpaths)}
              title={showToolpaths ? 'Hide toolpaths' : 'Show toolpaths'}
            >
              {showToolpaths ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
          </div>

          {/* Controls hint */}
          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-black/50 px-3 py-2 rounded-md">
            <div>Left-drag: Rotate</div>
            <div>Right-drag: Pan</div>
            <div>Scroll: Zoom</div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-border bg-card flex flex-col overflow-y-auto">
          {/* Bit Selection */}
          <div className="p-4 border-b border-border">
            <Label className="text-sm font-medium mb-2 block">
              <Wrench className="w-4 h-4 inline mr-1" />
              Select Bit
            </Label>
            <Select value={selectedBitId || ''} onValueChange={setSelectedBitId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a bit..." />
              </SelectTrigger>
              <SelectContent>
                {availableBits.map(bit => (
                  <SelectItem key={bit.id} value={bit.id}>
                    <div className="flex items-center gap-2">
                      <span>{bit.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({bit.geometry.diameter}mm)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBit && (
              <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{selectedBit.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diameter:</span>
                  <span>{selectedBit.geometry.diameter} mm</span>
                </div>
                {selectedBit.geometry.fluteLength && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Flute Length:</span>
                    <span>{selectedBit.geometry.fluteLength} mm</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Material Info */}
          <div className="p-4 border-b border-border">
            <Label className="text-sm font-medium mb-2 block">
              <Box className="w-4 h-4 inline mr-1" />
              Material
            </Label>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>
                  {formatDimension(materialWidth, unit, { showUnit: false })} × {formatDimension(materialHeight, unit, { showUnit: false })} × {formatDimension(materialThickness, unit)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>Wood (Default)</span>
              </div>
            </div>
          </div>

          {/* Time Estimate */}
          <div className="p-4 border-b border-border">
            <Label className="text-sm font-medium mb-2 block">
              <Clock className="w-4 h-4 inline mr-1" />
              Estimated Time
            </Label>
            {isGenerating ? (
              <div className="text-sm text-muted-foreground">Calculating...</div>
            ) : (
              <div className="text-2xl font-bold text-primary">
                {formatTime(estimatedTime)}
              </div>
            )}
          </div>

          {/* Operations Summary */}
          <div className="p-4 border-b border-border">
            <Label className="text-sm font-medium mb-2 block">
              <Layers className="w-4 h-4 inline mr-1" />
              Operations ({toolpaths.length})
            </Label>
            {toolpaths.length === 0 ? (
              <p className="text-sm text-muted-foreground">No operations generated</p>
            ) : (
              <div className="space-y-2">
                {toolpaths.slice(0, 5).map((tp) => (
                  <div key={tp.id} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: tp.type === 'pocket' ? '#4CAF50' : tp.type === 'profile' ? '#2196F3' : '#FF9800'
                      }}
                    />
                    <span className="capitalize">{tp.type}</span>
                    <span className="text-muted-foreground">({tp.depth}mm deep)</span>
                  </div>
                ))}
                {toolpaths.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{toolpaths.length - 5} more operations
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-4">
              <Label className="text-sm font-medium mb-2 block">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Warnings
              </Label>
              <div className="space-y-2">
                {warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-md text-sm flex items-start gap-2 ${
                      warning.type === 'error' ? 'bg-destructive/10 text-destructive' :
                      warning.type === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-blue-500/10 text-blue-600'
                    }`}
                  >
                    {warning.type === 'error' ? (
                      <X className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    ) : warning.type === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    )}
                    <span>{warning.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success state */}
          {!isGenerating && warnings.length === 0 && toolpaths.length > 0 && (
            <div className="p-4">
              <div className="p-3 rounded-md bg-green-500/10 text-green-600 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">Ready to manufacture</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MaterialPreviewModal
