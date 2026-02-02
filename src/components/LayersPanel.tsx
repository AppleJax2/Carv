import { useDesignStore } from '@/store/useDesignStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { 
  Layers, 
  Plus, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'

export function LayersPanel() {
  const {
    project,
    activeLayerId,
    selectedObjectIds,
    setActiveLayer,
    addLayer,
    updateLayer,
    deleteLayer,
    selectObjects,
  } = useDesignStore()

  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set(['default']))

  if (!project) return null

  const toggleLayerExpanded = (layerId: string) => {
    const newExpanded = new Set(expandedLayers)
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId)
    } else {
      newExpanded.add(layerId)
    }
    setExpandedLayers(newExpanded)
  }

  const handleAddLayer = () => {
    const layerNum = project.layers.length + 1
    addLayer(`Layer ${layerNum}`)
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers
          </CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={handleAddLayer}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {[...project.layers].reverse().map((layer) => {
            const layerObjects = project.objects.filter(obj => obj.layerId === layer.id)
            const isExpanded = expandedLayers.has(layer.id)
            const isActive = activeLayerId === layer.id

            return (
              <div key={layer.id}>
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                    isActive ? 'bg-primary/20' : 'hover:bg-accent'
                  )}
                  onClick={() => setActiveLayer(layer.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLayerExpanded(layer.id)
                    }}
                    className="p-0.5 hover:bg-accent rounded"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>

                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: layer.color }}
                  />

                  <span className="flex-1 text-sm truncate">{layer.name}</span>

                  <span className="text-xs text-muted-foreground">
                    {layerObjects.length}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateLayer(layer.id, { visible: !layer.visible })
                    }}
                    className="p-0.5 hover:bg-accent rounded"
                  >
                    {layer.visible ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-muted-foreground" />
                    )}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateLayer(layer.id, { locked: !layer.locked })
                    }}
                    className="p-0.5 hover:bg-accent rounded"
                  >
                    {layer.locked ? (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    ) : (
                      <Unlock className="w-3 h-3" />
                    )}
                  </button>

                  {project.layers.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteLayer(layer.id)
                      }}
                      className="p-0.5 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {isExpanded && layerObjects.length > 0 && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {layerObjects.map((obj) => (
                      <div
                        key={obj.id}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors',
                          selectedObjectIds.includes(obj.id)
                            ? 'bg-primary/20 text-primary'
                            : 'hover:bg-accent text-muted-foreground'
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (e.shiftKey) {
                            if (selectedObjectIds.includes(obj.id)) {
                              selectObjects(selectedObjectIds.filter(id => id !== obj.id))
                            } else {
                              selectObjects([...selectedObjectIds, obj.id])
                            }
                          } else {
                            selectObjects([obj.id])
                          }
                        }}
                      >
                        <span className="truncate">{obj.name}</span>
                        <span className="text-[10px] opacity-50">{obj.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
