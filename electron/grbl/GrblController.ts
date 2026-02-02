import { SerialManager } from '../serial/SerialManager'

export interface GrblStatus {
  state: string
  machinePosition: { x: number; y: number; z: number }
  workPosition: { x: number; y: number; z: number }
  feedRate: number
  spindleSpeed: number
  buffer: { planner: number; rx: number }
  overrides: { feed: number; rapid: number; spindle: number }
  pins: string
}

export interface JobProgress {
  currentLine: number
  totalLines: number
  percentComplete: number
  elapsedTime: number
  estimatedRemaining: number
}

type DataCallback = (data: GrblStatus) => void
type ProgressCallback = (progress: JobProgress) => void

export class GrblController {
  private serial: SerialManager
  private dataCallback: DataCallback
  private statusPollInterval: ReturnType<typeof setInterval> | null = null
  private currentStatus: GrblStatus | null = null
  private commandQueue: string[] = []
  private isProcessingQueue = false
  private jobLines: string[] = []
  private jobCurrentLine = 0
  private jobStartTime = 0
  private isJobRunning = false
  private jobProgressCallback: ProgressCallback | null = null
  private pendingCommands = 0
  private readonly MAX_BUFFER_COMMANDS = 4

  constructor(serial: SerialManager, dataCallback: DataCallback) {
    this.serial = serial
    this.dataCallback = dataCallback
    this.serial.onData(this.handleData.bind(this))
  }

  private handleData(data: string): void {
    if (data.startsWith('<') && data.endsWith('>')) {
      this.currentStatus = this.parseStatus(data)
      this.dataCallback(this.currentStatus)
    } else if (data === 'ok') {
      this.pendingCommands = Math.max(0, this.pendingCommands - 1)
      this.processJobQueue()
    } else if (data.startsWith('error:')) {
      this.pendingCommands = Math.max(0, this.pendingCommands - 1)
      console.error('GRBL Error:', data)
    } else if (data.startsWith('ALARM:')) {
      console.error('GRBL Alarm:', data)
    } else if (data.startsWith('[')) {
      console.log('GRBL Message:', data)
    } else if (data.startsWith('Grbl')) {
      console.log('GRBL Version:', data)
    }
  }

  private parseStatus(data: string): GrblStatus {
    const content = data.slice(1, -1)
    const parts = content.split('|')
    
    const status: GrblStatus = {
      state: parts[0] || 'Unknown',
      machinePosition: { x: 0, y: 0, z: 0 },
      workPosition: { x: 0, y: 0, z: 0 },
      feedRate: 0,
      spindleSpeed: 0,
      buffer: { planner: 0, rx: 0 },
      overrides: { feed: 100, rapid: 100, spindle: 100 },
      pins: '',
    }

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (part.startsWith('MPos:')) {
        const coords = part.slice(5).split(',').map(Number)
        status.machinePosition = { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 }
      } else if (part.startsWith('WPos:')) {
        const coords = part.slice(5).split(',').map(Number)
        status.workPosition = { x: coords[0] || 0, y: coords[1] || 0, z: coords[2] || 0 }
      } else if (part.startsWith('WCO:')) {
        const coords = part.slice(4).split(',').map(Number)
        status.workPosition = {
          x: status.machinePosition.x - (coords[0] || 0),
          y: status.machinePosition.y - (coords[1] || 0),
          z: status.machinePosition.z - (coords[2] || 0),
        }
      } else if (part.startsWith('Bf:')) {
        const buffer = part.slice(3).split(',').map(Number)
        status.buffer = { planner: buffer[0] || 0, rx: buffer[1] || 0 }
      } else if (part.startsWith('FS:')) {
        const fs = part.slice(3).split(',').map(Number)
        status.feedRate = fs[0] || 0
        status.spindleSpeed = fs[1] || 0
      } else if (part.startsWith('F:')) {
        status.feedRate = Number(part.slice(2)) || 0
      } else if (part.startsWith('Ov:')) {
        const ov = part.slice(3).split(',').map(Number)
        status.overrides = { feed: ov[0] || 100, rapid: ov[1] || 100, spindle: ov[2] || 100 }
      } else if (part.startsWith('Pn:')) {
        status.pins = part.slice(3)
      }
    }

    return status
  }

  startStatusPolling(intervalMs: number = 100): void {
    this.stopStatusPolling()
    this.statusPollInterval = setInterval(() => {
      this.serial.write('?')
    }, intervalMs)
  }

  stopStatusPolling(): void {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval)
      this.statusPollInterval = null
    }
  }

  async send(command: string): Promise<{ success: boolean; error?: string }> {
    const trimmed = command.trim()
    if (!trimmed) {
      return { success: false, error: 'Empty command' }
    }
    const sent = this.serial.write(trimmed + '\n')
    if (sent) {
      this.pendingCommands++
      return { success: true }
    }
    return { success: false, error: 'Failed to send command' }
  }

  async jog(axis: string, distance: number, feedRate: number): Promise<{ success: boolean; error?: string }> {
    const command = `$J=G91 ${axis.toUpperCase()}${distance} F${feedRate}`
    return this.send(command)
  }

  async jogCancel(): Promise<{ success: boolean; error?: string }> {
    const sent = this.serial.writeRaw([0x85])
    return sent ? { success: true } : { success: false, error: 'Failed to cancel jog' }
  }

  async home(): Promise<{ success: boolean; error?: string }> {
    return this.send('$H')
  }

  async unlock(): Promise<{ success: boolean; error?: string }> {
    return this.send('$X')
  }

  async reset(): Promise<{ success: boolean; error?: string }> {
    const sent = this.serial.writeRaw([0x18])
    return sent ? { success: true } : { success: false, error: 'Failed to reset' }
  }

  async feedHold(): Promise<{ success: boolean; error?: string }> {
    const sent = this.serial.write('!')
    return sent ? { success: true } : { success: false, error: 'Failed to feed hold' }
  }

  async resume(): Promise<{ success: boolean; error?: string }> {
    const sent = this.serial.write('~')
    return sent ? { success: true } : { success: false, error: 'Failed to resume' }
  }

  async setZero(axis: string): Promise<{ success: boolean; error?: string }> {
    const axisUpper = axis.toUpperCase()
    if (axisUpper === 'ALL') {
      return this.send('G10 L20 P1 X0 Y0 Z0')
    }
    return this.send(`G10 L20 P1 ${axisUpper}0`)
  }

  async goToZero(axis: string): Promise<{ success: boolean; error?: string }> {
    const axisUpper = axis.toUpperCase()
    if (axisUpper === 'ALL') {
      return this.send('G0 X0 Y0 Z0')
    }
    return this.send(`G0 ${axisUpper}0`)
  }

  async setFeedOverride(value: number): Promise<{ success: boolean; error?: string }> {
    let command: number
    if (value === 100) {
      command = 0x90
    } else if (value > 100) {
      const increments = Math.floor((value - 100) / 10)
      for (let i = 0; i < increments; i++) {
        this.serial.writeRaw([0x91])
      }
      return { success: true }
    } else {
      const decrements = Math.floor((100 - value) / 10)
      for (let i = 0; i < decrements; i++) {
        this.serial.writeRaw([0x92])
      }
      return { success: true }
    }
    const sent = this.serial.writeRaw([command])
    return sent ? { success: true } : { success: false, error: 'Failed to set feed override' }
  }

  async setSpindleOverride(value: number): Promise<{ success: boolean; error?: string }> {
    let command: number
    if (value === 100) {
      command = 0x99
    } else if (value > 100) {
      const increments = Math.floor((value - 100) / 10)
      for (let i = 0; i < increments; i++) {
        this.serial.writeRaw([0x9A])
      }
      return { success: true }
    } else {
      const decrements = Math.floor((100 - value) / 10)
      for (let i = 0; i < decrements; i++) {
        this.serial.writeRaw([0x9B])
      }
      return { success: true }
    }
    const sent = this.serial.writeRaw([command])
    return sent ? { success: true } : { success: false, error: 'Failed to set spindle override' }
  }

  async setRapidOverride(value: number): Promise<{ success: boolean; error?: string }> {
    let command: number
    if (value === 100) {
      command = 0x95
    } else if (value === 50) {
      command = 0x96
    } else if (value === 25) {
      command = 0x97
    } else {
      return { success: false, error: 'Rapid override must be 25, 50, or 100' }
    }
    const sent = this.serial.writeRaw([command])
    return sent ? { success: true } : { success: false, error: 'Failed to set rapid override' }
  }

  async startJob(gcode: string[], progressCallback: ProgressCallback): Promise<{ success: boolean; error?: string }> {
    if (this.isJobRunning) {
      return { success: false, error: 'Job already running' }
    }

    this.jobLines = gcode.filter(line => {
      const trimmed = line.trim()
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(')
    })

    if (this.jobLines.length === 0) {
      return { success: false, error: 'No valid G-code lines' }
    }

    this.jobCurrentLine = 0
    this.jobStartTime = Date.now()
    this.isJobRunning = true
    this.jobProgressCallback = progressCallback
    this.pendingCommands = 0

    this.processJobQueue()
    return { success: true }
  }

  private processJobQueue(): void {
    if (!this.isJobRunning) return

    while (this.pendingCommands < this.MAX_BUFFER_COMMANDS && this.jobCurrentLine < this.jobLines.length) {
      const line = this.jobLines[this.jobCurrentLine]
      this.serial.write(line + '\n')
      this.pendingCommands++
      this.jobCurrentLine++

      if (this.jobProgressCallback) {
        const elapsed = Date.now() - this.jobStartTime
        const percentComplete = (this.jobCurrentLine / this.jobLines.length) * 100
        const estimatedTotal = elapsed / (percentComplete / 100)
        const estimatedRemaining = estimatedTotal - elapsed

        this.jobProgressCallback({
          currentLine: this.jobCurrentLine,
          totalLines: this.jobLines.length,
          percentComplete,
          elapsedTime: elapsed,
          estimatedRemaining: isFinite(estimatedRemaining) ? estimatedRemaining : 0,
        })
      }
    }

    if (this.jobCurrentLine >= this.jobLines.length && this.pendingCommands === 0) {
      this.isJobRunning = false
      this.jobProgressCallback = null
    }
  }

  async stopJob(): Promise<{ success: boolean; error?: string }> {
    this.isJobRunning = false
    this.jobLines = []
    this.jobCurrentLine = 0
    this.jobProgressCallback = null
    this.pendingCommands = 0
    
    await this.feedHold()
    setTimeout(() => this.reset(), 100)
    
    return { success: true }
  }

  getStatus(): GrblStatus | null {
    return this.currentStatus
  }

  isRunning(): boolean {
    return this.isJobRunning
  }
}
