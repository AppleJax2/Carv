import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { generateGcode, type GeneratedGcode } from '@/lib/gcodeGenerator'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { 
  FileDown, 
  X, 
  Play, 
  Check, 
  AlertCircle,
  Copy,
  Download,
  Clock,
  Ruler,
  Layers
} from 'lucide-react'

interface ExportDialogProps {
  onClose: () => void
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const { project, tools, machineConfig } = useDesignStore()
  
  const [selectedToolpaths, setSelectedToolpaths] = useState<Set<string>>(
    new Set(project?.toolpaths.filter(t => t.enabled).map(t => t.id) || [])
  )
  const [generatedGcode, setGeneratedGcode] = useState<GeneratedGcode | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!project || !machineConfig) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="w-[500px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Cannot Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {!project ? 'No project is open.' : 'Machine configuration is required to export G-code.'}
            </p>
            <Button onClick={onClose}>Close</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const toggleToolpath = (id: string) => {
    const newSelected = new Set(selectedToolpaths)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedToolpaths(newSelected)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    setGeneratedGcode(null)

    try {
      const allGcode: string[] = []
      let totalTime = 0
      let combinedStats = {
        totalDistance: 0,
        cuttingDistance: 0,
        rapidDistance: 0,
        plunges: 0,
        retracts: 0,
      }
      let combinedBounds = {
        minX: Infinity,
        minY: Infinity,
        maxX: -Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity,
      }

      const selectedToolpathsList = project.toolpaths.filter(t => selectedToolpaths.has(t.id))
      
      if (selectedToolpathsList.length === 0) {
        throw new Error('No toolpaths selected')
      }

      for (const toolpath of selectedToolpathsList) {
        const tool = tools.find(t => t.id === toolpath.toolId)
        if (!tool) {
          throw new Error(`Tool not found for toolpath "${toolpath.name}"`)
        }

        const result = generateGcode({
          toolpath,
          tool,
          objects: project.objects,
          machineConfig,
          postProcessor: machineConfig.postProcessor,
        })

        allGcode.push(`; === ${toolpath.name} ===`)
        allGcode.push(...result.gcode)
        allGcode.push('')

        totalTime += result.estimatedTime
        combinedStats.totalDistance += result.stats.totalDistance
        combinedStats.cuttingDistance += result.stats.cuttingDistance
        combinedStats.rapidDistance += result.stats.rapidDistance
        combinedStats.plunges += result.stats.plunges
        combinedStats.retracts += result.stats.retracts

        combinedBounds.minX = Math.min(combinedBounds.minX, result.boundingBox.minX)
        combinedBounds.minY = Math.min(combinedBounds.minY, result.boundingBox.minY)
        combinedBounds.maxX = Math.max(combinedBounds.maxX, result.boundingBox.maxX)
        combinedBounds.maxY = Math.max(combinedBounds.maxY, result.boundingBox.maxY)
        combinedBounds.minZ = Math.min(combinedBounds.minZ, result.boundingBox.minZ)
        combinedBounds.maxZ = Math.max(combinedBounds.maxZ, result.boundingBox.maxZ)
      }

      setGeneratedGcode({
        gcode: allGcode,
        estimatedTime: totalTime,
        boundingBox: combinedBounds,
        stats: combinedStats,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate G-code')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!generatedGcode) return
    navigator.clipboard.writeText(generatedGcode.gcode.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!generatedGcode) return
    const blob = new Blob([generatedGcode.gcode.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name}.nc`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[800px] max-h-[80vh] flex flex-col">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Export G-code
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-hidden p-0 flex">
          <div className="w-64 border-r border-border p-4 overflow-y-auto">
            <div className="text-sm font-medium mb-3">Toolpaths</div>
            
            {project.toolpaths.length === 0 ? (
              <p className="text-xs text-muted-foreground">No toolpaths defined</p>
            ) : (
              <div className="space-y-1">
                {project.toolpaths.map((toolpath) => {
                  const tool = tools.find(t => t.id === toolpath.toolId)
                  return (
                    <label
                      key={toolpath.id}
                      className={cn(
                        'flex items-start gap-2 p-2 rounded cursor-pointer transition-colors',
                        selectedToolpaths.has(toolpath.id) ? 'bg-primary/10' : 'hover:bg-accent'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedToolpaths.has(toolpath.id)}
                        onChange={() => toggleToolpath(toolpath.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{toolpath.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {tool?.name || 'No tool'} • {toolpath.type}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <Button 
                onClick={handleGenerate} 
                disabled={generating || selectedToolpaths.size === 0}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate G-code'}
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-md text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {generatedGcode ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Generated G-code</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button size="sm" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-1" />
                      Download .nc
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      Estimated Time
                    </div>
                    <div className="text-lg font-semibold">
                      {formatTime(generatedGcode.estimatedTime)}
                    </div>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Ruler className="w-3 h-3" />
                      Total Distance
                    </div>
                    <div className="text-lg font-semibold">
                      {(generatedGcode.stats.totalDistance / 1000).toFixed(2)} m
                    </div>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Layers className="w-3 h-3" />
                      Lines
                    </div>
                    <div className="text-lg font-semibold">
                      {generatedGcode.gcode.length.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2 bg-accent/30 rounded">
                    <span className="text-muted-foreground">Cutting: </span>
                    <span>{(generatedGcode.stats.cuttingDistance / 1000).toFixed(2)} m</span>
                  </div>
                  <div className="p-2 bg-accent/30 rounded">
                    <span className="text-muted-foreground">Rapid: </span>
                    <span>{(generatedGcode.stats.rapidDistance / 1000).toFixed(2)} m</span>
                  </div>
                  <div className="p-2 bg-accent/30 rounded">
                    <span className="text-muted-foreground">Plunges: </span>
                    <span>{generatedGcode.stats.plunges}</span>
                  </div>
                  <div className="p-2 bg-accent/30 rounded">
                    <span className="text-muted-foreground">Retracts: </span>
                    <span>{generatedGcode.stats.retracts}</span>
                  </div>
                </div>

                <div className="p-2 bg-accent/30 rounded text-xs">
                  <span className="text-muted-foreground">Bounding Box: </span>
                  <span>
                    X: {generatedGcode.boundingBox.minX.toFixed(2)} to {generatedGcode.boundingBox.maxX.toFixed(2)} mm, 
                    Y: {generatedGcode.boundingBox.minY.toFixed(2)} to {generatedGcode.boundingBox.maxY.toFixed(2)} mm,
                    Z: {generatedGcode.boundingBox.minZ.toFixed(2)} to {generatedGcode.boundingBox.maxZ.toFixed(2)} mm
                  </span>
                </div>

                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-[#1a1a2e] p-3 max-h-64 overflow-y-auto font-mono text-xs">
                    {generatedGcode.gcode.slice(0, 200).map((line, i) => (
                      <div key={i} className={cn(
                        'py-0.5',
                        line.startsWith(';') ? 'text-green-400' : 
                        line.startsWith('G0') ? 'text-yellow-400' :
                        line.startsWith('G1') ? 'text-blue-400' :
                        'text-gray-300'
                      )}>
                        {line || ' '}
                      </div>
                    ))}
                    {generatedGcode.gcode.length > 200 && (
                      <div className="text-muted-foreground py-2">
                        ... {generatedGcode.gcode.length - 200} more lines
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileDown className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select toolpaths and click Generate</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
