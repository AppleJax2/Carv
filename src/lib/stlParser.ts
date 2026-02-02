export interface STLMesh {
  vertices: Float32Array
  normals: Float32Array
  triangleCount: number
  bounds: {
    minX: number; maxX: number
    minY: number; maxY: number
    minZ: number; maxZ: number
  }
}

export function parseSTL(buffer: ArrayBuffer): STLMesh {
  const header = new Uint8Array(buffer, 0, 80)
  const headerStr = String.fromCharCode(...header)
  
  if (headerStr.startsWith('solid') && !isBinarySTL(buffer)) {
    return parseASCIISTL(buffer)
  }
  
  return parseBinarySTL(buffer)
}

function isBinarySTL(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)
  const expectedSize = 84 + triangleCount * 50
  
  return buffer.byteLength === expectedSize || buffer.byteLength === expectedSize + 2
}

function parseBinarySTL(buffer: ArrayBuffer): STLMesh {
  const view = new DataView(buffer)
  const triangleCount = view.getUint32(80, true)
  
  const vertices = new Float32Array(triangleCount * 9)
  const normals = new Float32Array(triangleCount * 9)
  
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  
  let offset = 84
  
  for (let i = 0; i < triangleCount; i++) {
    const nx = view.getFloat32(offset, true)
    const ny = view.getFloat32(offset + 4, true)
    const nz = view.getFloat32(offset + 8, true)
    offset += 12
    
    for (let j = 0; j < 3; j++) {
      const x = view.getFloat32(offset, true)
      const y = view.getFloat32(offset + 4, true)
      const z = view.getFloat32(offset + 8, true)
      offset += 12
      
      const idx = i * 9 + j * 3
      vertices[idx] = x
      vertices[idx + 1] = y
      vertices[idx + 2] = z
      
      normals[idx] = nx
      normals[idx + 1] = ny
      normals[idx + 2] = nz
      
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
      minZ = Math.min(minZ, z)
      maxZ = Math.max(maxZ, z)
    }
    
    offset += 2
  }
  
  return {
    vertices,
    normals,
    triangleCount,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ }
  }
}

function parseASCIISTL(buffer: ArrayBuffer): STLMesh {
  const text = new TextDecoder().decode(buffer)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  const tempVertices: number[] = []
  const tempNormals: number[] = []
  
  let currentNormal = [0, 0, 1]
  
  for (const line of lines) {
    if (line.startsWith('facet normal')) {
      const parts = line.split(/\s+/)
      currentNormal = [
        parseFloat(parts[2]),
        parseFloat(parts[3]),
        parseFloat(parts[4])
      ]
    } else if (line.startsWith('vertex')) {
      const parts = line.split(/\s+/)
      tempVertices.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      )
      tempNormals.push(...currentNormal)
    }
  }
  
  const vertices = new Float32Array(tempVertices)
  const normals = new Float32Array(tempNormals)
  const triangleCount = vertices.length / 9
  
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  
  for (let i = 0; i < vertices.length; i += 3) {
    minX = Math.min(minX, vertices[i])
    maxX = Math.max(maxX, vertices[i])
    minY = Math.min(minY, vertices[i + 1])
    maxY = Math.max(maxY, vertices[i + 1])
    minZ = Math.min(minZ, vertices[i + 2])
    maxZ = Math.max(maxZ, vertices[i + 2])
  }
  
  return {
    vertices,
    normals,
    triangleCount,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ }
  }
}

export function meshToHeightmap(mesh: STLMesh, resolution: number = 256): Float32Array {
  const { bounds } = mesh
  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxY - bounds.minY
  
  const heightmap = new Float32Array(resolution * resolution)
  heightmap.fill(bounds.minZ)
  
  const cellWidth = width / resolution
  const cellDepth = depth / resolution
  
  for (let i = 0; i < mesh.triangleCount; i++) {
    const idx = i * 9
    
    const v0 = {
      x: mesh.vertices[idx],
      y: mesh.vertices[idx + 1],
      z: mesh.vertices[idx + 2]
    }
    const v1 = {
      x: mesh.vertices[idx + 3],
      y: mesh.vertices[idx + 4],
      z: mesh.vertices[idx + 5]
    }
    const v2 = {
      x: mesh.vertices[idx + 6],
      y: mesh.vertices[idx + 7],
      z: mesh.vertices[idx + 8]
    }
    
    const triMinX = Math.floor((Math.min(v0.x, v1.x, v2.x) - bounds.minX) / cellWidth)
    const triMaxX = Math.ceil((Math.max(v0.x, v1.x, v2.x) - bounds.minX) / cellWidth)
    const triMinY = Math.floor((Math.min(v0.y, v1.y, v2.y) - bounds.minY) / cellDepth)
    const triMaxY = Math.ceil((Math.max(v0.y, v1.y, v2.y) - bounds.minY) / cellDepth)
    
    for (let py = Math.max(0, triMinY); py <= Math.min(resolution - 1, triMaxY); py++) {
      for (let px = Math.max(0, triMinX); px <= Math.min(resolution - 1, triMaxX); px++) {
        const worldX = bounds.minX + (px + 0.5) * cellWidth
        const worldY = bounds.minY + (py + 0.5) * cellDepth
        
        const z = getTriangleHeightAt(v0, v1, v2, worldX, worldY)
        if (z !== null) {
          const hmIdx = py * resolution + px
          heightmap[hmIdx] = Math.max(heightmap[hmIdx], z)
        }
      }
    }
  }
  
  return heightmap
}

function getTriangleHeightAt(
  v0: { x: number; y: number; z: number },
  v1: { x: number; y: number; z: number },
  v2: { x: number; y: number; z: number },
  px: number,
  py: number
): number | null {
  const d0x = v1.x - v0.x
  const d0y = v1.y - v0.y
  const d1x = v2.x - v0.x
  const d1y = v2.y - v0.y
  const d2x = px - v0.x
  const d2y = py - v0.y
  
  const dot00 = d0x * d0x + d0y * d0y
  const dot01 = d0x * d1x + d0y * d1y
  const dot02 = d0x * d2x + d0y * d2y
  const dot11 = d1x * d1x + d1y * d1y
  const dot12 = d1x * d2x + d1y * d2y
  
  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01)
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom
  
  if (u >= 0 && v >= 0 && u + v <= 1) {
    return v0.z + u * (v1.z - v0.z) + v * (v2.z - v0.z)
  }
  
  return null
}

export function imageToHeightmap(
  imageData: ImageData,
  maxHeight: number = 10
): { heightmap: Float32Array; width: number; height: number } {
  const { width, height, data } = imageData
  const heightmap = new Float32Array(width * height)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      
      const brightness = (r + g + b) / (3 * 255)
      heightmap[y * width + x] = brightness * maxHeight
    }
  }
  
  return { heightmap, width, height }
}

export interface Model3DData {
  id: string
  layerId: string
  name: string
  visible: boolean
  locked: boolean
  selected: boolean
  type: 'model3d'
  modelType: '3d-import' | 'heightmap'
  meshData?: {
    vertices: Float32Array
    normals: Float32Array
    indices: Uint32Array
    boundingBox: { min: [number, number, number]; max: [number, number, number] }
  }
  heightmapSettings?: {
    imageSrc: string
    minHeight: number
    maxHeight: number
    resolution: number
  }
  width: number
  height: number
  depth: number
  transform: { x: number; y: number; rotation: number; scaleX: number; scaleY: number }
  style: { strokeColor: string; strokeWidth: number; strokeOpacity: number; fillColor: string | null; fillOpacity: number }
}

export function createModel3DFromSTL(
  mesh: STLMesh,
  layerId: string,
  name: string
): Model3DData {
  const { bounds } = mesh
  const width = bounds.maxX - bounds.minX
  const depth = bounds.maxY - bounds.minY
  const height = bounds.maxZ - bounds.minZ
  
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  
  return {
    id: crypto.randomUUID(),
    layerId,
    name,
    visible: true,
    locked: false,
    selected: false,
    type: 'model3d',
    modelType: '3d-import',
    meshData: {
      vertices: mesh.vertices,
      normals: mesh.normals,
      indices: new Uint32Array(0),
      boundingBox: {
        min: [bounds.minX, bounds.minY, bounds.minZ],
        max: [bounds.maxX, bounds.maxY, bounds.maxZ],
      },
    },
    width,
    height: depth,
    depth: height,
    transform: { x: centerX, y: centerY, rotation: 0, scaleX: 1, scaleY: 1 },
    style: { strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1, fillColor: null, fillOpacity: 1 },
  }
}

export function createModel3DFromHeightmap(
  _heightmap: Float32Array,
  _width: number,
  _height: number,
  physicalWidth: number,
  physicalDepth: number,
  maxZ: number,
  imageSrc: string,
  layerId: string,
  name: string
): Model3DData {
  return {
    id: crypto.randomUUID(),
    layerId,
    name,
    visible: true,
    locked: false,
    selected: false,
    type: 'model3d',
    modelType: 'heightmap',
    heightmapSettings: {
      imageSrc,
      minHeight: 0,
      maxHeight: maxZ,
      resolution: 256,
    },
    width: physicalWidth,
    height: physicalDepth,
    depth: maxZ,
    transform: { x: physicalWidth / 2, y: physicalDepth / 2, rotation: 0, scaleX: 1, scaleY: 1 },
    style: { strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1, fillColor: null, fillOpacity: 1 },
  }
}
