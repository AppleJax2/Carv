import { useStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { formatTime, parseGcodeFile, estimateJobTime } from '@/lib/utils'
import { Play, Pause, Square, FileCode, Upload } from 'lucide-react'
import { useCallback } from 'react'

export function JobPanel() {
  const { 
    isConnected, 
    gcodeFile, 
    setGcodeFile, 
    jobProgress, 
    isJobRunning, 
    isJobPaused,
    setJobRunning,
    setJobPaused,
    setJobProgress,
    status 
  } = useStore()

  const canStart = isConnected && gcodeFile && !isJobRunning && status?.state === 'Idle'
  const canPause = isConnected && isJobRunning && !isJobPaused
  const canResume = isConnected && isJobRunning && isJobPaused
  const canStop = isConnected && isJobRunning

  const handleOpenFile = useCallback(async () => {
    if (!window.electronAPI) return
    
    const result = await window.electronAPI.dialog.openFile()
    if (result.canceled || !result.filePaths[0]) return

    const filePath = result.filePaths[0]
    const fileName = filePath.split(/[\\/]/).pop() || 'Unknown'
    
    const response = await fetch(`file://${filePath}`)
    const content = await response.text()
    const lines = parseGcodeFile(content)
    
    setGcodeFile({
      name: fileName,
      content: lines,
      path: filePath,
    })
  }, [setGcodeFile])

  const handleStart = async () => {
    if (!window.electronAPI || !gcodeFile) return
    
    setJobRunning(true)
    setJobPaused(false)
    
    const result = await window.electronAPI.grbl.startJob(gcodeFile.content)
    if (!result.success) {
      setJobRunning(false)
      console.error('Failed to start job:', result.error)
    }
  }

  const handlePause = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.grbl.feedHold()
    setJobPaused(true)
  }

  const handleResume = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.grbl.resume()
    setJobPaused(false)
  }

  const handleStop = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.grbl.stopJob()
    setJobRunning(false)
    setJobPaused(false)
    setJobProgress(null)
  }

  const estimatedTime = gcodeFile ? estimateJobTime(gcodeFile.content) : 0

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileCode className="w-4 h-4" />
          Job
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!gcodeFile ? (
          <div 
            className="flex-1 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={handleOpenFile}
          >
            <Upload className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Drop G-code file or click to browse</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{gcodeFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenFile}
                  className="text-xs"
                >
                  Change
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {gcodeFile.content.length} lines • Est. {formatTime(estimatedTime)}
              </div>
            </div>

            {jobProgress && (
              <div className="space-y-2">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${jobProgress.percentComplete}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Line {jobProgress.currentLine} / {jobProgress.totalLines}</span>
                  <span>{jobProgress.percentComplete.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Elapsed: {formatTime(jobProgress.elapsedTime)}</span>
                  <span>Remaining: {formatTime(jobProgress.estimatedRemaining)}</span>
                </div>
              </div>
            )}

            <div className="flex-1" />

            <div className="flex gap-2">
              {!isJobRunning ? (
                <Button
                  variant="success"
                  size="lg"
                  onClick={handleStart}
                  disabled={!canStart}
                  className="flex-1"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </Button>
              ) : (
                <>
                  {isJobPaused ? (
                    <Button
                      variant="success"
                      size="lg"
                      onClick={handleResume}
                      disabled={!canResume}
                      className="flex-1"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      variant="warning"
                      size="lg"
                      onClick={handlePause}
                      disabled={!canPause}
                      className="flex-1"
                    >
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleStop}
                    disabled={!canStop}
                  >
                    <Square className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
