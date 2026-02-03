import { useState, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select'
import { cn } from '@/lib/utils'
import {
  Target,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Crosshair,
  Square,
  Circle,
  Box,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Settings2,
  Wrench,
  Move,
  History,
  Info,
  CircleDot,
  CornerLeftDown,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

type ProbeRoutine = 'z-only' | 'xyz-corner' | 'x-edge' | 'y-edge' | 'center' | 'tlo'
type ProbeCorner = 'front-left' | 'front-right' | 'back-left' | 'back-right'
type ProbeEdge = 'left' | 'right' | 'front' | 'back'
type ProbeDirection = 'inside' | 'outside'

interface ProbeSettings {
  // Touch plate settings
  touchPlateThickness: number
  touchPlatePresets: { name: string; thickness: number }[]
  selectedPreset: string
  
  // Probe speeds
  fastFeedRate: number   // Initial fast probe
  slowFeedRate: number   // Slow confirmation probe
  seekDistance: number   // Max distance to seek
  retractDistance: number // Distance to retract after contact
  
  // XYZ probe block dimensions (for corner/edge probing)
  probeBlockWidth: number
  probeBlockLength: number
  probeBlockHeight: number
  
  // Safety
  clearanceHeight: number // Height to raise before XY moves
}

interface ProbeResult {
  timestamp: Date
  routine: ProbeRoutine
  position: { x: number; y: number; z: number }
  success: boolean
  appliedToWCS: boolean
}

const DEFAULT_SETTINGS: ProbeSettings = {
  touchPlateThickness: 19.0,
  touchPlatePresets: [
    { name: 'Standard (19mm)', thickness: 19.0 },
    { name: 'Thin (12.7mm)', thickness: 12.7 },
    { name: 'Thick (25.4mm)', thickness: 25.4 },
    { name: 'Custom', thickness: 0 },
  ],
  selectedPreset: 'Standard (19mm)',
  fastFeedRate: 100,
  slowFeedRate: 25,
  seekDistance: 50,
  retractDistance: 2,
  probeBlockWidth: 50,
  probeBlockLength: 50,
  probeBlockHeight: 50,
  clearanceHeight: 10,
}

// ============================================================================
// Probe Module Component
// ============================================================================

interface ProbeModuleProps {
  className?: string
  compact?: boolean // For embedding in panels
  onClose?: () => void
}

export function ProbeModule({ className, onClose }: ProbeModuleProps) {
  const { isConnected, status } = useStore()
  
  // State
  const [activeRoutine, setActiveRoutine] = useState<ProbeRoutine>('z-only')
  const [settings, setSettings] = useState<ProbeSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [probeHistory, setProbeHistory] = useState<ProbeResult[]>([])
  
  // Probe state
  const [isProbing, setIsProbing] = useState(false)
  const [probeStep, setProbeStep] = useState<string>('')
  const [lastResult, setLastResult] = useState<ProbeResult | null>(null)
  const [probeError, setProbeError] = useState<string | null>(null)
  
  // Routine-specific state
  const [selectedCorner, setSelectedCorner] = useState<ProbeCorner>('front-left')
  const [selectedEdge, setSelectedEdge] = useState<ProbeEdge>('left')
  const [probeDirection, setProbeDirection] = useState<ProbeDirection>('outside')
  
  // Jog state
  const [jogStep, setJogStep] = useState(1)
  
  const isIdle = status?.state === 'Idle' || status?.state === 'Jog'
  const canProbe = isConnected && isIdle && !isProbing
  
  // Check if probe is currently triggered (for continuity check)
  const probeTriggered = status?.pins?.includes?.('P') || false

  // ============================================================================
  // Probe Execution
  // ============================================================================

  const executeProbeZ = useCallback(async () => {
    if (!window.electronAPI || !canProbe) return
    
    setIsProbing(true)
    setProbeError(null)
    setProbeStep('Probing Z...')
    
    try {
      // Fast probe
      setProbeStep('Fast probe down...')
      await window.electronAPI.grbl.send(
        `G38.2 Z-${settings.seekDistance} F${settings.fastFeedRate}`
      )
      
      // Retract
      setProbeStep('Retracting...')
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Z${settings.retractDistance}`)
      
      // Slow probe for accuracy
      setProbeStep('Slow probe for accuracy...')
      await window.electronAPI.grbl.send(
        `G38.2 Z-${settings.retractDistance + 1} F${settings.slowFeedRate}`
      )
      
      // Get position and calculate Z zero
      await window.electronAPI.grbl.send(`G90`)
      const currentPos = status?.workPosition || { x: 0, y: 0, z: 0 }
      
      // Set Z zero accounting for touch plate thickness
      setProbeStep('Setting Z zero...')
      await window.electronAPI.grbl.send(
        `G10 L20 P1 Z${settings.touchPlateThickness}`
      )
      
      // Retract to safe height
      setProbeStep('Retracting to safe height...')
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Z${settings.clearanceHeight}`)
      await window.electronAPI.grbl.send(`G90`)
      
      const result: ProbeResult = {
        timestamp: new Date(),
        routine: 'z-only',
        position: { ...currentPos },
        success: true,
        appliedToWCS: true,
      }
      
      setLastResult(result)
      setProbeHistory(prev => [result, ...prev].slice(0, 10))
      setProbeStep('Z probe complete!')
      
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : 'Probe failed')
      setProbeStep('')
    } finally {
      setIsProbing(false)
    }
  }, [canProbe, settings, status?.workPosition])

  const executeProbeXYZCorner = useCallback(async () => {
    if (!window.electronAPI || !canProbe) return
    
    setIsProbing(true)
    setProbeError(null)
    
    try {
      // Step 1: Probe Z first
      setProbeStep('Step 1/3: Probing Z...')
      await window.electronAPI.grbl.send(
        `G38.2 Z-${settings.seekDistance} F${settings.fastFeedRate}`
      )
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Z${settings.retractDistance}`)
      await window.electronAPI.grbl.send(
        `G38.2 Z-${settings.retractDistance + 1} F${settings.slowFeedRate}`
      )
      
      // Set Z zero
      await window.electronAPI.grbl.send(`G90`)
      await window.electronAPI.grbl.send(
        `G10 L20 P1 Z${settings.probeBlockHeight}`
      )
      
      // Raise to clearance
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Z${settings.clearanceHeight}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Step 2: Probe X
      setProbeStep('Step 2/3: Probing X...')
      const xDir = selectedCorner.includes('left') ? 1 : -1
      
      // Move to X probe position (beside the block)
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 X${xDir * (settings.probeBlockWidth / 2 + 10)}`)
      await window.electronAPI.grbl.send(`G0 Z-${settings.clearanceHeight - 5}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Probe X
      await window.electronAPI.grbl.send(
        `G38.2 X${-xDir * settings.seekDistance} F${settings.fastFeedRate}`
      )
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 X${xDir * settings.retractDistance}`)
      await window.electronAPI.grbl.send(
        `G38.2 X${-xDir * (settings.retractDistance + 1)} F${settings.slowFeedRate}`
      )
      
      // Set X zero
      await window.electronAPI.grbl.send(`G90`)
      const xOffset = xDir * (settings.probeBlockWidth / 2)
      await window.electronAPI.grbl.send(`G10 L20 P1 X${xOffset}`)
      
      // Retract and raise
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 X${xDir * 10}`)
      await window.electronAPI.grbl.send(`G0 Z${settings.clearanceHeight - 5}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Step 3: Probe Y
      setProbeStep('Step 3/3: Probing Y...')
      const yDir = selectedCorner.includes('front') ? 1 : -1
      
      // Move to Y probe position
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Y${yDir * (settings.probeBlockLength / 2 + 10)}`)
      await window.electronAPI.grbl.send(`G0 Z-${settings.clearanceHeight - 5}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Probe Y
      await window.electronAPI.grbl.send(
        `G38.2 Y${-yDir * settings.seekDistance} F${settings.fastFeedRate}`
      )
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Y${yDir * settings.retractDistance}`)
      await window.electronAPI.grbl.send(
        `G38.2 Y${-yDir * (settings.retractDistance + 1)} F${settings.slowFeedRate}`
      )
      
      // Set Y zero
      await window.electronAPI.grbl.send(`G90`)
      const yOffset = yDir * (settings.probeBlockLength / 2)
      await window.electronAPI.grbl.send(`G10 L20 P1 Y${yOffset}`)
      
      // Final retract
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Y${yDir * 10}`)
      await window.electronAPI.grbl.send(`G0 Z${settings.clearanceHeight}`)
      await window.electronAPI.grbl.send(`G90`)
      
      const currentPos = status?.workPosition || { x: 0, y: 0, z: 0 }
      const result: ProbeResult = {
        timestamp: new Date(),
        routine: 'xyz-corner',
        position: { ...currentPos },
        success: true,
        appliedToWCS: true,
      }
      
      setLastResult(result)
      setProbeHistory(prev => [result, ...prev].slice(0, 10))
      setProbeStep('XYZ corner probe complete!')
      
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : 'Probe failed')
      setProbeStep('')
      // Try to return to safe position
      try {
        await window.electronAPI.grbl.send(`G90`)
        await window.electronAPI.grbl.send(`G91`)
        await window.electronAPI.grbl.send(`G0 Z${settings.clearanceHeight}`)
        await window.electronAPI.grbl.send(`G90`)
      } catch {}
    } finally {
      setIsProbing(false)
    }
  }, [canProbe, settings, selectedCorner, status?.workPosition])

  const executeProbeEdge = useCallback(async (edge: ProbeEdge) => {
    if (!window.electronAPI || !canProbe) return
    
    setIsProbing(true)
    setProbeError(null)
    
    const isXAxis = edge === 'left' || edge === 'right'
    const axis = isXAxis ? 'X' : 'Y'
    const dir = (edge === 'left' || edge === 'front') ? 1 : -1
    
    try {
      setProbeStep(`Probing ${edge} edge...`)
      
      // Fast probe
      await window.electronAPI.grbl.send(
        `G38.2 ${axis}${-dir * settings.seekDistance} F${settings.fastFeedRate}`
      )
      
      // Retract
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 ${axis}${dir * settings.retractDistance}`)
      
      // Slow probe
      await window.electronAPI.grbl.send(
        `G38.2 ${axis}${-dir * (settings.retractDistance + 1)} F${settings.slowFeedRate}`
      )
      
      await window.electronAPI.grbl.send(`G90`)
      
      // Set zero with offset for probe block
      const offset = probeDirection === 'outside' 
        ? dir * (isXAxis ? settings.probeBlockWidth / 2 : settings.probeBlockLength / 2)
        : 0
      await window.electronAPI.grbl.send(`G10 L20 P1 ${axis}${offset}`)
      
      // Retract
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 ${axis}${dir * 10}`)
      await window.electronAPI.grbl.send(`G90`)
      
      const currentPos = status?.workPosition || { x: 0, y: 0, z: 0 }
      const result: ProbeResult = {
        timestamp: new Date(),
        routine: isXAxis ? 'x-edge' : 'y-edge',
        position: { ...currentPos },
        success: true,
        appliedToWCS: true,
      }
      
      setLastResult(result)
      setProbeHistory(prev => [result, ...prev].slice(0, 10))
      setProbeStep(`${edge} edge probe complete!`)
      
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : 'Probe failed')
      setProbeStep('')
    } finally {
      setIsProbing(false)
    }
  }, [canProbe, settings, probeDirection, status?.workPosition])

  const executeProbeCenter = useCallback(async () => {
    if (!window.electronAPI || !canProbe) return
    
    setIsProbing(true)
    setProbeError(null)
    
    try {
      // Probe in 4 directions to find center
      const measurements: { x1: number; x2: number; y1: number; y2: number } = {
        x1: 0, x2: 0, y1: 0, y2: 0
      }
      
      // Probe -X
      setProbeStep('Probing -X...')
      await window.electronAPI.grbl.send(
        `G38.2 X-${settings.seekDistance} F${settings.fastFeedRate}`
      )
      measurements.x1 = status?.workPosition?.x || 0
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 X${settings.retractDistance}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Move to other side
      setProbeStep('Moving to +X side...')
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 X${settings.seekDistance * 2}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Probe +X
      setProbeStep('Probing +X...')
      await window.electronAPI.grbl.send(
        `G38.2 X${settings.seekDistance} F${settings.fastFeedRate}`
      )
      measurements.x2 = status?.workPosition?.x || 0
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 X-${settings.retractDistance}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Calculate X center and move there
      const xCenter = (measurements.x1 + measurements.x2) / 2
      await window.electronAPI.grbl.send(`G0 X${xCenter}`)
      
      // Probe -Y
      setProbeStep('Probing -Y...')
      await window.electronAPI.grbl.send(
        `G38.2 Y-${settings.seekDistance} F${settings.fastFeedRate}`
      )
      measurements.y1 = status?.workPosition?.y || 0
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Y${settings.retractDistance}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Move to other side
      setProbeStep('Moving to +Y side...')
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Y${settings.seekDistance * 2}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Probe +Y
      setProbeStep('Probing +Y...')
      await window.electronAPI.grbl.send(
        `G38.2 Y${settings.seekDistance} F${settings.fastFeedRate}`
      )
      measurements.y2 = status?.workPosition?.y || 0
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Y-${settings.retractDistance}`)
      await window.electronAPI.grbl.send(`G90`)
      
      // Calculate Y center and move there
      const yCenter = (measurements.y1 + measurements.y2) / 2
      await window.electronAPI.grbl.send(`G0 Y${yCenter}`)
      
      // Set XY zero at center
      setProbeStep('Setting center as XY zero...')
      await window.electronAPI.grbl.send(`G10 L20 P1 X0 Y0`)
      
      const result: ProbeResult = {
        timestamp: new Date(),
        routine: 'center',
        position: { x: 0, y: 0, z: status?.workPosition?.z || 0 },
        success: true,
        appliedToWCS: true,
      }
      
      setLastResult(result)
      setProbeHistory(prev => [result, ...prev].slice(0, 10))
      setProbeStep('Center probe complete!')
      
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : 'Probe failed')
      setProbeStep('')
    } finally {
      setIsProbing(false)
    }
  }, [canProbe, settings, status?.workPosition])

  const executeProbeTLO = useCallback(async () => {
    if (!window.electronAPI || !canProbe) return
    
    setIsProbing(true)
    setProbeError(null)
    
    try {
      setProbeStep('Probing tool length...')
      
      // Fast probe
      await window.electronAPI.grbl.send(
        `G38.2 Z-${settings.seekDistance} F${settings.fastFeedRate}`
      )
      
      // Retract
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Z${settings.retractDistance}`)
      
      // Slow probe
      await window.electronAPI.grbl.send(
        `G38.2 Z-${settings.retractDistance + 1} F${settings.slowFeedRate}`
      )
      
      await window.electronAPI.grbl.send(`G90`)
      
      // For TLO, we set Z based on a known reference point
      // This assumes the tool setter is at a fixed machine position
      const toolLength = status?.machinePosition?.z || 0
      
      // Apply tool length offset (G43.1)
      await window.electronAPI.grbl.send(`G43.1 Z${toolLength}`)
      
      // Retract
      await window.electronAPI.grbl.send(`G91`)
      await window.electronAPI.grbl.send(`G0 Z${settings.clearanceHeight}`)
      await window.electronAPI.grbl.send(`G90`)
      
      const result: ProbeResult = {
        timestamp: new Date(),
        routine: 'tlo',
        position: { x: 0, y: 0, z: toolLength },
        success: true,
        appliedToWCS: true,
      }
      
      setLastResult(result)
      setProbeHistory(prev => [result, ...prev].slice(0, 10))
      setProbeStep('Tool length offset set!')
      
    } catch (error) {
      setProbeError(error instanceof Error ? error.message : 'Probe failed')
      setProbeStep('')
    } finally {
      setIsProbing(false)
    }
  }, [canProbe, settings, status?.machinePosition])

  // ============================================================================
  // Jog Controls
  // ============================================================================

  const handleJog = useCallback(async (axis: string, direction: number) => {
    if (!window.electronAPI || !isConnected) return
    const distance = jogStep * direction
    await window.electronAPI.grbl.jog(axis, distance, 1000)
  }, [isConnected, jogStep])

  // ============================================================================
  // Settings Handlers
  // ============================================================================

  const handlePresetChange = (presetName: string) => {
    const preset = settings.touchPlatePresets.find(p => p.name === presetName)
    if (preset) {
      setSettings(prev => ({
        ...prev,
        selectedPreset: presetName,
        touchPlateThickness: preset.thickness,
      }))
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4" />
          Probe Module
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowSettings(!showSettings)}
            title="Probe Settings"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Connect to machine to use probe functions</span>
          </div>
        </div>
      )}

      {/* Probe Continuity Check */}
      {isConnected && (
        <div className={cn(
          "px-3 py-2 border-b flex items-center gap-2 text-sm",
          probeTriggered 
            ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
            : "bg-muted/50 text-muted-foreground"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            probeTriggered ? "bg-green-500" : "bg-muted-foreground/30"
          )} />
          <span>Probe: {probeTriggered ? 'Contact Detected' : 'No Contact'}</span>
          {probeTriggered && (
            <span className="text-xs opacity-70">(Touch plate connected)</span>
          )}
        </div>
      )}

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className="p-3 border-b border-border bg-muted/30 space-y-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Probe Settings</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Touch Plate Preset</Label>
              <Select value={settings.selectedPreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.touchPlatePresets.map(preset => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Thickness (mm)</Label>
              <Input
                type="number"
                value={settings.touchPlateThickness}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  touchPlateThickness: parseFloat(e.target.value) || 0,
                  selectedPreset: 'Custom',
                }))}
                className="h-8 text-sm"
                step={0.1}
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Fast Feed (mm/min)</Label>
              <Input
                type="number"
                value={settings.fastFeedRate}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  fastFeedRate: parseFloat(e.target.value) || 100,
                }))}
                className="h-8 text-sm"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Slow Feed (mm/min)</Label>
              <Input
                type="number"
                value={settings.slowFeedRate}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  slowFeedRate: parseFloat(e.target.value) || 25,
                }))}
                className="h-8 text-sm"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Seek Distance (mm)</Label>
              <Input
                type="number"
                value={settings.seekDistance}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  seekDistance: parseFloat(e.target.value) || 50,
                }))}
                className="h-8 text-sm"
              />
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs">Retract Distance (mm)</Label>
              <Input
                type="number"
                value={settings.retractDistance}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  retractDistance: parseFloat(e.target.value) || 2,
                }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          
          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-medium mb-2">XYZ Probe Block Dimensions</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Width (X)</Label>
                <Input
                  type="number"
                  value={settings.probeBlockWidth}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    probeBlockWidth: parseFloat(e.target.value) || 50,
                  }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Length (Y)</Label>
                <Input
                  type="number"
                  value={settings.probeBlockLength}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    probeBlockLength: parseFloat(e.target.value) || 50,
                  }))}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height (Z)</Label>
                <Input
                  type="number"
                  value={settings.probeBlockHeight}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    probeBlockHeight: parseFloat(e.target.value) || 50,
                  }))}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeRoutine} onValueChange={(v) => setActiveRoutine(v as ProbeRoutine)}>
          <TabsList className="w-full justify-start px-2 pt-2 bg-transparent">
            <TabsTrigger value="z-only" className="text-xs">
              <ArrowDown className="w-3 h-3 mr-1" />
              Z Only
            </TabsTrigger>
            <TabsTrigger value="xyz-corner" className="text-xs">
              <CornerLeftDown className="w-3 h-3 mr-1" />
              XYZ Corner
            </TabsTrigger>
            <TabsTrigger value="x-edge" className="text-xs">
              <ArrowRight className="w-3 h-3 mr-1" />
              Edge
            </TabsTrigger>
            <TabsTrigger value="center" className="text-xs">
              <CircleDot className="w-3 h-3 mr-1" />
              Center
            </TabsTrigger>
            <TabsTrigger value="tlo" className="text-xs">
              <Wrench className="w-3 h-3 mr-1" />
              TLO
            </TabsTrigger>
          </TabsList>

          {/* Z-Only Probe */}
          <TabsContent value="z-only" className="p-3 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-24 h-24 mx-auto relative">
                {/* Visual: Bit above touch plate */}
                <div className="absolute inset-x-0 bottom-0 h-4 bg-amber-600/60 rounded-sm" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-2 h-16 bg-gray-400 rounded-t-full">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-gray-500 rounded-b-sm" />
                </div>
                <ArrowDown className="absolute left-1/2 -translate-x-1/2 top-0 w-6 h-6 text-primary animate-bounce" />
              </div>
              <p className="text-sm text-muted-foreground">
                Place touch plate on material surface, position bit above plate
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plate Thickness:</span>
                <span className="font-medium">{settings.touchPlateThickness} mm</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seek Distance:</span>
                <span className="font-medium">{settings.seekDistance} mm</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={executeProbeZ}
              disabled={!canProbe}
            >
              {isProbing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {probeStep}
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Probe Z
                </>
              )}
            </Button>
          </TabsContent>

          {/* XYZ Corner Probe */}
          <TabsContent value="xyz-corner" className="p-3 space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Select which corner of the material to probe
              </p>
            </div>

            {/* Corner Selector */}
            <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
              <button
                onClick={() => setSelectedCorner('back-left')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-colors",
                  selectedCorner === 'back-left'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                BL
              </button>
              <div className="aspect-square flex items-center justify-center">
                <Box className="w-8 h-8 text-muted-foreground" />
              </div>
              <button
                onClick={() => setSelectedCorner('back-right')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-colors",
                  selectedCorner === 'back-right'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                BR
              </button>
              <button
                onClick={() => setSelectedCorner('front-left')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-colors",
                  selectedCorner === 'front-left'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                FL
              </button>
              <div />
              <button
                onClick={() => setSelectedCorner('front-right')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-medium transition-colors",
                  selectedCorner === 'front-right'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                FR
              </button>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Position bit above the <strong>{selectedCorner.replace('-', ' ')}</strong> corner 
                of your XYZ probe block. The routine will probe Z, then X, then Y.
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={executeProbeXYZCorner}
              disabled={!canProbe}
            >
              {isProbing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {probeStep}
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Probe XYZ Corner
                </>
              )}
            </Button>
          </TabsContent>

          {/* Edge Probe */}
          <TabsContent value="x-edge" className="p-3 space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Find the edge of your material or workpiece
              </p>
            </div>

            {/* Edge Selector */}
            <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
              <div />
              <button
                onClick={() => setSelectedEdge('back')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center transition-colors",
                  selectedEdge === 'back'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <div />
              <button
                onClick={() => setSelectedEdge('left')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center transition-colors",
                  selectedEdge === 'left'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="aspect-square flex items-center justify-center">
                <Square className="w-8 h-8 text-muted-foreground" />
              </div>
              <button
                onClick={() => setSelectedEdge('right')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center transition-colors",
                  selectedEdge === 'right'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <div />
              <button
                onClick={() => setSelectedEdge('front')}
                className={cn(
                  "aspect-square rounded-lg border-2 flex items-center justify-center transition-colors",
                  selectedEdge === 'front'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                )}
              >
                <ArrowDown className="w-5 h-5" />
              </button>
              <div />
            </div>

            {/* Direction toggle */}
            <div className="flex justify-center gap-2">
              <Button
                variant={probeDirection === 'outside' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProbeDirection('outside')}
              >
                Outside Edge
              </Button>
              <Button
                variant={probeDirection === 'inside' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProbeDirection('inside')}
              >
                Inside Edge
              </Button>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => executeProbeEdge(selectedEdge)}
              disabled={!canProbe}
            >
              {isProbing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {probeStep}
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Probe {selectedEdge.charAt(0).toUpperCase() + selectedEdge.slice(1)} Edge
                </>
              )}
            </Button>
          </TabsContent>

          {/* Center Probe */}
          <TabsContent value="center" className="p-3 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-24 h-24 mx-auto relative flex items-center justify-center">
                <Circle className="w-20 h-20 text-muted-foreground" />
                <Crosshair className="w-8 h-8 text-primary absolute" />
              </div>
              <p className="text-sm text-muted-foreground">
                Find the center of a hole, pocket, or circular feature
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">
                Position the probe inside the feature. The routine will probe in 4 directions 
                (±X, ±Y) to find the center point.
              </p>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={executeProbeCenter}
              disabled={!canProbe}
            >
              {isProbing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {probeStep}
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Find Center
                </>
              )}
            </Button>
          </TabsContent>

          {/* Tool Length Offset */}
          <TabsContent value="tlo" className="p-3 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-24 h-24 mx-auto relative">
                <div className="absolute inset-x-0 bottom-0 h-6 bg-gray-600 rounded-sm flex items-center justify-center">
                  <span className="text-[8px] text-white font-medium">TOOL SETTER</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-2 h-12 bg-gray-400 rounded-t-full">
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-gray-500 rounded-b-sm" />
                </div>
                <ArrowDown className="absolute left-1/2 -translate-x-1/2 top-0 w-6 h-6 text-primary animate-bounce" />
              </div>
              <p className="text-sm text-muted-foreground">
                Measure tool length for tool change compensation
              </p>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-3 text-sm border border-blue-500/20">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-blue-600 dark:text-blue-400">
                  Position the tool above your fixed tool setter. This will measure the tool 
                  length and apply a G43.1 offset for accurate tool changes.
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={executeProbeTLO}
              disabled={!canProbe}
            >
              {isProbing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {probeStep}
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Measure Tool Length
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {probeError && (
          <div className="mx-3 mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Probe Failed</p>
                <p className="text-xs text-red-500/80">{probeError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Last Result */}
        {lastResult && !probeError && (
          <div className="mx-3 mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  {probeStep || 'Probe Complete'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Position: X{lastResult.position.x.toFixed(3)} Y{lastResult.position.y.toFixed(3)} Z{lastResult.position.z.toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Jog Controls */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Position Adjustment</span>
            <div className="flex gap-1">
              {[0.1, 1, 10].map(step => (
                <Button
                  key={step}
                  variant={jogStep === step ? 'default' : 'outline'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setJogStep(step)}
                >
                  {step}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            {/* XY Jog */}
            <div className="grid grid-cols-3 gap-1">
              <div />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleJog('Y', 1)}
                disabled={!canProbe}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <div />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleJog('X', -1)}
                disabled={!canProbe}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center justify-center">
                <Move className="w-4 h-4 text-muted-foreground" />
              </div>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleJog('X', 1)}
                disabled={!canProbe}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <div />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleJog('Y', -1)}
                disabled={!canProbe}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <div />
            </div>

            {/* Divider */}
            <div className="w-px h-16 bg-border" />

            {/* Z Jog */}
            <div className="flex flex-col items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleJog('Z', 1)}
                disabled={!canProbe}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">Z</span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => handleJog('Z', -1)}
                disabled={!canProbe}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Probe History */}
        {probeHistory.length > 0 && (
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Recent Probes</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {probeHistory.slice(0, 5).map((result, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded"
                >
                  <span className="text-muted-foreground">
                    {result.routine.replace('-', ' ').toUpperCase()}
                  </span>
                  <span className="font-mono">
                    X{result.position.x.toFixed(2)} Y{result.position.y.toFixed(2)} Z{result.position.z.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProbeModule
