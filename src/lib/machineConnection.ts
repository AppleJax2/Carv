export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'alarm'

export type MachineState = 
  | 'idle'
  | 'run'
  | 'hold'
  | 'jog'
  | 'alarm'
  | 'door'
  | 'check'
  | 'home'
  | 'sleep'

export interface MachinePosition {
  x: number
  y: number
  z: number
  a?: number
  b?: number
  c?: number
}

export interface MachineStatus {
  state: MachineState
  machinePosition: MachinePosition
  workPosition: MachinePosition
  feedRate: number
  spindleSpeed: number
  spindleState: 'off' | 'cw' | 'ccw'
  coolantState: 'off' | 'flood' | 'mist'
  overrides: {
    feed: number
    rapid: number
    spindle: number
  }
  pins: {
    limitX: boolean
    limitY: boolean
    limitZ: boolean
    probe: boolean
    door: boolean
    hold: boolean
    softReset: boolean
    cycleStart: boolean
  }
  bufferState: {
    plannerBlocks: number
    rxBuffer: number
  }
}

export interface AlarmInfo {
  code: number
  message: string
  description: string
  resolution: string
}

export const GRBL_ALARMS: Record<number, AlarmInfo> = {
  1: {
    code: 1,
    message: 'Hard limit triggered',
    description: 'A limit switch was triggered during motion',
    resolution: 'Check limit switches, jog away from limits, then home',
  },
  2: {
    code: 2,
    message: 'Soft limit alarm',
    description: 'Motion target exceeds machine travel',
    resolution: 'Reduce motion range or adjust soft limits in settings',
  },
  3: {
    code: 3,
    message: 'Reset while in motion',
    description: 'Controller was reset during active motion',
    resolution: 'Re-home the machine before continuing',
  },
  4: {
    code: 4,
    message: 'Probe fail',
    description: 'Probe did not contact within expected travel',
    resolution: 'Check probe connection and retry',
  },
  5: {
    code: 5,
    message: 'Probe fail',
    description: 'Probe contact not cleared before starting cycle',
    resolution: 'Raise probe and ensure it is not touching',
  },
  6: {
    code: 6,
    message: 'Homing fail',
    description: 'Homing cycle failed - limit switch not found',
    resolution: 'Check limit switch wiring and settings',
  },
  7: {
    code: 7,
    message: 'Homing fail',
    description: 'Homing cycle failed - limit switch not cleared',
    resolution: 'Manually move away from limit switch',
  },
  8: {
    code: 8,
    message: 'Homing fail',
    description: 'Homing cycle failed - could not find index pulse',
    resolution: 'Check encoder connection',
  },
  9: {
    code: 9,
    message: 'Homing fail',
    description: 'Homing cycle failed - limit switch already triggered',
    resolution: 'Manually move away from limit switch before homing',
  },
}

export interface GCodeSenderOptions {
  onStatusUpdate?: (status: MachineStatus) => void
  onLineComplete?: (lineNumber: number, line: string) => void
  onError?: (error: string) => void
  onAlarm?: (alarm: AlarmInfo) => void
  onComplete?: () => void
  onProgress?: (progress: number, currentLine: number, totalLines: number) => void
  statusPollInterval?: number
}

export class MachineConnection {
  private port: any = null
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null
  private connectionState: ConnectionState = 'disconnected'
  private machineStatus: MachineStatus | null = null
  private statusPollInterval: number | null = null
  private responseBuffer: string = ''
  private pendingCommands: Map<string, { resolve: (value: string) => void; reject: (error: Error) => void }> = new Map()
  private commandQueue: string[] = []
  private isProcessingQueue: boolean = false
  
  private listeners: {
    status: ((status: MachineStatus) => void)[]
    connection: ((state: ConnectionState) => void)[]
    message: ((message: string) => void)[]
    error: ((error: string) => void)[]
    alarm: ((alarm: AlarmInfo) => void)[]
  } = {
    status: [],
    connection: [],
    message: [],
    error: [],
    alarm: [],
  }

  async connect(portPath?: string, baudRate: number = 115200): Promise<boolean> {
    if (this.connectionState === 'connected') {
      return true
    }

    this.setConnectionState('connecting')

    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser')
      }

      if (portPath) {
        const ports = await (navigator as any).serial.getPorts()
        this.port = ports.find((p: any) => p.getInfo().usbProductId === portPath) || null
      }

      if (!this.port) {
        this.port = await (navigator as any).serial.requestPort()
      }

      await this.port!.open({ baudRate })

      this.reader = this.port!.readable!.getReader()
      this.writer = this.port!.writable!.getWriter()

      this.startReading()
      this.startStatusPolling()

      await this.sendCommand('\x18')
      await new Promise(resolve => setTimeout(resolve, 2000))

      this.setConnectionState('connected')
      return true
    } catch (error) {
      console.error('Connection failed:', error)
      this.setConnectionState('error')
      this.emitError((error as Error).message)
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.stopStatusPolling()

    if (this.reader) {
      try {
        await this.reader.cancel()
      } catch (e) {}
      this.reader = null
    }

    if (this.writer) {
      try {
        await this.writer.close()
      } catch (e) {}
      this.writer = null
    }

    if (this.port) {
      try {
        await this.port.close()
      } catch (e) {}
      this.port = null
    }

    this.setConnectionState('disconnected')
  }

  async sendCommand(command: string): Promise<string> {
    if (!this.writer) {
      throw new Error('Not connected')
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(command + '\n')
    
    await this.writer.write(data)
    this.emitMessage(`> ${command}`)

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Command timeout'))
      }, 10000)

      const id = crypto.randomUUID()
      this.pendingCommands.set(id, {
        resolve: (value) => {
          clearTimeout(timeout)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      })
    })
  }

  async sendRealtime(char: string): Promise<void> {
    if (!this.writer) {
      throw new Error('Not connected')
    }

    const encoder = new TextEncoder()
    await this.writer.write(encoder.encode(char))
  }

  async feedHold(): Promise<void> {
    await this.sendRealtime('!')
  }

  async cycleStart(): Promise<void> {
    await this.sendRealtime('~')
  }

  async softReset(): Promise<void> {
    await this.sendRealtime('\x18')
  }

  async jogCancel(): Promise<void> {
    await this.sendRealtime('\x85')
  }

  async home(): Promise<void> {
    await this.sendCommand('$H')
  }

  async unlock(): Promise<void> {
    await this.sendCommand('$X')
  }

  async jog(axis: 'X' | 'Y' | 'Z', distance: number, feedRate: number): Promise<void> {
    await this.sendCommand(`$J=G91 ${axis}${distance} F${feedRate}`)
  }

  async jogTo(x: number, y: number, z: number, feedRate: number): Promise<void> {
    await this.sendCommand(`$J=G90 X${x} Y${y} Z${z} F${feedRate}`)
  }

  async setWorkOrigin(axis?: 'X' | 'Y' | 'Z'): Promise<void> {
    if (axis) {
      await this.sendCommand(`G10 L20 P1 ${axis}0`)
    } else {
      await this.sendCommand('G10 L20 P1 X0 Y0 Z0')
    }
  }

  async probe(axis: 'Z', feedRate: number, maxDistance: number): Promise<MachinePosition | null> {
    try {
      await this.sendCommand(`G38.2 ${axis}${-maxDistance} F${feedRate}`)
      return this.machineStatus?.workPosition || null
    } catch (error) {
      return null
    }
  }

  async getSettings(): Promise<Record<string, number>> {
    const response = await this.sendCommand('$$')
    const settings: Record<string, number> = {}
    
    const lines = response.split('\n')
    for (const line of lines) {
      const match = line.match(/\$(\d+)=(\d+\.?\d*)/)
      if (match) {
        settings[`$${match[1]}`] = parseFloat(match[2])
      }
    }
    
    return settings
  }

  async setSetting(setting: string, value: number): Promise<void> {
    await this.sendCommand(`${setting}=${value}`)
  }

  getStatus(): MachineStatus | null {
    return this.machineStatus
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  on(event: 'status', callback: (status: MachineStatus) => void): void
  on(event: 'connection', callback: (state: ConnectionState) => void): void
  on(event: 'message', callback: (message: string) => void): void
  on(event: 'error', callback: (error: string) => void): void
  on(event: 'alarm', callback: (alarm: AlarmInfo) => void): void
  on(event: string, callback: any): void {
    if (event in this.listeners) {
      (this.listeners as any)[event].push(callback)
    }
  }

  off(event: string, callback: any): void {
    if (event in this.listeners) {
      const index = (this.listeners as any)[event].indexOf(callback)
      if (index > -1) {
        (this.listeners as any)[event].splice(index, 1)
      }
    }
  }

  private async startReading(): Promise<void> {
    if (!this.reader) return

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { value, done } = await this.reader.read()
        if (done) break

        const text = decoder.decode(value)
        this.responseBuffer += text

        const lines = this.responseBuffer.split('\n')
        this.responseBuffer = lines.pop() || ''

        for (const line of lines) {
          this.processResponse(line.trim())
        }
      }
    } catch (error) {
      if (this.connectionState === 'connected') {
        this.emitError((error as Error).message)
        this.setConnectionState('error')
      }
    }
  }

  private processResponse(line: string): void {
    if (!line) return

    this.emitMessage(`< ${line}`)

    if (line.startsWith('<') && line.endsWith('>')) {
      this.parseStatusReport(line)
      return
    }

    if (line === 'ok') {
      const [id] = this.pendingCommands.keys()
      if (id) {
        const pending = this.pendingCommands.get(id)
        this.pendingCommands.delete(id)
        pending?.resolve('ok')
      }
      return
    }

    if (line.startsWith('error:')) {
      const errorCode = parseInt(line.split(':')[1])
      const [id] = this.pendingCommands.keys()
      if (id) {
        const pending = this.pendingCommands.get(id)
        this.pendingCommands.delete(id)
        pending?.reject(new Error(`GRBL Error ${errorCode}`))
      }
      this.emitError(line)
      return
    }

    if (line.startsWith('ALARM:')) {
      const alarmCode = parseInt(line.split(':')[1])
      const alarm = GRBL_ALARMS[alarmCode] || {
        code: alarmCode,
        message: 'Unknown alarm',
        description: line,
        resolution: 'Check machine and reset',
      }
      this.setConnectionState('alarm')
      this.emitAlarm(alarm)
      return
    }

    if (line.startsWith('[MSG:')) {
      return
    }

    if (line.startsWith('Grbl')) {
      return
    }
  }

  private parseStatusReport(report: string): void {
    const content = report.slice(1, -1)
    const parts = content.split('|')

    const state = parts[0].toLowerCase() as MachineState

    const status: MachineStatus = {
      state,
      machinePosition: { x: 0, y: 0, z: 0 },
      workPosition: { x: 0, y: 0, z: 0 },
      feedRate: 0,
      spindleSpeed: 0,
      spindleState: 'off',
      coolantState: 'off',
      overrides: { feed: 100, rapid: 100, spindle: 100 },
      pins: {
        limitX: false,
        limitY: false,
        limitZ: false,
        probe: false,
        door: false,
        hold: false,
        softReset: false,
        cycleStart: false,
      },
      bufferState: { plannerBlocks: 0, rxBuffer: 0 },
    }

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      const [key, value] = part.split(':')

      switch (key) {
        case 'MPos': {
          const coords = value.split(',').map(parseFloat)
          status.machinePosition = { x: coords[0], y: coords[1], z: coords[2] }
          break
        }
        case 'WPos': {
          const coords = value.split(',').map(parseFloat)
          status.workPosition = { x: coords[0], y: coords[1], z: coords[2] }
          break
        }
        case 'WCO': {
          const coords = value.split(',').map(parseFloat)
          status.workPosition = {
            x: status.machinePosition.x - coords[0],
            y: status.machinePosition.y - coords[1],
            z: status.machinePosition.z - coords[2],
          }
          break
        }
        case 'Bf': {
          const [planner, rx] = value.split(',').map(parseInt)
          status.bufferState = { plannerBlocks: planner, rxBuffer: rx }
          break
        }
        case 'FS': {
          const [feed, spindle] = value.split(',').map(parseFloat)
          status.feedRate = feed
          status.spindleSpeed = spindle
          break
        }
        case 'F': {
          status.feedRate = parseFloat(value)
          break
        }
        case 'Ov': {
          const [feed, rapid, spindle] = value.split(',').map(parseInt)
          status.overrides = { feed, rapid, spindle }
          break
        }
        case 'A': {
          if (value.includes('S')) status.spindleState = 'cw'
          if (value.includes('C')) status.spindleState = 'ccw'
          if (value.includes('F')) status.coolantState = 'flood'
          if (value.includes('M')) status.coolantState = 'mist'
          break
        }
        case 'Pn': {
          status.pins.limitX = value.includes('X')
          status.pins.limitY = value.includes('Y')
          status.pins.limitZ = value.includes('Z')
          status.pins.probe = value.includes('P')
          status.pins.door = value.includes('D')
          status.pins.hold = value.includes('H')
          status.pins.softReset = value.includes('R')
          status.pins.cycleStart = value.includes('S')
          break
        }
      }
    }

    this.machineStatus = status
    this.emitStatus(status)

    if (state === 'alarm' && this.connectionState !== 'alarm') {
      this.setConnectionState('alarm')
    } else if (state !== 'alarm' && this.connectionState === 'alarm') {
      this.setConnectionState('connected')
    }
  }

  private startStatusPolling(interval: number = 250): void {
    this.stopStatusPolling()
    
    this.statusPollInterval = window.setInterval(async () => {
      if (this.connectionState === 'connected' || this.connectionState === 'alarm') {
        try {
          await this.sendRealtime('?')
        } catch (e) {}
      }
    }, interval)
  }

  private stopStatusPolling(): void {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval)
      this.statusPollInterval = null
    }
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state
    for (const callback of this.listeners.connection) {
      callback(state)
    }
  }

  private emitStatus(status: MachineStatus): void {
    for (const callback of this.listeners.status) {
      callback(status)
    }
  }

  private emitMessage(message: string): void {
    for (const callback of this.listeners.message) {
      callback(message)
    }
  }

  private emitError(error: string): void {
    for (const callback of this.listeners.error) {
      callback(error)
    }
  }

  private emitAlarm(alarm: AlarmInfo): void {
    for (const callback of this.listeners.alarm) {
      callback(alarm)
    }
  }
}

export class GCodeSender {
  private connection: MachineConnection
  private lines: string[] = []
  private currentLine: number = 0
  private isPaused: boolean = false
  private isStopped: boolean = false
  private options: GCodeSenderOptions

  constructor(connection: MachineConnection, options: GCodeSenderOptions = {}) {
    this.connection = connection
    this.options = options
  }

  async send(gcode: string): Promise<void> {
    this.lines = gcode.split('\n').filter(line => {
      const trimmed = line.trim()
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(')
    })
    
    this.currentLine = 0
    this.isPaused = false
    this.isStopped = false

    await this.processLines()
  }

  pause(): void {
    this.isPaused = true
    this.connection.feedHold()
  }

  resume(): void {
    this.isPaused = false
    this.connection.cycleStart()
    this.processLines()
  }

  stop(): void {
    this.isStopped = true
    this.connection.softReset()
  }

  getProgress(): { current: number; total: number; percent: number } {
    return {
      current: this.currentLine,
      total: this.lines.length,
      percent: this.lines.length > 0 ? (this.currentLine / this.lines.length) * 100 : 0,
    }
  }

  private async processLines(): Promise<void> {
    while (this.currentLine < this.lines.length && !this.isPaused && !this.isStopped) {
      const line = this.lines[this.currentLine]
      
      try {
        await this.connection.sendCommand(line)
        
        this.options.onLineComplete?.(this.currentLine, line)
        this.options.onProgress?.(
          (this.currentLine / this.lines.length) * 100,
          this.currentLine,
          this.lines.length
        )
        
        this.currentLine++
      } catch (error) {
        this.options.onError?.((error as Error).message)
        this.isStopped = true
        return
      }
    }

    if (this.currentLine >= this.lines.length && !this.isStopped) {
      this.options.onComplete?.()
    }
  }
}

export const machineConnection = new MachineConnection()
