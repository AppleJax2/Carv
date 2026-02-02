import { useDesignStore } from '@/store/useDesignStore'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { performBooleanOperation, canPerformBoolean, type BooleanOperation } from '@/lib/booleanOps'
import { Combine, Minus, Circle, XCircle } from 'lucide-react'

export function BooleanToolbar() {
  const { 
    project, 
    selectedObjectIds, 
    activeLayerId,
    addObject, 
    deleteObjects,
    selectObjects 
  } = useDesignStore()

  if (!project || selectedObjectIds.length !== 2) return null

  const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
  const canBoolean = canPerformBoolean(selectedObjects)

  if (!canBoolean) return null

  const handleBoolean = (operation: BooleanOperation) => {
    if (!activeLayerId || selectedObjects.length !== 2) return

    const result = performBooleanOperation(
      selectedObjects[0],
      selectedObjects[1],
      operation,
      activeLayerId
    )

    if (result) {
      deleteObjects(selectedObjectIds)
      addObject(result)
      selectObjects([result.id])
    }
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border rounded-lg p-1 flex gap-1 shadow-lg z-10">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => handleBoolean('union')}>
            <Combine className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Union (combine shapes)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => handleBoolean('subtract')}>
            <Minus className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Subtract (cut second from first)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => handleBoolean('intersect')}>
            <Circle className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Intersect (keep overlap)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => handleBoolean('xor')}>
            <XCircle className="w-4 h-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exclude (remove overlap)</TooltipContent>
      </Tooltip>
    </div>
  )
}
