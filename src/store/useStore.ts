import { create } from 'zustand'

export interface Position {
  x: number
  y: number
  z: number
}

export interface GrblStatus {
  state: string
  machinePosition: Position
  workPosition: Position
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

export interface ConsoleMessage {
  id: string
  type: 'sent' | 'received' | 'error' | 'info'
  content: string
  timestamp: Date
}

interface AppState {
  isConnected: boolean
  portPath: string | null
  baudRate: number
  status: GrblStatus | null
  activeWCS: string
  jogDistance: number
  jogFeedRate: number
  
  gcodeFile: {
    name: string
    content: string[]
    path: string
  } | null
  
  jobProgress: JobProgress | null
  isJobRunning: boolean
  isJobPaused: boolean
  
  consoleMessages: ConsoleMessage[]
  isConsoleOpen: boolean
  
  feedOverride: number
  rapidOverride: number
  spindleOverride: number
  
  setConnected: (connected: boolean, portPath?: string) => void
  setBaudRate: (baudRate: number) => void
  setStatus: (status: GrblStatus) => void
  setActiveWCS: (wcs: string) => void
  setJogDistance: (distance: number) => void
  setJogFeedRate: (feedRate: number) => void
  setGcodeFile: (file: { name: string; content: string[]; path: string } | null) => void
  setJobProgress: (progress: JobProgress | null) => void
  setJobRunning: (running: boolean) => void
  setJobPaused: (paused: boolean) => void
  addConsoleMessage: (type: ConsoleMessage['type'], content: string) => void
  clearConsole: () => void
  setConsoleOpen: (open: boolean) => void
  setFeedOverride: (value: number) => void
  setRapidOverride: (value: number) => void
  setSpindleOverride: (value: number) => void
}

export const useStore = create<AppState>((set) => ({
  isConnected: false,
  portPath: null,
  baudRate: 115200,
  status: null,
  activeWCS: 'G54',
  jogDistance: 10,
  jogFeedRate: 1000,
  gcodeFile: null,
  jobProgress: null,
  isJobRunning: false,
  isJobPaused: false,
  consoleMessages: [],
  isConsoleOpen: false,
  feedOverride: 100,
  rapidOverride: 100,
  spindleOverride: 100,

  setConnected: (connected, portPath) => set({ 
    isConnected: connected, 
    portPath: connected ? portPath : null,
    status: connected ? undefined : null,
  }),
  
  setBaudRate: (baudRate) => set({ baudRate }),
  
  setStatus: (status) => set({ status }),
  
  setActiveWCS: (wcs) => set({ activeWCS: wcs }),
  
  setJogDistance: (distance) => set({ jogDistance: distance }),
  
  setJogFeedRate: (feedRate) => set({ jogFeedRate: feedRate }),
  
  setGcodeFile: (file) => set({ gcodeFile: file }),
  
  setJobProgress: (progress) => set({ jobProgress: progress }),
  
  setJobRunning: (running) => set({ isJobRunning: running }),
  
  setJobPaused: (paused) => set({ isJobPaused: paused }),
  
  addConsoleMessage: (type, content) => set((state) => ({
    consoleMessages: [
      ...state.consoleMessages.slice(-500),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        content,
        timestamp: new Date(),
      },
    ],
  })),
  
  clearConsole: () => set({ consoleMessages: [] }),
  
  setConsoleOpen: (open) => set({ isConsoleOpen: open }),
  
  setFeedOverride: (value) => set({ feedOverride: value }),
  
  setRapidOverride: (value) => set({ rapidOverride: value }),
  
  setSpindleOverride: (value) => set({ spindleOverride: value }),
}))
