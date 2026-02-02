import { contextBridge, ipcRenderer } from 'electron'

export interface SerialPort {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  friendlyName?: string
  vendorId?: string
  productId?: string
}

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

const electronAPI = {
  serial: {
    listPorts: (): Promise<SerialPort[]> => ipcRenderer.invoke('serial:list-ports'),
    connect: (portPath: string, baudRate: number) => ipcRenderer.invoke('serial:connect', portPath, baudRate),
    disconnect: () => ipcRenderer.invoke('serial:disconnect'),
  },
  grbl: {
    send: (command: string) => ipcRenderer.invoke('grbl:send', command),
    jog: (axis: string, distance: number, feedRate: number) => ipcRenderer.invoke('grbl:jog', axis, distance, feedRate),
    jogCancel: () => ipcRenderer.invoke('grbl:jog-cancel'),
    home: () => ipcRenderer.invoke('grbl:home'),
    unlock: () => ipcRenderer.invoke('grbl:unlock'),
    reset: () => ipcRenderer.invoke('grbl:reset'),
    feedHold: () => ipcRenderer.invoke('grbl:feed-hold'),
    resume: () => ipcRenderer.invoke('grbl:resume'),
    setZero: (axis: string) => ipcRenderer.invoke('grbl:set-zero', axis),
    goToZero: (axis: string) => ipcRenderer.invoke('grbl:go-to-zero', axis),
    feedOverride: (value: number) => ipcRenderer.invoke('grbl:feed-override', value),
    spindleOverride: (value: number) => ipcRenderer.invoke('grbl:spindle-override', value),
    rapidOverride: (value: number) => ipcRenderer.invoke('grbl:rapid-override', value),
    startJob: (gcode: string[]) => ipcRenderer.invoke('grbl:start-job', gcode),
    stopJob: () => ipcRenderer.invoke('grbl:stop-job'),
    onData: (callback: (data: GrblStatus) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, data: GrblStatus) => callback(data)
      ipcRenderer.on('grbl:data', subscription)
      return () => ipcRenderer.removeListener('grbl:data', subscription)
    },
    onJobProgress: (callback: (progress: JobProgress) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, progress: JobProgress) => callback(progress)
      ipcRenderer.on('grbl:job-progress', subscription)
      return () => ipcRenderer.removeListener('grbl:job-progress', subscription)
    },
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:open-file'),
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    install: () => ipcRenderer.invoke('updater:install'),
    onUpdateAvailable: (callback: () => void) => {
      ipcRenderer.on('update-available', callback)
      return () => ipcRenderer.removeListener('update-available', callback)
    },
    onUpdateDownloaded: (callback: () => void) => {
      ipcRenderer.on('update-downloaded', callback)
      return () => ipcRenderer.removeListener('update-downloaded', callback)
    },
    onUpdateError: (callback: (error: string) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
      ipcRenderer.on('update-error', subscription)
      return () => ipcRenderer.removeListener('update-error', subscription)
    },
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
