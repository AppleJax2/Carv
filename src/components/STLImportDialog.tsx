import { useState, useRef } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { parseSTL, createModel3DFromSTL, imageToHeightmap, createModel3DFromHeightmap } from '@/lib/stlParser'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { 
  Box, 
  X, 
  Upload,
  Image,
  Loader2
} from 'lucide-react'

interface STLImportDialogProps {
  onClose: () => void
}

type ImportMode = 'stl' | 'heightmap'

export function STLImportDialog({ onClose }: STLImportDialogProps) {
  const { activeLayerId, addObject, project, machineConfig } = useDesignStore()
  
  const [mode, setMode] = useState<ImportMode>('stl')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    name: string
    triangles?: number
    bounds?: { width: number; depth: number; height: number }
    imageSrc?: string
  } | null>(null)
  
  const [heightmapSettings, setHeightmapSettings] = useState({
    maxHeight: 10,
    physicalWidth: 100,
    physicalDepth: 100,
  })
  
  const [importSettings, setImportSettings] = useState({
    centerInWorkspace: true,
    fitToWorkspace: false,
    maxFitPercent: 80,
  })

  const workspaceWidth = project?.canvas.width || machineConfig?.workspace.width || 300
  const workspaceHeight = project?.canvas.height || machineConfig?.workspace.depth || 300

  const fileInputRef = useRef<HTMLInputElement>(null)
  const meshDataRef = useRef<any>(null)
  const heightmapDataRef = useRef<{ heightmap: Float32Array; width: number; height: number } | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError(null)
    setPreview(null)

    try {
      if (mode === 'stl') {
        const buffer = await file.arrayBuffer()
        const mesh = parseSTL(buffer)
        
        meshDataRef.current = mesh
        setPreview({
          name: file.name,
          triangles: mesh.triangleCount,
          bounds: {
            width: mesh.bounds.maxX - mesh.bounds.minX,
            depth: mesh.bounds.maxY - mesh.bounds.minY,
            height: mesh.bounds.maxZ - mesh.bounds.minZ,
          },
        })
      } else {
        const img = new window.Image()
        img.src = URL.createObjectURL(file)
        
        await new Promise((resolve, reject) => {
          img.onload = resolve
          img.onerror = reject
        })

        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)

        const result = imageToHeightmap(imageData, heightmapSettings.maxHeight)
        heightmapDataRef.current = result

        setPreview({
          name: file.name,
          imageSrc: img.src,
          bounds: {
            width: img.width,
            depth: img.height,
            height: heightmapSettings.maxHeight,
          },
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = () => {
    if (!activeLayerId) {
      setError('No active layer')
      return
    }

    if (mode === 'stl' && meshDataRef.current) {
      const model = createModel3DFromSTL(
        meshDataRef.current,
        activeLayerId,
        preview?.name || 'Imported STL'
      )
      
      // Apply workspace-aware positioning
      if (importSettings.centerInWorkspace || importSettings.fitToWorkspace) {
        let scaleX = 1
        let scaleY = 1
        
        if (importSettings.fitToWorkspace && preview?.bounds) {
          const maxWidth = workspaceWidth * (importSettings.maxFitPercent / 100)
          const maxHeight = workspaceHeight * (importSettings.maxFitPercent / 100)
          
          const widthScale = maxWidth / preview.bounds.width
          const heightScale = maxHeight / preview.bounds.depth
          const uniformScale = Math.min(widthScale, heightScale, 1) // Don't scale up, only down
          
          scaleX = uniformScale
          scaleY = uniformScale
        }
        
        model.transform = {
          ...model.transform,
          x: workspaceWidth / 2,
          y: workspaceHeight / 2,
          scaleX,
          scaleY,
        }
      }
      
      addObject(model as any)
      onClose()
    } else if (mode === 'heightmap' && heightmapDataRef.current && preview?.imageSrc) {
      const model = createModel3DFromHeightmap(
        heightmapDataRef.current.heightmap,
        heightmapDataRef.current.width,
        heightmapDataRef.current.height,
        heightmapSettings.physicalWidth,
        heightmapSettings.physicalDepth,
        heightmapSettings.maxHeight,
        preview.imageSrc,
        activeLayerId,
        preview?.name || 'Heightmap'
      )
      
      // Center heightmap in workspace
      if (importSettings.centerInWorkspace) {
        model.transform = {
          ...model.transform,
          x: workspaceWidth / 2,
          y: workspaceHeight / 2,
        }
      }
      
      addObject(model as any)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[600px]">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              Import 3D Model
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'stl' ? 'default' : 'outline'}
              onClick={() => {
                setMode('stl')
                setPreview(null)
                meshDataRef.current = null
                heightmapDataRef.current = null
              }}
              className="flex-1"
            >
              <Box className="w-4 h-4 mr-2" />
              STL Mesh
            </Button>
            <Button
              variant={mode === 'heightmap' ? 'default' : 'outline'}
              onClick={() => {
                setMode('heightmap')
                setPreview(null)
                meshDataRef.current = null
                heightmapDataRef.current = null
              }}
              className="flex-1"
            >
              <Image className="w-4 h-4 mr-2" />
              Heightmap Image
            </Button>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              'hover:border-primary/50 hover:bg-primary/5',
              loading && 'pointer-events-none opacity-50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={mode === 'stl' ? '.stl' : '.png,.jpg,.jpeg,.bmp,.gif'}
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Processing...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {mode === 'stl' 
                    ? 'Click to select STL file or drag and drop'
                    : 'Click to select image file for heightmap'
                  }
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400 text-sm">
              {error}
            </div>
          )}

          {preview && (
            <div className="p-4 bg-accent/50 rounded-lg space-y-3">
              <div className="font-medium">{preview.name}</div>
              
              {preview.triangles !== undefined && (
                <div className="text-sm text-muted-foreground">
                  Triangles: {preview.triangles.toLocaleString()}
                </div>
              )}
              
              {preview.bounds && (
                <div className="text-sm text-muted-foreground">
                  Size: {preview.bounds.width.toFixed(2)} × {preview.bounds.depth.toFixed(2)} × {preview.bounds.height.toFixed(2)} mm
                </div>
              )}

              {preview.imageSrc && (
                <img 
                  src={preview.imageSrc} 
                  alt="Heightmap preview" 
                  className="max-h-32 mx-auto rounded"
                />
              )}
            </div>
          )}

          {preview && (
            <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Import Options</div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importSettings.centerInWorkspace}
                    onChange={(e) => setImportSettings(s => ({ ...s, centerInWorkspace: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Center in workspace</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importSettings.fitToWorkspace}
                    onChange={(e) => setImportSettings(s => ({ ...s, fitToWorkspace: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Fit to workspace (max {importSettings.maxFitPercent}%)</span>
                </label>
              </div>
              {preview.bounds && (
                <div className="text-xs text-muted-foreground">
                  Workspace: {workspaceWidth} × {workspaceHeight} mm
                  {importSettings.fitToWorkspace && preview.bounds.width > workspaceWidth * 0.8 && (
                    <span className="text-yellow-500 ml-2">
                      Model will be scaled down to fit
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'heightmap' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Max Height (mm)</label>
                <input
                  type="number"
                  value={heightmapSettings.maxHeight}
                  onChange={(e) => setHeightmapSettings(s => ({ ...s, maxHeight: Number(e.target.value) }))}
                  step="1"
                  min="1"
                  className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Width (mm)</label>
                <input
                  type="number"
                  value={heightmapSettings.physicalWidth}
                  onChange={(e) => setHeightmapSettings(s => ({ ...s, physicalWidth: Number(e.target.value) }))}
                  step="10"
                  min="10"
                  className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Depth (mm)</label>
                <input
                  type="number"
                  value={heightmapSettings.physicalDepth}
                  onChange={(e) => setHeightmapSettings(s => ({ ...s, physicalDepth: Number(e.target.value) }))}
                  step="10"
                  min="10"
                  className="w-full h-8 px-2 rounded bg-secondary border border-input text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleImport} disabled={!preview}>
              Import
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
