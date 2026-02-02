import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { STATE_COLORS, STATE_BG_COLORS, ALARM_CODES } from '@/lib/utils'
import { Wifi, WifiOff, AlertTriangle, X } from 'lucide-react'
import { Button } from './ui/button'

export function StatusBar() {
  const { isConnected, portPath, status, activeWCS } = useStore()

  const state = status?.state || 'Disconnected'
  const isAlarm = state.startsWith('Alarm')
  const alarmCode = isAlarm ? parseInt(state.split(':')[1]) : null
  const alarmMessage = alarmCode ? ALARM_CODES[alarmCode] : null

  const handleClearAlarm = async () => {
    if (window.electronAPI) {
      await window.electronAPI.grbl.unlock()
    }
  }

  return (
    <div className={cn(
      'h-12 px-4 flex items-center justify-between border-b border-border',
      isAlarm ? 'bg-red-500/10 border-red-500/50' : 'bg-card'
    )}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">
            {isConnected ? portPath : 'Disconnected'}
          </span>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className={cn(
          'px-3 py-1 rounded-full text-sm font-semibold',
          STATE_BG_COLORS[state.split(':')[0]] || 'bg-muted',
          STATE_COLORS[state.split(':')[0]] || 'text-muted-foreground'
        )}>
          {state}
        </div>

        {isAlarm && alarmMessage && (
          <>
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-400">{alarmMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAlarm}
              className="text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Alarm
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">WCS:</span>
          <span className="text-sm font-mono font-semibold text-primary">{activeWCS}</span>
        </div>

        {status && (
          <>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>F: {status.feedRate} mm/min</span>
              <span>S: {status.spindleSpeed} RPM</span>
              <span>Ov: {status.overrides.feed}% / {status.overrides.rapid}% / {status.overrides.spindle}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
