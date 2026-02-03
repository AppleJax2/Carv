import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useThree, useFrame, ThreeEvent } from '@react-three/fiber'
import { 
  OrbitControls, 
  TransformControls, 
  Grid, 
  PerspectiveCamera
} from '@react-three/drei'
import { ViewCube, type ViewDirection } from './ViewCube'
import { useDesignStore } from '@/store/useDesignStore'
import { Button } from './ui/button'
import { 
  Move3d,
  RotateCw,
  Scaling,
  Focus
} from 'lucide-react'
import * as THREE from 'three'
import type { Model3D } from '@/types/design'
import { cn } from '@/lib/utils'

type TransformMode = 'translate' | 'rotate' | 'scale'

interface Workspace3DProps {
  className?: string
}

// Snapping constants
const POSITION_SNAP = 10 // mm grid
const ROTATION_SNAP = 15 // degrees (0, 15, 30, 45, 60, 75, 90, etc.)
const SCALE_SNAP = 0.1 // 10% increments

function SelectableModel({ 
  model,
  isSelected,
  transformMode,
  onSelect,
  onTransformEnd,
  workspaceBounds,
  snapEnabled
}: {
  model: Model3D
  isSelected: boolean
  transformMode: TransformMode
  onSelect: (id: string) => void
  onTransformEnd: (id: string, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void
  workspaceBounds: { width: number; height: number }
  snapEnabled: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const transformRef = useRef<any>(null)
  const originalScaleRef = useRef<THREE.Vector3 | null>(null)
  useThree()

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(model.id)
  }, [model.id, onSelect])

  // Snap value to nearest increment
  const snapValue = (value: number, increment: number): number => {
    return Math.round(value / increment) * increment
  }

  // Snap to axis if close (for X=0, Y=0, center)
  const snapToAxis = (value: number, axisValue: number, threshold: number = 5): number => {
    return Math.abs(value - axisValue) < threshold ? axisValue : value
  }

  // Track when transform starts to capture original scale
  const handleTransformStart = useCallback(() => {
    if (groupRef.current) {
      originalScaleRef.current = groupRef.current.scale.clone()
    }
  }, [])

  const handleTransformEnd = useCallback(() => {
    if (!groupRef.current) return
    
    let pos = groupRef.current.position.clone()
    let rot = groupRef.current.rotation.clone()
    let scl = groupRef.current.scale.clone()
    
    // Proportional scaling when snapEnabled (Alt NOT held)
    // If Alt is held (snapEnabled=false), allow axis-specific scaling
    if (snapEnabled && transformMode === 'scale' && originalScaleRef.current) {
      // Find which axis changed the most and apply that ratio uniformly
      const origScl = originalScaleRef.current
      const ratioX = scl.x / origScl.x
      const ratioY = scl.y / origScl.y
      const ratioZ = scl.z / origScl.z
      
      // Use the ratio that differs most from 1.0 (the one being dragged)
      const ratios = [ratioX, ratioY, ratioZ]
      const maxDiff = ratios.reduce((max, r) => 
        Math.abs(r - 1) > Math.abs(max - 1) ? r : max, 1)
      
      // Apply uniform scale
      scl.x = origScl.x * maxDiff
      scl.y = origScl.y * maxDiff
      scl.z = origScl.z * maxDiff
    }
    
    if (snapEnabled) {
      // Snap position to grid
      pos.x = snapValue(pos.x, POSITION_SNAP)
      pos.y = snapValue(pos.y, POSITION_SNAP)
      pos.z = snapValue(pos.z, POSITION_SNAP)
      
      // Snap to axis lines (X=0, Y=0, center of workspace)
      pos.x = snapToAxis(pos.x, 0)
      pos.x = snapToAxis(pos.x, workspaceBounds.width / 2)
      pos.x = snapToAxis(pos.x, workspaceBounds.width)
      pos.y = snapToAxis(pos.y, 0)
      pos.y = snapToAxis(pos.y, workspaceBounds.height / 2)
      pos.y = snapToAxis(pos.y, workspaceBounds.height)
      pos.z = snapToAxis(pos.z, 0)
      
      // Snap rotation to common angles (in radians)
      const snapAngle = (angle: number): number => {
        const degrees = (angle * 180) / Math.PI
        const snappedDegrees = snapValue(degrees, ROTATION_SNAP)
        return (snappedDegrees * Math.PI) / 180
      }
      rot.x = snapAngle(rot.x)
      rot.y = snapAngle(rot.y)
      rot.z = snapAngle(rot.z)
      
      // Snap scale to increments
      scl.x = Math.max(0.1, snapValue(scl.x, SCALE_SNAP))
      scl.y = Math.max(0.1, snapValue(scl.y, SCALE_SNAP))
      scl.z = Math.max(0.1, snapValue(scl.z, SCALE_SNAP))
    }
    
    // Clear original scale ref
    originalScaleRef.current = null
    
    // Constrain position within workspace bounds
    const halfWidth = (model.width * scl.x) / 2
    const halfHeight = (model.height * scl.y) / 2
    pos.x = Math.max(halfWidth, Math.min(workspaceBounds.width - halfWidth, pos.x))
    pos.y = Math.max(halfHeight, Math.min(workspaceBounds.height - halfHeight, pos.y))
    
    // Z constraint: model bottom cannot go below work surface (Z=0)
    // But allow lifting during manipulation
    pos.z = Math.max(0, pos.z)
    
    groupRef.current.position.copy(pos)
    groupRef.current.rotation.copy(rot)
    groupRef.current.scale.copy(scl)
    
    onTransformEnd(model.id, pos, rot, scl)
  }, [model.id, model.width, model.height, workspaceBounds, onTransformEnd, snapEnabled, transformMode])

  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current
      controls.addEventListener('mouseDown', handleTransformStart)
      controls.addEventListener('mouseUp', handleTransformEnd)
      return () => {
        controls.removeEventListener('mouseDown', handleTransformStart)
        controls.removeEventListener('mouseUp', handleTransformEnd)
      }
    }
  }, [handleTransformStart, handleTransformEnd])

  const centerOffset = model.meshData?.boundingBox 
    ? [
        -(model.meshData.boundingBox.min[0] + model.meshData.boundingBox.max[0]) / 2,
        -(model.meshData.boundingBox.min[1] + model.meshData.boundingBox.max[1]) / 2,
        -model.meshData.boundingBox.min[2]
      ]
    : [0, 0, 0]

  const geometry = useMemo(() => {
    if (!model.meshData) return null
    
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(model.meshData.vertices, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(model.meshData.normals, 3))
    
    if (model.meshData.indices.length > 0) {
      geo.setIndex(new THREE.BufferAttribute(model.meshData.indices, 1))
    }
    
    geo.computeBoundingBox()
    return geo
  }, [model.meshData])

  return (
    <>
      <group
        ref={groupRef}
        position={[model.transform.x, model.transform.y, 0]}
        rotation={[0, 0, (model.transform.rotation * Math.PI) / 180]}
        scale={[model.transform.scaleX, model.transform.scaleY, 1]}
      >
        {geometry ? (
          <mesh
            position={centerOffset as [number, number, number]}
            onClick={handleClick}
          >
            <primitive object={geometry} attach="geometry" />
            <meshStandardMaterial 
              color={isSelected ? '#f59e0b' : '#6366f1'} 
              side={THREE.DoubleSide}
              flatShading
            />
          </mesh>
        ) : (
          <mesh
            position={[0, 0, model.depth / 2]}
            onClick={handleClick}
          >
            <boxGeometry args={[model.width, model.height, model.depth]} />
            <meshStandardMaterial 
              color={isSelected ? '#f59e0b' : '#3b82f6'} 
              wireframe={!model.meshData}
            />
          </mesh>
        )}
        
        {isSelected && geometry && (
          <mesh position={centerOffset as [number, number, number]}>
            <bufferGeometry attach="geometry">
              <bufferAttribute
                attach="attributes-position"
                count={geometry.attributes.position.count}
                array={geometry.attributes.position.array as Float32Array}
                itemSize={3}
              />
            </bufferGeometry>
            <meshBasicMaterial 
              color="#f59e0b" 
              wireframe 
              transparent 
              opacity={0.3}
            />
          </mesh>
        )}
      </group>
      
      {isSelected && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={transformMode}
          size={0.75}
          showX
          showY
          showZ
        />
      )}
    </>
  )
}

function WorkspaceGrid({ width, height }: { width: number; height: number }) {
  return (
    <group position={[width / 2, height / 2, 0]}>
      {/* Grid on XZ plane (horizontal) */}
      <Grid
        args={[width, height]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#94a3b8"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#64748b"
        fadeDistance={Math.max(width, height) * 2}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />
      
      {/* Workspace boundary outline */}
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={4}
            array={new Float32Array([
              -width/2, 0, -height/2,
              width/2, 0, -height/2,
              width/2, 0, height/2,
              -width/2, 0, height/2,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22c55e" linewidth={2} />
      </lineLoop>
      
      {/* Origin marker */}
      <mesh position={[-width/2, 0, -height/2]}>
        <sphereGeometry args={[2, 16, 16]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
      </mesh>
      
      {/* Axes at origin */}
      <axesHelper args={[30]} position={[-width/2, 0, -height/2]} />
    </group>
  )
}

// Component to sync camera rotation with ViewCube
function CameraSync({ 
  onRotationChange,
  targetRotation,
  orbitRef
}: { 
  onRotationChange: (rotation: { x: number; y: number }) => void
  targetRotation: { x: number; y: number } | null
  orbitRef: React.RefObject<any>
}) {
  const { camera } = useThree()
  const lastRotation = useRef({ x: 0, y: 0 })
  const isAnimating = useRef(false)

  // Convert camera spherical coordinates to ViewCube rotation
  useFrame(() => {
    if (!orbitRef.current || isAnimating.current) return
    
    const controls = orbitRef.current
    const spherical = new THREE.Spherical()
    const target = controls.target as THREE.Vector3
    const position = camera.position.clone().sub(target)
    spherical.setFromVector3(position)
    
    // Convert spherical to euler-like rotation for ViewCube
    // phi is polar angle (0 = top, PI = bottom)
    // theta is azimuthal angle
    const x = -(spherical.phi * 180 / Math.PI - 90) // Convert to degrees, offset
    const y = -(spherical.theta * 180 / Math.PI)
    
    // Only update if changed significantly
    if (Math.abs(x - lastRotation.current.x) > 0.5 || Math.abs(y - lastRotation.current.y) > 0.5) {
      lastRotation.current = { x, y }
      onRotationChange({ x, y })
    }
  })

  // Animate camera to target rotation when ViewCube is clicked
  useEffect(() => {
    if (!targetRotation || !orbitRef.current) return
    
    isAnimating.current = true
    const controls = orbitRef.current
    const target = controls.target as THREE.Vector3
    const distance = camera.position.distanceTo(target)
    
    // Convert ViewCube rotation to spherical coordinates
    const phi = (90 - targetRotation.x) * Math.PI / 180
    const theta = -targetRotation.y * Math.PI / 180
    
    const spherical = new THREE.Spherical(distance, phi, theta)
    const newPosition = new THREE.Vector3().setFromSpherical(spherical).add(target)
    
    // Animate camera position
    const startPos = camera.position.clone()
    const startTime = Date.now()
    const duration = 300
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // Ease out cubic
      
      camera.position.lerpVectors(startPos, newPosition, eased)
      camera.lookAt(target)
      
      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        isAnimating.current = false
      }
    }
    
    animate()
  }, [targetRotation, camera, orbitRef])

  return null
}

function Scene({ 
  transformMode,
  onBackgroundClick,
  onCameraRotationChange,
  targetCameraRotation,
  snapEnabled,
}: { 
  transformMode: TransformMode
  onBackgroundClick: () => void
  onCameraRotationChange: (rotation: { x: number; y: number }) => void
  targetCameraRotation: { x: number; y: number } | null
  snapEnabled: boolean
}) {
  const { project, selectedObjectIds, selectObjects, updateObject, machineConfig } = useDesignStore()
  const orbitRef = useRef<any>(null)
  
  const workspaceWidth = project?.canvas.width || machineConfig?.workspace.width || 300
  const workspaceHeight = project?.canvas.height || machineConfig?.workspace.depth || 300

  const model3dObjects = useMemo(() => {
    if (!project) return []
    return project.objects.filter((obj): obj is Model3D => obj.type === 'model3d')
  }, [project])

  const handleSelect = useCallback((id: string) => {
    selectObjects([id])
  }, [selectObjects])

  const handleTransformEnd = useCallback((
    id: string, 
    position: THREE.Vector3, 
    rotation: THREE.Euler, 
    scale: THREE.Vector3
  ) => {
    updateObject(id, {
      transform: {
        x: position.x,
        y: position.y,
        rotation: (rotation.z * 180) / Math.PI,
        scaleX: scale.x,
        scaleY: scale.y,
      }
    })
  }, [updateObject])

  const handlePointerMissed = useCallback(() => {
    onBackgroundClick()
  }, [onBackgroundClick])

  const cameraDistance = Math.max(workspaceWidth, workspaceHeight) * 1.5

  return (
    <>
      <PerspectiveCamera 
        makeDefault 
        position={[workspaceWidth / 2, -cameraDistance / 2, cameraDistance]} 
        fov={50}
        near={0.1}
        far={cameraDistance * 10}
      />
      <OrbitControls 
        ref={orbitRef}
        enableDamping 
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={cameraDistance * 5}
        target={[workspaceWidth / 2, workspaceHeight / 2, 0]}
        mouseButtons={{
          LEFT: undefined,  // LMB = select (handled separately)
          MIDDLE: 2,        // MMB = pan (THREE.MOUSE.PAN = 2)
          RIGHT: 0,         // RMB = orbit (THREE.MOUSE.ROTATE = 0)
        }}
      />
      <CameraSync 
        onRotationChange={onCameraRotationChange}
        targetRotation={targetCameraRotation}
        orbitRef={orbitRef}
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[workspaceWidth, workspaceHeight, workspaceWidth]} intensity={0.8} />
      <directionalLight position={[-workspaceWidth / 2, -workspaceHeight / 2, workspaceWidth / 2]} intensity={0.3} />
      
      <WorkspaceGrid width={workspaceWidth} height={workspaceHeight} />
      
      <group onPointerMissed={handlePointerMissed}>
        {model3dObjects.map(model => (
          <SelectableModel
            key={model.id}
            model={model}
            isSelected={selectedObjectIds.includes(model.id)}
            transformMode={transformMode}
            onSelect={handleSelect}
            onTransformEnd={handleTransformEnd}
            workspaceBounds={{ width: workspaceWidth, height: workspaceHeight }}
            snapEnabled={snapEnabled}
          />
        ))}
      </group>

{/* ViewCube is rendered as HTML overlay outside Canvas */}
    </>
  )
}

export function Workspace3D({ className }: Workspace3DProps) {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const [viewCubeRotation, setViewCubeRotation] = useState({ x: -25, y: 35 })
  const [targetCameraRotation, setTargetCameraRotation] = useState<{ x: number; y: number } | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const { selectedObjectIds, selectObjects, project, machineConfig, zoomToFit, deleteObjects } = useDesignStore()

  // Alt key detection - hold Alt to disable snapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setSnapEnabled(false)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') setSnapEnabled(true)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleViewCubeChange = useCallback((view: ViewDirection) => {
    // Map view to rotation - this triggers camera animation
    const rotations: Record<ViewDirection, { x: number; y: number }> = {
      'top': { x: -90, y: 0 },
      'bottom': { x: 90, y: 0 },
      'front': { x: 0, y: 0 },
      'back': { x: 0, y: 180 },
      'left': { x: 0, y: 90 },
      'right': { x: 0, y: -90 },
      'iso-front-right': { x: -25, y: 35 },
      'iso-front-left': { x: -25, y: -35 },
      'iso-back-right': { x: -25, y: 145 },
      'iso-back-left': { x: -25, y: -145 },
    }
    setTargetCameraRotation(rotations[view])
  }, [])

  const handleCameraRotationChange = useCallback((rotation: { x: number; y: number }) => {
    setViewCubeRotation(rotation)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'g':
          setTransformMode('translate')
          break
        case 'r':
          setTransformMode('rotate')
          break
        case 's':
          if (!e.ctrlKey && !e.metaKey) {
            setTransformMode('scale')
          }
          break
        case 'delete':
        case 'backspace':
          if (selectedObjectIds.length > 0) {
            deleteObjects(selectedObjectIds)
          }
          break
        case 'escape':
          selectObjects([])
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedObjectIds, deleteObjects, selectObjects])

  const handleBackgroundClick = useCallback(() => {
    selectObjects([])
  }, [selectObjects])

  const handleZoomToFit = useCallback(() => {
    zoomToFit()
  }, [zoomToFit])

  const model3dCount = useMemo(() => {
    if (!project) return 0
    return project.objects.filter(obj => obj.type === 'model3d').length
  }, [project])

  const workspaceWidth = project?.canvas.width || machineConfig?.workspace.width || 300
  const workspaceHeight = project?.canvas.height || machineConfig?.workspace.depth || 300

  return (
    <div className={cn('relative w-full h-full', className)}>
      <Canvas 
        className="bg-[#e8e8e8] dark:bg-[#2a2a2a]"
        onPointerMissed={handleBackgroundClick}
      >
        <Scene 
          transformMode={transformMode}
          onBackgroundClick={handleBackgroundClick}
          onCameraRotationChange={handleCameraRotationChange}
          targetCameraRotation={targetCameraRotation}
          snapEnabled={snapEnabled}
        />
      </Canvas>

      {/* ViewCube overlay */}
      <div className="absolute top-4 right-4">
        <ViewCube
          onViewChange={handleViewCubeChange}
          rotation={viewCubeRotation}
          onRotationChange={(rotation) => {
            setViewCubeRotation(rotation)
            setTargetCameraRotation(rotation)
          }}
        />
      </div>

      <div className="absolute top-4 left-4 flex flex-col gap-2">
        <div className="bg-card/90 backdrop-blur rounded-lg p-1 flex flex-col gap-1">
          <Button
            variant={transformMode === 'translate' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setTransformMode('translate')}
            title="Move (G)"
          >
            <Move3d className="w-4 h-4" />
          </Button>
          <Button
            variant={transformMode === 'rotate' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setTransformMode('rotate')}
            title="Rotate (R)"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant={transformMode === 'scale' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setTransformMode('scale')}
            title="Scale (S)"
          >
            <Scaling className="w-4 h-4" />
          </Button>
        </div>

        <div className="bg-card/90 backdrop-blur rounded-lg p-1 flex flex-col gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomToFit}
            title="Zoom to Fit"
          >
            <Focus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg text-xs space-y-1">
        <div className="font-mono">
          Workspace: {workspaceWidth} × {workspaceHeight} mm
        </div>
        <div className="text-muted-foreground">
          {model3dCount} 3D model{model3dCount !== 1 ? 's' : ''} in scene
        </div>
        {selectedObjectIds.length > 0 && (
          <div className="text-primary">
            {selectedObjectIds.length} selected
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur px-3 py-2 rounded-lg text-xs text-muted-foreground">
        <div>Left-click: Select</div>
        <div>Right-drag: Orbit</div>
        <div>Scroll: Zoom</div>
        <div>Middle-drag: Pan</div>
        <div className="mt-1 pt-1 border-t border-border">
          <span className={snapEnabled ? 'text-primary' : 'text-muted-foreground'}>
            {snapEnabled ? 'Snap ON • Proportional Scale' : 'Snap OFF • Axis Scale'}
          </span>
        </div>
        <div className="opacity-60">Hold Alt for free transform</div>
      </div>

      {model3dCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-card/90 backdrop-blur rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              No 3D models in scene. Import an STL or heightmap to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
