import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  Wifi,
  WifiOff,
  Home,
  Check,
  X,
  AlertTriangle,
  Box,
  Crosshair,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  Target,
  Shield,
  Play,
  Square,
  Loader2,
  Clock,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Zap,
  Wind,
  Eye,
  AlertCircle
} from 'lucide-react'
import type { Tool } from '@/types/machine'

interface PreCarveWizardProps {
  roughingBit: Tool | null
  finishingBit: Tool | null
  useTwoBits: boolean
  estimatedTime: number
  onClose: () => void
  onStartCarve: () => void
}

type WizardStep = 'connection' | 'homing' | 'material' | 'probe' | 'safety' | 'ready'

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'connection', label: 'Connect', icon: <Wifi className="w-4 h-4" /> },
  { id: 'homing', label: 'Home', icon: <Home className="w-4 h-4" /> },
  { id: 'material', label: 'Material', icon: <Box className="w-4 h-4" /> },
  { id: 'probe', label: 'Zero', icon: <Crosshair className="w-4 h-4" /> },
  { id: 'safety', label: 'Safety', icon: <Shield className="w-4 h-4" /> },
  { id: 'ready', label: 'Carve', icon: <Play className="w-4 h-4" /> },
]

type ZeroCorner = 'front-left' | 'front-right' | 'back-left' | 'back-right' | 'center'

export function PreCarveWizard({
  roughingBit,
  finishingBit,
  useTwoBits,
  estimatedTime,
  onClose,
  onStartCarve,
}: PreCarveWizardProps) {
  const { isConnected, status } = useStore()
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('connection')
  const [isHoming, setIsHoming] = useState(false)
  const [homingComplete, setHomingComplete] = useState({ x: false, y: false, z: false })
  const [materialConfirmed, setMaterialConfirmed] = useState(false)
  const [zeroCorner, setZeroCorner] = useState<ZeroCorner>('front-left')
  const [isProbing, setIsProbing] = useState(false)
  const [probeComplete, setProbeComplete] = useState({ z: false, xy: false })
  const [jogStep, setJogStep] = useState(10) // mm
  const [safetyChecks, setSafetyChecks] = useState({
    spindleWarmup: false,
    dustCollection: false,
    clampsCleared: false,
    safetyGlasses: false,
  })
  const [isSpindleRunning, setIsSpindleRunning] = useState(false)

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep)
  
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'connection':
        return isConnected
      case 'homing':
        return homingComplete.x && homingComplete.y && homingComplete.z
      case 'material':
        return materialConfirmed
      case 'probe':
        return probeComplete.z && probeComplete.xy
      case 'safety':
        return Object.values(safetyChecks).every(v => v)
      case 'ready':
        return true
      default:
        return false
    }
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id)
    }
  }

  const goBack = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id)
    }
  }

  const handleHome = async () => {
    if (!window.electronAPI) return
    
    setIsHoming(true)
    setHomingComplete({ x: false, y: false, z: false })
    
    try {
      // Use dedicated home() method
      const result = await window.electronAPI.grbl.home()
      
      if (result?.success === false) {
        console.error('Homing failed:', result.error)
        setIsHoming(false)
        return
      }
      
      // Listen for state changes - when state goes from 'Home' back to 'Idle', homing is complete
      // For now, we'll poll status or use a reasonable timeout
      // In production, this should subscribe to grbl:data events
      const checkHomingComplete = () => {
        if (status?.state === 'Idle') {
          setHomingComplete({ x: true, y: true, z: true })
          setIsHoming(false)
        } else if (status?.state === 'Home') {
          // Still homing, check again
          setTimeout(checkHomingComplete, 500)
        } else {
          // Fallback: assume complete after timeout
          setTimeout(() => {
            setHomingComplete({ x: true, y: true, z: true })
            setIsHoming(false)
          }, 3000)
        }
      }
      
      // Start checking after a brief delay
      setTimeout(checkHomingComplete, 1000)
    } catch (error) {
      console.error('Homing failed:', error)
      setIsHoming(false)
    }
  }

  const handleJog = async (axis: 'X' | 'Y' | 'Z', direction: 1 | -1) => {
    if (!window.electronAPI) return
    
    const distance = jogStep * direction
    const feedRate = 1000 // mm/min
    
    // Use dedicated jog() method
    await window.electronAPI.grbl.jog(axis, distance, feedRate)
  }

  const handleProbeZ = async () => {
    if (!window.electronAPI) return
    
    setIsProbing(true)
    
    try {
      // G38.2 is probe toward workpiece
      await window.electronAPI.grbl.send('G38.2 Z-50 F100')
      
      // After probe, set Z zero with probe plate thickness offset
      const probeThickness = 15 // mm, typical probe plate
      await window.electronAPI.grbl.send(`G10 L20 P1 Z${probeThickness}`)
      
      // Retract
      await window.electronAPI.grbl.send('G0 Z10')
      
      setProbeComplete(prev => ({ ...prev, z: true }))
    } catch (error) {
      console.error('Z probe failed:', error)
    } finally {
      setIsProbing(false)
    }
  }

  const handleSetXYZero = async () => {
    if (!window.electronAPI) return
    
    try {
      // Use dedicated setZero method for X and Y
      await window.electronAPI.grbl.setZero('X')
      await window.electronAPI.grbl.setZero('Y')
      setProbeComplete(prev => ({ ...prev, xy: true }))
    } catch (error) {
      console.error('Set XY zero failed:', error)
    }
  }

  const handleConnect = async () => {
    // This would open the connection dialog or attempt auto-connect
    // For now, we'll just show a message - the user should use the Control mode to connect
    alert('Please use Control mode to connect to your CNC machine first.')
  }

  const handleSpindleToggle = async () => {
    if (!window.electronAPI) return
    
    if (isSpindleRunning) {
      await window.electronAPI.grbl.send('M5')
      setIsSpindleRunning(false)
    } else {
      const rpm = roughingBit?.defaultSpindleSpeed || 18000
      await window.electronAPI.grbl.send(`M3 S${rpm}`)
      setIsSpindleRunning(true)
    }
  }

  const handleStartCarve = async () => {
    // Final safety: raise Z before starting
    if (window.electronAPI) {
      await window.electronAPI.grbl.send('G0 Z25') // Raise to safe height
    }
    onStartCarve()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pre-Carve Setup</h2>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep
              const isComplete = index < currentStepIndex
              const isFuture = index > currentStepIndex
              
              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                    disabled={isFuture}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isComplete && "bg-green-500/20 text-green-500",
                      isFuture && "text-muted-foreground opacity-50",
                      !isActive && !isFuture && "hover:bg-accent"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      isActive && "bg-primary-foreground/20",
                      isComplete && "bg-green-500/30"
                    )}>
                      {isComplete ? <Check className="w-3 h-3" /> : index + 1}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
                  </button>
                  
                  {index < STEPS.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mx-1",
                      index < currentStepIndex ? "bg-green-500" : "bg-border"
                    )} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Connection Step */}
          {currentStep === 'connection' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={cn(
                  "w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4",
                  isConnected ? "bg-green-500/20" : "bg-red-500/20"
                )}>
                  {isConnected ? (
                    <Wifi className="w-10 h-10 text-green-500" />
                  ) : (
                    <WifiOff className="w-10 h-10 text-red-500" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {isConnected ? 'Machine Connected' : 'Machine Not Connected'}
                </h3>
                <p className="text-muted-foreground">
                  {isConnected 
                    ? `Connected and ready. Status: ${status?.state || 'Unknown'}`
                    : 'Please connect to your CNC machine to continue.'
                  }
                </p>
              </div>

              {isConnected && status && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">State:</span>
                    <span className={cn(
                      "font-medium",
                      status.state === 'Idle' && "text-green-500",
                      status.state === 'Alarm' && "text-red-500",
                      status.state === 'Run' && "text-blue-500"
                    )}>
                      {status.state}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Position:</span>
                    <span className="font-mono text-xs">
                      X:{status.workPosition?.x?.toFixed(2) || '0.00'} 
                      Y:{status.workPosition?.y?.toFixed(2) || '0.00'} 
                      Z:{status.workPosition?.z?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              )}

              {!isConnected && (
                <div className="text-center">
                  <Button variant="default" size="lg" onClick={handleConnect}>
                    <Wifi className="w-4 h-4 mr-2" />
                    Connect to Machine
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Homing Step */}
          {currentStep === 'homing' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Home Your Machine</h3>
                <p className="text-muted-foreground">
                  Homing establishes the machine's reference position for accurate carving.
                </p>
              </div>

              <div className="flex justify-center gap-8">
                {(['X', 'Y', 'Z'] as const).map(axis => (
                  <div key={axis} className="text-center">
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mb-2 transition-colors",
                      homingComplete[axis.toLowerCase() as 'x' | 'y' | 'z']
                        ? "bg-green-500/20 text-green-500"
                        : isHoming
                          ? "bg-yellow-500/20 text-yellow-500 animate-pulse"
                          : "bg-muted text-muted-foreground"
                    )}>
                      {homingComplete[axis.toLowerCase() as 'x' | 'y' | 'z'] ? (
                        <Check className="w-8 h-8" />
                      ) : (
                        axis
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">{axis} Axis</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button 
                  variant="default" 
                  size="lg"
                  onClick={handleHome}
                  disabled={isHoming || (homingComplete.x && homingComplete.y && homingComplete.z)}
                >
                  {isHoming ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Homing...
                    </>
                  ) : homingComplete.x && homingComplete.y && homingComplete.z ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Homing Complete
                    </>
                  ) : (
                    <>
                      <Home className="w-4 h-4 mr-2" />
                      Start Homing
                    </>
                  )}
                </Button>
              </div>

              {!isHoming && !(homingComplete.x && homingComplete.y && homingComplete.z) && (
                <p className="text-center text-sm text-muted-foreground">
                  <button 
                    onClick={() => setHomingComplete({ x: true, y: true, z: true })}
                    className="text-primary hover:underline"
                  >
                    Skip if already homed
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Material Step */}
          {currentStep === 'material' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Secure Your Material</h3>
                <p className="text-muted-foreground">
                  Make sure your workpiece is firmly clamped to the wasteboard.
                </p>
              </div>

              {/* Visual representation */}
              <div className="relative bg-muted/30 rounded-lg p-8 aspect-video flex items-center justify-center">
                {/* Wasteboard */}
                <div className="absolute inset-8 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">Wasteboard</span>
                </div>
                
                {/* Material */}
                <div 
                  className="relative bg-amber-700/60 border-2 border-amber-600 rounded shadow-lg flex items-center justify-center"
                  style={{ width: '60%', height: '60%' }}
                >
                  <span className="text-white text-sm font-medium drop-shadow">Your Material</span>
                  
                  {/* Clamps */}
                  <div className="absolute -top-3 left-1/4 w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-400" />
                  <div className="absolute -top-3 right-1/4 w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-400" />
                  <div className="absolute -bottom-3 left-1/4 w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-400" />
                  <div className="absolute -bottom-3 right-1/4 w-6 h-6 bg-gray-500 rounded-full border-2 border-gray-400" />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={materialConfirmed}
                    onChange={(e) => setMaterialConfirmed(e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <span className="font-medium">Material is securely fastened</span>
                    <p className="text-sm text-muted-foreground mt-1">
                      I have verified that my workpiece is clamped down and will not move during carving.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Probe/Zero Step */}
          {currentStep === 'probe' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Set Work Zero</h3>
                <p className="text-muted-foreground">
                  Position your bit at the zero point for this carve.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Z Probe */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <ChevronUp className="w-4 h-4" />
                    Z Height (Top of Material)
                  </h4>
                  
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <Button 
                      variant={probeComplete.z ? "outline" : "default"}
                      className="w-full"
                      onClick={handleProbeZ}
                      disabled={isProbing}
                    >
                      {isProbing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Probing...
                        </>
                      ) : probeComplete.z ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-500" />
                          Z Probed
                        </>
                      ) : (
                        <>
                          <Target className="w-4 h-4 mr-2" />
                          Auto Probe Z
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Place probe plate on material surface
                    </p>
                    
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground mb-2">Or jog manually:</p>
                      <div className="flex justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleJog('Z', 1)}>
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleJog('Z', -1)}>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* XY Zero */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Crosshair className="w-4 h-4" />
                    XY Position (Corner)
                  </h4>
                  
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    {/* Corner selector */}
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        onClick={() => setZeroCorner('back-left')}
                        className={cn(
                          "p-2 rounded text-xs",
                          zeroCorner === 'back-left' ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                        )}
                      >
                        BL
                      </button>
                      <div />
                      <button
                        onClick={() => setZeroCorner('back-right')}
                        className={cn(
                          "p-2 rounded text-xs",
                          zeroCorner === 'back-right' ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                        )}
                      >
                        BR
                      </button>
                      <div />
                      <button
                        onClick={() => setZeroCorner('center')}
                        className={cn(
                          "p-2 rounded text-xs",
                          zeroCorner === 'center' ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                        )}
                      >
                        CTR
                      </button>
                      <div />
                      <button
                        onClick={() => setZeroCorner('front-left')}
                        className={cn(
                          "p-2 rounded text-xs",
                          zeroCorner === 'front-left' ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                        )}
                      >
                        FL
                      </button>
                      <div />
                      <button
                        onClick={() => setZeroCorner('front-right')}
                        className={cn(
                          "p-2 rounded text-xs",
                          zeroCorner === 'front-right' ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                        )}
                      >
                        FR
                      </button>
                    </div>

                    {/* Jog controls */}
                    <div className="grid grid-cols-3 gap-1">
                      <div />
                      <Button variant="outline" size="sm" onClick={() => handleJog('Y', 1)}>
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <div />
                      <Button variant="outline" size="sm" onClick={() => handleJog('X', -1)}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant={probeComplete.xy ? "outline" : "default"}
                        size="sm" 
                        onClick={handleSetXYZero}
                      >
                        {probeComplete.xy ? <Check className="w-4 h-4 text-green-500" /> : "Set"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleJog('X', 1)}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                      <div />
                      <Button variant="outline" size="sm" onClick={() => handleJog('Y', -1)}>
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <div />
                    </div>

                    {/* Jog step size */}
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="text-muted-foreground">Step:</span>
                      {[0.1, 1, 10].map(step => (
                        <button
                          key={step}
                          onClick={() => setJogStep(step)}
                          className={cn(
                            "px-2 py-1 rounded",
                            jogStep === step ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
                          )}
                        >
                          {step}mm
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Safety Step */}
          {currentStep === 'safety' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Safety Checklist</h3>
                <p className="text-muted-foreground">
                  Verify these items before starting your carve.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={safetyChecks.spindleWarmup}
                    onChange={(e) => setSafetyChecks(prev => ({ ...prev, spindleWarmup: e.target.checked }))}
                    className="mt-0.5 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Spindle Warmup
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSpindleToggle}
                      >
                        {isSpindleRunning ? (
                          <>
                            <Square className="w-3 h-3 mr-1" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Run spindle for 30 seconds to warm up bearings (optional but recommended)
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={safetyChecks.dustCollection}
                    onChange={(e) => setSafetyChecks(prev => ({ ...prev, dustCollection: e.target.checked }))}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Wind className="w-4 h-4 text-blue-500" />
                      Dust Collection
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Dust collector or vacuum is running and hose is connected
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={safetyChecks.clampsCleared}
                    onChange={(e) => setSafetyChecks(prev => ({ ...prev, clampsCleared: e.target.checked }))}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Clamps Cleared
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      All clamps are positioned outside the toolpath area
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={safetyChecks.safetyGlasses}
                    onChange={(e) => setSafetyChecks(prev => ({ ...prev, safetyGlasses: e.target.checked }))}
                    className="mt-0.5 rounded"
                  />
                  <div>
                    <span className="font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4 text-green-500" />
                      Safety Glasses
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wearing safety glasses and hearing protection
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Ready Step */}
          {currentStep === 'ready' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 mx-auto flex items-center justify-center mb-4">
                  <Check className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready to Carve!</h3>
                <p className="text-muted-foreground">
                  All checks complete. Review your settings below.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bit:</span>
                  <span className="font-medium">{roughingBit?.name || 'Not selected'}</span>
                </div>
                {useTwoBits && finishingBit && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Finishing Bit:</span>
                    <span className="font-medium">{finishingBit.name}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Feed Rate:</span>
                  <span className="font-medium">{roughingBit?.defaultFeedRate || 1000} mm/min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spindle Speed:</span>
                  <span className="font-medium">{roughingBit?.defaultSpindleSpeed || 18000} RPM</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-3">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Estimated Time:
                  </span>
                  <span className="font-medium">
                    {estimatedTime > 60 
                      ? `${Math.floor(estimatedTime / 60)}h ${estimatedTime % 60}m`
                      : `${estimatedTime} min`
                    }
                  </span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-500">Stay near your machine</p>
                    <p className="text-muted-foreground mt-1">
                      Keep your hand near the emergency stop button. Never leave a running CNC unattended.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-muted/30">
          <Button 
            variant="outline" 
            onClick={currentStepIndex === 0 ? onClose : goBack}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {currentStepIndex === 0 ? 'Cancel' : 'Back'}
          </Button>

          {currentStep === 'ready' ? (
            <Button 
              variant="default"
              size="lg"
              onClick={handleStartCarve}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Carve
            </Button>
          ) : (
            <Button 
              variant="default"
              onClick={goNext}
              disabled={!canProceed()}
            >
              Next
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
