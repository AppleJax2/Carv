import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'
import { useThemeStore, applyTheme } from '@/store/useThemeStore'
import type { GrblStatus, JobProgress } from '@/store/useStore'
import { StatusBar } from '@/components/StatusBar'
import { PositionDisplay } from '@/components/PositionDisplay'
import { JogControls } from '@/components/JogControls'
import { JobPanel } from '@/components/JobPanel'
import { Visualizer } from '@/components/Visualizer'
import { Console } from '@/components/Console'
import { ConnectionDialog } from '@/components/ConnectionDialog'
import { OverrideControls } from '@/components/OverrideControls'
import { DesignView } from '@/components/DesignView'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Settings, Cpu, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'

type AppMode = 'design' | 'control'

function App() {
  const [mode, setMode] = useState<AppMode>('design')
  const { currentTheme } = useThemeStore()
  
  const { 
    isConnected, 
    setStatus, 
    setJobProgress, 
    setJobRunning,
    addConsoleMessage 
  } = useStore()

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(currentTheme)
  }, [currentTheme])

  useEffect(() => {
    if (!window.electronAPI) return

    const unsubscribeData = window.electronAPI.grbl.onData((data: GrblStatus) => {
      setStatus(data)
      if (data.state) {
        addConsoleMessage('received', `<${data.state}|WPos:${data.workPosition.x},${data.workPosition.y},${data.workPosition.z}>`)
      }
    })

    const unsubscribeProgress = window.electronAPI.grbl.onJobProgress((progress: JobProgress) => {
      setJobProgress(progress)
      if (progress.percentComplete >= 100) {
        setJobRunning(false)
        setJobProgress(null)
        addConsoleMessage('info', 'Job completed!')
      }
    })

    return () => {
      unsubscribeData()
      unsubscribeProgress()
    }
  }, [setStatus, setJobProgress, setJobRunning, addConsoleMessage])

  if (mode === 'design') {
    return (
      <TooltipProvider>
        <DesignView onSwitchToControl={() => setMode('control')} />
      </TooltipProvider>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        <StatusBar />
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3 p-3">
            <PositionDisplay />
            <Visualizer />
            <div className="space-y-3">
              <JogControls />
              <OverrideControls />
            </div>
            <JobPanel />
          </div>

          <div className="w-80 border-l border-border p-3 flex flex-col gap-3">
            <ConnectionDialog />
            
            <div className="flex-1" />
            
            <div className="space-y-2">
              <Button variant="default" className="w-full justify-start" onClick={() => setMode('design')}>
                <PenTool className="w-4 h-4 mr-2" />
                Design Mode
              </Button>
              <Button variant="ghost" className="w-full justify-start" disabled={!isConnected}>
                <Cpu className="w-4 h-4 mr-2" />
                Machine Settings
              </Button>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                App Settings
              </Button>
            </div>
          </div>
        </div>

        <Console />
      </div>
    </TooltipProvider>
  )
}

export default App
