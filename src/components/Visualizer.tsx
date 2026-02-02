import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Box, RotateCcw, Maximize2 } from 'lucide-react'
import * as THREE from 'three'

interface ToolpathProps {
  gcode: string[]
  completedLine: number
}

function Toolpath({ gcode, completedLine }: ToolpathProps) {
  const { points, rapidPoints } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const rapids: THREE.Vector3[] = []
    let currentPos = new THREE.Vector3(0, 0, 0)
    let isAbsolute = true
    let isRapid = false

    for (const line of gcode) {
      const upper = line.toUpperCase()
      if (upper.startsWith(';') || upper.startsWith('(')) continue

      if (upper.includes('G90')) isAbsolute = true
      if (upper.includes('G91')) isAbsolute = false
      if (upper.includes('G0')) isRapid = true
      if (upper.includes('G1') || upper.includes('G2') || upper.includes('G3')) isRapid = false

      const xMatch = upper.match(/X([-\d.]+)/)
      const yMatch = upper.match(/Y([-\d.]+)/)
      const zMatch = upper.match(/Z([-\d.]+)/)

      if (xMatch || yMatch || zMatch) {
        const newPos = currentPos.clone()
        
        if (xMatch) {
          newPos.x = isAbsolute ? parseFloat(xMatch[1]) : currentPos.x + parseFloat(xMatch[1])
        }
        if (yMatch) {
          newPos.y = isAbsolute ? parseFloat(yMatch[1]) : currentPos.y + parseFloat(yMatch[1])
        }
        if (zMatch) {
          newPos.z = isAbsolute ? parseFloat(zMatch[1]) : currentPos.z + parseFloat(zMatch[1])
        }

        if (isRapid) {
          rapids.push(currentPos.clone(), newPos.clone())
        } else {
          pts.push(currentPos.clone(), newPos.clone())
        }
        
        currentPos = newPos
      }
    }

    return { points: pts, rapidPoints: rapids }
  }, [gcode])

  const completedGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    if (points.length > 0) {
      const completedPts = points.slice(0, Math.min(completedLine * 2, points.length))
      geo.setFromPoints(completedPts)
    }
    return geo
  }, [points, completedLine])

  const pendingGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    if (points.length > 0) {
      const pendingPts = points.slice(Math.min(completedLine * 2, points.length))
      geo.setFromPoints(pendingPts)
    }
    return geo
  }, [points, completedLine])

  const rapidGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    if (rapidPoints.length > 0) {
      geo.setFromPoints(rapidPoints)
    }
    return geo
  }, [rapidPoints])

  return (
    <group>
      <lineSegments geometry={completedGeometry}>
        <lineBasicMaterial color="#22c55e" linewidth={2} />
      </lineSegments>
      <lineSegments geometry={pendingGeometry}>
        <lineBasicMaterial color="#3b82f6" linewidth={2} />
      </lineSegments>
      <lineSegments geometry={rapidGeometry}>
        <lineBasicMaterial color="#f59e0b" linewidth={1} transparent opacity={0.5} />
      </lineSegments>
    </group>
  )
}

function ToolIndicator() {
  const { status } = useStore()
  const meshRef = useRef<THREE.Mesh>(null)

  const position = status?.workPosition || { x: 0, y: 0, z: 0 }

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position.x, position.y, position.z)
    }
  })

  return (
    <mesh ref={meshRef}>
      <coneGeometry args={[2, 6, 8]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
    </mesh>
  )
}

function Scene() {
  const { gcodeFile, jobProgress } = useStore()
  const completedLine = jobProgress?.currentLine || 0

  return (
    <>
      <PerspectiveCamera makeDefault position={[150, 150, 150]} />
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={50}
        maxDistance={500}
      />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 100, 100]} intensity={1} />
      
      <Grid 
        args={[300, 300]} 
        cellSize={10}
        cellThickness={0.5}
        cellColor="#1e3a5f"
        sectionSize={50}
        sectionThickness={1}
        sectionColor="#2563eb"
        fadeDistance={400}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      {gcodeFile && (
        <Toolpath gcode={gcodeFile.content} completedLine={completedLine} />
      )}
      
      <ToolIndicator />

      <axesHelper args={[50]} />
    </>
  )
}

export function Visualizer() {
  const controlsRef = useRef<any>(null)

  const handleResetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Box className="w-4 h-4" />
            Visualizer
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={handleResetView} title="Reset View">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Fullscreen">
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden rounded-b-xl">
        <Canvas className="bg-[#0a0a14]">
          <Scene />
        </Canvas>
      </CardContent>
    </Card>
  )
}
