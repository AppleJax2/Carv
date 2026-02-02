import { useState, useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Usb, RefreshCw, Loader2 } from 'lucide-react'

interface SerialPort {
  path: string
  manufacturer?: string
  friendlyName?: string
}

export function ConnectionDialog() {
  const { isConnected, setConnected, baudRate, setBaudRate } = useStore()
  const [ports, setPorts] = useState<SerialPort[]>([])
  const [selectedPort, setSelectedPort] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const BAUD_RATES = [9600, 19200, 38400, 57600, 115200, 230400]

  const scanPorts = async () => {
    if (!window.electronAPI) return
    
    setIsScanning(true)
    try {
      const portList = await window.electronAPI.serial.listPorts()
      setPorts(portList)
      if (portList.length > 0 && !selectedPort) {
        setSelectedPort(portList[0].path)
      }
    } catch (err) {
      setError('Failed to scan ports')
    } finally {
      setIsScanning(false)
    }
  }

  useEffect(() => {
    scanPorts()
  }, [])

  const handleConnect = async () => {
    if (!window.electronAPI || !selectedPort) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await window.electronAPI.serial.connect(selectedPort, baudRate)
      if (result.success) {
        setConnected(true, selectedPort)
      } else {
        setError(result.error || 'Connection failed')
      }
    } catch (err) {
      setError('Connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.electronAPI) return
    
    setIsLoading(true)
    try {
      await window.electronAPI.serial.disconnect()
      setConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected) {
    return (
      <Card className="w-80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Usb className="w-4 h-4 text-green-500" />
            Connected
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Port:</span>{' '}
            <span className="font-mono">{selectedPort}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Baud:</span>{' '}
            <span className="font-mono">{baudRate}</span>
          </div>
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Disconnect
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Usb className="w-4 h-4" />
          Connect to Machine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-muted-foreground">Port</label>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={scanPorts}
              disabled={isScanning}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <select
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
          >
            {ports.length === 0 ? (
              <option value="">No ports found</option>
            ) : (
              ports.map((port) => (
                <option key={port.path} value={port.path}>
                  {port.friendlyName || port.path}
                  {port.manufacturer ? ` (${port.manufacturer})` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Baud Rate</label>
          <select
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
          >
            {BAUD_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded">
            {error}
          </div>
        )}

        <Button 
          variant="default" 
          className="w-full"
          onClick={handleConnect}
          disabled={isLoading || !selectedPort}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Connect
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          Or use simulation mode to explore without hardware
        </div>
      </CardContent>
    </Card>
  )
}
