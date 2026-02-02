import { useStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Slider } from './ui/slider'
import { Button } from './ui/button'
import { Gauge, RotateCcw } from 'lucide-react'

export function OverrideControls() {
  const { 
    isConnected, 
    feedOverride, 
    rapidOverride, 
    spindleOverride,
    setFeedOverride,
    setRapidOverride,
    setSpindleOverride 
  } = useStore()

  const handleFeedChange = async (value: number) => {
    setFeedOverride(value)
    if (window.electronAPI && isConnected) {
      await window.electronAPI.grbl.feedOverride(value)
    }
  }

  const handleRapidChange = async (value: number) => {
    setRapidOverride(value)
    if (window.electronAPI && isConnected) {
      await window.electronAPI.grbl.rapidOverride(value)
    }
  }

  const handleSpindleChange = async (value: number) => {
    setSpindleOverride(value)
    if (window.electronAPI && isConnected) {
      await window.electronAPI.grbl.spindleOverride(value)
    }
  }

  const resetAll = async () => {
    await handleFeedChange(100)
    await handleRapidChange(100)
    await handleSpindleChange(100)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Overrides
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={resetAll}
            disabled={!isConnected}
            title="Reset All"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Feed</span>
            <span className="text-sm font-mono font-semibold">{feedOverride}%</span>
          </div>
          <Slider
            value={[feedOverride]}
            onValueChange={(values: number[]) => handleFeedChange(values[0])}
            min={10}
            max={200}
            step={10}
            disabled={!isConnected}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rapid</span>
            <span className="text-sm font-mono font-semibold">{rapidOverride}%</span>
          </div>
          <div className="flex gap-1">
            {[25, 50, 100].map((value) => (
              <Button
                key={value}
                variant={rapidOverride === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleRapidChange(value)}
                disabled={!isConnected}
                className="flex-1 text-xs"
              >
                {value}%
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Spindle</span>
            <span className="text-sm font-mono font-semibold">{spindleOverride}%</span>
          </div>
          <Slider
            value={[spindleOverride]}
            onValueChange={(values: number[]) => handleSpindleChange(values[0])}
            min={10}
            max={200}
            step={10}
            disabled={!isConnected}
          />
        </div>
      </CardContent>
    </Card>
  )
}
