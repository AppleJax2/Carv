import { useStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Slider } from './ui/slider'
import { 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  ChevronUp, ChevronDown, Move, StopCircle 
} from 'lucide-react'
import { useCallback, useEffect } from 'react'

const JOG_PRESETS = [0.1, 1, 10, 100]

export function JogControls() {
  const { 
    isConnected, 
    jogDistance, 
    jogFeedRate, 
    setJogDistance, 
    setJogFeedRate,
    status 
  } = useStore()

  const isIdle = status?.state === 'Idle' || status?.state === 'Jog'

  const handleJog = useCallback(async (axis: string, direction: number) => {
    if (!window.electronAPI || !isConnected) return
    const distance = jogDistance * direction
    await window.electronAPI.grbl.jog(axis, distance, jogFeedRate)
  }, [isConnected, jogDistance, jogFeedRate])

  const handleJogCancel = async () => {
    if (window.electronAPI) {
      await window.electronAPI.grbl.jogCancel()
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isConnected || !isIdle) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          handleJog('Y', 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          handleJog('Y', -1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleJog('X', -1)
          break
        case 'ArrowRight':
          e.preventDefault()
          handleJog('X', 1)
          break
        case 'PageUp':
          e.preventDefault()
          handleJog('Z', 1)
          break
        case 'PageDown':
          e.preventDefault()
          handleJog('Z', -1)
          break
        case '1':
          setJogDistance(0.1)
          break
        case '2':
          setJogDistance(1)
          break
        case '3':
          setJogDistance(10)
          break
        case '4':
          setJogDistance(100)
          break
        case 'Escape':
          handleJogCancel()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isConnected, isIdle, handleJog, setJogDistance])

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Move className="w-4 h-4" />
          Jog Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="grid grid-cols-3 gap-1">
            <div />
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={() => handleJog('Y', 1)}
              disabled={!isConnected || !isIdle}
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
            <div />
            
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={() => handleJog('X', -1)}
              disabled={!isConnected || !isIdle}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="destructive"
              size="icon-lg"
              onClick={handleJogCancel}
              disabled={!isConnected}
            >
              <StopCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={() => handleJog('X', 1)}
              disabled={!isConnected || !isIdle}
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            
            <div />
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={() => handleJog('Y', -1)}
              disabled={!isConnected || !isIdle}
            >
              <ArrowDown className="w-5 h-5" />
            </Button>
            <div />
          </div>

          <div className="ml-4 flex flex-col gap-1">
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={() => handleJog('Z', 1)}
              disabled={!isConnected || !isIdle}
              className="bg-blue-500/20 hover:bg-blue-500/30"
            >
              <ChevronUp className="w-5 h-5" />
            </Button>
            <div className="text-center text-xs text-muted-foreground font-medium">Z</div>
            <Button
              variant="secondary"
              size="icon-lg"
              onClick={() => handleJog('Z', -1)}
              disabled={!isConnected || !isIdle}
              className="bg-blue-500/20 hover:bg-blue-500/30"
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Step Size</span>
            <span className="text-sm font-mono font-semibold">{jogDistance} mm</span>
          </div>
          <div className="flex gap-1">
            {JOG_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={jogDistance === preset ? 'default' : 'outline'}
                size="sm"
                onClick={() => setJogDistance(preset)}
                className="flex-1 text-xs"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Feed Rate</span>
            <span className="text-sm font-mono font-semibold">{jogFeedRate} mm/min</span>
          </div>
          <Slider
            value={[jogFeedRate]}
            onValueChange={([value]) => setJogFeedRate(value)}
            min={100}
            max={5000}
            step={100}
          />
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Arrow keys: X/Y • Page Up/Down: Z • 1-4: Step size • Esc: Stop
        </div>
      </CardContent>
    </Card>
  )
}
