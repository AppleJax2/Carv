import { useState, useCallback } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { parseSVG, parseDXF } from '@/lib/svgParser'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { FileUp, X, AlertCircle, Check, Loader2 } from 'lucide-react'

interface ImportDialogProps {
  onClose: () => void
}

export function ImportDialog({ onClose }: ImportDialogProps) {
  const { project, activeLayerId, addObject } = useDesignStore()
  
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  
  const [options, setOptions] = useState({
    scale: 1,
    centerOnCanvas: true,
    flipY: true,
  })

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }, [])

  const handleFileSelect = async (selectedFile: File) => {
    setError(null)
    setImportedCount(0)
    
    const ext = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['svg', 'dxf'].includes(ext || '')) {
      setError('Unsupported file format. Please use SVG or DXF files.')
      return
    }
    
    setFile(selectedFile)
    
    if (ext === 'svg') {
      const text = await selectedFile.text()
      setPreview(text)
    } else {
      setPreview(null)
    }
  }

  const handleImport = async () => {
    if (!file || !project || !activeLayerId) return
    
    setImporting(true)
    setError(null)
    
    try {
      const content = await file.text()
      const ext = file.name.split('.').pop()?.toLowerCase()
      
      let objects
      if (ext === 'svg') {
        const parsed = parseSVG(content, activeLayerId)
        objects = parsed.objects
      } else if (ext === 'dxf') {
        objects = parseDXF(content, activeLayerId)
      } else {
        throw new Error('Unsupported format')
      }
      
      if (objects.length === 0) {
        setError('No valid objects found in file')
        setImporting(false)
        return
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const obj of objects) {
        minX = Math.min(minX, obj.transform.x)
        minY = Math.min(minY, obj.transform.y)
        maxX = Math.max(maxX, obj.transform.x)
        maxY = Math.max(maxY, obj.transform.y)
      }
      
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      
      const canvasCenterX = project.canvas.width / 2
      const canvasCenterY = project.canvas.height / 2

      for (const obj of objects) {
        let x = obj.transform.x
        let y = obj.transform.y
        
        if (options.scale !== 1) {
          x = centerX + (x - centerX) * options.scale
          y = centerY + (y - centerY) * options.scale
          obj.transform.scaleX *= options.scale
          obj.transform.scaleY *= options.scale
        }
        
        if (options.flipY) {
          y = centerY + (centerY - y)
          obj.transform.scaleY *= -1
        }
        
        if (options.centerOnCanvas) {
          x = x - centerX + canvasCenterX
          y = y - centerY + canvasCenterY
        }
        
        obj.transform.x = x
        obj.transform.y = y
        
        addObject(obj)
      }
      
      setImportedCount(objects.length)
      
      setTimeout(() => {
        onClose()
      }, 1000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[600px] max-h-[80vh] flex flex-col">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Import Vector File
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
          >
            {file ? (
              <div className="space-y-2">
                <div className="text-lg font-medium">{file.name}</div>
                <div className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setPreview(null)
                    setError(null)
                  }}
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <FileUp className="w-12 h-12 mx-auto text-muted-foreground" />
                <div className="text-lg">Drop SVG or DXF file here</div>
                <div className="text-sm text-muted-foreground">or</div>
                <label>
                  <input
                    type="file"
                    accept=".svg,.dxf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleFileSelect(f)
                    }}
                  />
                  <Button variant="outline" className="cursor-pointer">
                    Browse Files
                  </Button>
                </label>
              </div>
            )}
          </div>

          {preview && (
            <div className="border border-border rounded-lg p-4 bg-white">
              <div className="text-xs text-muted-foreground mb-2">Preview</div>
              <div 
                className="max-h-48 overflow-hidden flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>
          )}

          {file && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Import Options</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Scale</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={options.scale}
                      onChange={(e) => setOptions({ ...options, scale: Number(e.target.value) })}
                      step="0.1"
                      min="0.01"
                      className="flex-1 h-8 px-2 rounded bg-secondary border border-input text-sm"
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Quick Scale</label>
                  <div className="flex gap-1">
                    {[0.1, 0.5, 1, 2, 10].map((s) => (
                      <Button
                        key={s}
                        variant={options.scale === s ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1 text-xs px-1"
                        onClick={() => setOptions({ ...options, scale: s })}
                      >
                        {s}×
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.centerOnCanvas}
                    onChange={(e) => setOptions({ ...options, centerOnCanvas: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Center on canvas</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.flipY}
                    onChange={(e) => setOptions({ ...options, flipY: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Flip Y axis (SVG to CNC)</span>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-md text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {importedCount > 0 && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-md text-green-400">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Successfully imported {importedCount} object(s)</span>
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || importing || importedCount > 0}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4 mr-2" />
                Import
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
