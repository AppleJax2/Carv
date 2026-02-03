import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

export interface PortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  friendlyName?: string
  vendorId?: string
  productId?: string
}

export class SerialManager {
  private port: SerialPort | null = null
  private parser: ReadlineParser | null = null
  private dataCallback: ((data: string) => void) | null = null
  private portChangeCallback: ((ports: PortInfo[]) => void) | null = null
  private pollingInterval: NodeJS.Timeout | null = null
  private lastPortCount: number = 0
  private lastPortPaths: string[] = []

  async listPorts(): Promise<PortInfo[]> {
    const ports = await SerialPort.list()
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer,
      serialNumber: port.serialNumber,
      pnpId: port.pnpId,
      locationId: port.locationId,
      friendlyName: port.friendlyName,
      vendorId: port.vendorId,
      productId: port.productId,
    }))
  }

  /**
   * Start polling for port changes (USB hotplug detection)
   * Polls every 2 seconds and notifies if ports change
   */
  startPortPolling(callback: (ports: PortInfo[]) => void): void {
    this.portChangeCallback = callback
    
    // Initial scan
    this.checkForPortChanges()
    
    // Poll every 2 seconds for changes
    this.pollingInterval = setInterval(() => {
      this.checkForPortChanges()
    }, 2000)
  }

  stopPortPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.portChangeCallback = null
  }

  private async checkForPortChanges(): Promise<void> {
    try {
      const ports = await this.listPorts()
      const currentPaths = ports.map(p => p.path).sort()
      
      // Check if ports changed
      const portsChanged = 
        currentPaths.length !== this.lastPortPaths.length ||
        currentPaths.some((path, i) => path !== this.lastPortPaths[i])
      
      if (portsChanged) {
        this.lastPortPaths = currentPaths
        this.lastPortCount = ports.length
        
        if (this.portChangeCallback) {
          this.portChangeCallback(ports)
        }
      }
    } catch (error) {
      console.error('Error checking for port changes:', error)
    }
  }

  async connect(portPath: string, baudRate: number = 115200): Promise<void> {
    if (this.port?.isOpen) {
      await this.disconnect()
    }

    return new Promise((resolve, reject) => {
      this.port = new SerialPort({
        path: portPath,
        baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false,
      })

      this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }))

      this.parser.on('data', (data: string) => {
        if (this.dataCallback) {
          this.dataCallback(data)
        }
      })

      this.port.on('error', (err) => {
        console.error('Serial port error:', err)
      })

      this.port.on('close', () => {
        console.log('Serial port closed')
      })

      this.port.open((err) => {
        if (err) {
          reject(new Error(`Failed to open port: ${err.message}`))
        } else {
          resolve()
        }
      })
    })
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.port?.isOpen) {
        this.port.close(() => {
          this.port = null
          this.parser = null
          resolve()
        })
      } else {
        this.port = null
        this.parser = null
        resolve()
      }
    })
  }

  write(data: string): boolean {
    if (!this.port?.isOpen) {
      return false
    }
    this.port.write(data)
    return true
  }

  writeRaw(data: Buffer | number[]): boolean {
    if (!this.port?.isOpen) {
      return false
    }
    this.port.write(Buffer.from(data))
    return true
  }

  onData(callback: (data: string) => void): void {
    this.dataCallback = callback
  }

  isConnected(): boolean {
    return this.port?.isOpen ?? false
  }

  getPortPath(): string | null {
    return this.port?.path ?? null
  }
}
