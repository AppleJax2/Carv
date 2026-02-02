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
