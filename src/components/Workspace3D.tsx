import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { 
  OrbitControls, 
  TransformControls, 
  Grid, 
  PerspectiveCamera,
  GizmoHelper,
  GizmoViewport
} from '@react-three/drei'
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

function SelectableModel({ 
  model,
  isSelected,
  transformMode,
  onSelect,
  onTransformEnd,
  workspaceBounds
}: {
  model: Model3D
  isSelected: boolean
  transformMode: TransformMode
  onSelect: (id: string) => void
  onTransformEnd: (id: string, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3) => void
  workspaceBounds: { width: number; height: number }
}) {
  const groupRef = useRef<THREE.Group>(null)
  const transformRef = useRef<any>(null)
  useThree()

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(model.id)
  }, [model.id, onSelect])

  const handleTransformEnd = useCallback(() => {
    if (!groupRef.current) return
    
    const pos = groupRef.current.position.clone()
    const rot = groupRef.current.rotation.clone()
    const scl = groupRef.current.scale.clone()
    
    const halfWidth = (model.width * scl.x) / 2
    const halfHeight = (model.height * scl.y) / 2
    
    pos.x = Math.max(halfWidth, Math.min(workspaceBounds.width - halfWidth, pos.x))
    pos.y = Math.max(halfHeight, Math.min(workspaceBounds.height - halfHeight, pos.y))
    pos.z = Math.max(0, pos.z)
    
    groupRef.current.position.copy(pos)
    
    onTransformEnd(model.id, pos, rot, scl)
  }, [model.id, model.width, model.height, workspaceBounds, onTransformEnd])

  useEffect(() => {
    if (transformRef.current) {
      const controls = transformRef.current
      controls.addEventListener('mouseUp', handleTransformEnd)
      return () => controls.removeEventListener('mouseUp', handleTransformEnd)
    }
  }, [handleTransformEnd])

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
          showZ={transformMode !== 'translate'}
        />
      )}
    </>
  )
}

function WorkspaceGrid({ width, height }: { width: number; height: number }) {
  return (
    <group>
      <Grid
        args={[width, height]}
        cellSize={10}
        cellThickness={0.5}
        cellColor="#1e3a5f"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#2563eb"
        fadeDistance={Math.max(width, height) * 2}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        position={[width / 2, height / 2, 0]}
      />
      
      <mesh position={[width / 2, height / 2, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial 
          color="#0f172a" 
          transparent 
          opacity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, 0.1)]} />
        <lineBasicMaterial color="#22c55e" linewidth={2} />
      </lineSegments>
      <group position={[width / 2, height / 2, 0]}>
        <mesh position={[-width / 2, -height / 2, 0]}>
          <sphereGeometry args={[3, 16, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      </group>
      
      <axesHelper args={[30]} position={[0, 0, 0]} />
    </group>
  )
}

function Scene({ 
  transformMode,
  onBackgroundClick
}: { 
  transformMode: TransformMode
  onBackgroundClick: () => void
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
      />
      <OrbitControls 
        ref={orbitRef}
        enableDamping 
        dampingFactor={0.05}
        minDistance={20}
        maxDistance={cameraDistance * 3}
        target={[workspaceWidth / 2, workspaceHeight / 2, 0]}
        maxPolarAngle={Math.PI / 2}
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
          />
        ))}
      </group>

      <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
        <GizmoViewport labelColor="white" axisHeadScale={1} />
      </GizmoHelper>
    </>
  )
}

export function Workspace3D({ className }: Workspace3DProps) {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const { selectedObjectIds, selectObjects, project, machineConfig, zoomToFit, deleteObjects } = useDesignStore()

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
        className="bg-[#0a0a14]"
        onPointerMissed={handleBackgroundClick}
      >
        <Scene 
          transformMode={transformMode}
          onBackgroundClick={handleBackgroundClick}
        />
      </Canvas>

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
