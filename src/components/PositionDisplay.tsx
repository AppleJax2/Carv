import { useStore } from '@/store/useStore'
import { formatNumber } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Crosshair, Home, Navigation } from 'lucide-react'

export function PositionDisplay() {
  const { status, isConnected } = useStore()

  const machinePos = status?.machinePosition || { x: 0, y: 0, z: 0 }
  const workPos = status?.workPosition || { x: 0, y: 0, z: 0 }

  const handleSetZero = async (axis: string) => {
    if (window.electronAPI) {
      await window.electronAPI.grbl.setZero(axis)
    }
  }

  const handleGoToZero = async (axis: string) => {
    if (window.electronAPI) {
      await window.electronAPI.grbl.goToZero(axis)
    }
  }

  const handleHome = async () => {
    if (window.electronAPI) {
      await window.electronAPI.grbl.home()
    }
  }

  const axes = ['X', 'Y', 'Z'] as const

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            Position
          </CardTitle>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleHome}
            disabled={!isConnected}
            title="Home All Axes"
          >
            <Home className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center text-sm">
          <div className="text-muted-foreground text-xs font-medium w-6"></div>
          <div className="text-muted-foreground text-xs font-medium text-center">Work</div>
          <div className="text-muted-foreground text-xs font-medium text-center">Machine</div>
          <div className="w-8"></div>
          <div className="w-8"></div>
        </div>

        {axes.map((axis) => {
          const workValue = workPos[axis.toLowerCase() as 'x' | 'y' | 'z']
          const machineValue = machinePos[axis.toLowerCase() as 'x' | 'y' | 'z']
          const color = axis === 'X' ? 'text-red-400' : axis === 'Y' ? 'text-green-400' : 'text-blue-400'

          return (
            <div key={axis} className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center">
              <span className={`font-bold text-lg ${color}`}>{axis}</span>
              <div className="font-mono-display text-xl font-semibold text-right pr-2">
                {formatNumber(workValue)}
              </div>
              <div className="font-mono-display text-sm text-muted-foreground text-right pr-2">
                {formatNumber(machineValue)}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleSetZero(axis)}
                disabled={!isConnected}
                title={`Zero ${axis}`}
                className="h-7 w-7"
              >
                <span className="text-xs font-bold">0</span>
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleGoToZero(axis)}
                disabled={!isConnected}
                title={`Go to ${axis} Zero`}
                className="h-7 w-7"
              >
                <Navigation className="w-3 h-3" />
              </Button>
            </div>
          )
        })}

        <div className="pt-2 border-t border-border">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetZero('ALL')}
              disabled={!isConnected}
              className="flex-1 text-xs"
            >
              Zero All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGoToZero('ALL')}
              disabled={!isConnected}
              className="flex-1 text-xs"
            >
              Go to Zero
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
