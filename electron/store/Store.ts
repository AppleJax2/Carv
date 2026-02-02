import ElectronStore from 'electron-store'

export interface AppSettings {
  connection: {
    defaultBaudRate: number
    statusPollInterval: number
    connectionTimeout: number
  }
  machine: {
    maxTravel: { x: number; y: number; z: number }
    softLimits: boolean
    homingEnabled: boolean
  }
  display: {
    units: 'mm' | 'inches'
    decimalPlaces: number
    theme: 'dark' | 'light'
  }
  jogPresets: number[]
  defaultFeedRate: number
  macros: Macro[]
  workCoordinates: WorkCoordinate[]
  recentFiles: string[]
}

export interface Macro {
  id: string
  name: string
  gcode: string
  category: string
  shortcut?: string
}

export interface WorkCoordinate {
  id: string
  name: string
  offset: { x: number; y: number; z: number }
}

const defaultSettings: AppSettings = {
  connection: {
    defaultBaudRate: 115200,
    statusPollInterval: 100,
    connectionTimeout: 5000,
  },
  machine: {
    maxTravel: { x: 300, y: 300, z: 100 },
    softLimits: true,
    homingEnabled: true,
  },
  display: {
    units: 'mm',
    decimalPlaces: 3,
    theme: 'dark',
  },
  jogPresets: [0.1, 1, 10, 100],
  defaultFeedRate: 1000,
  macros: [
    {
      id: 'home',
      name: 'Home All',
      gcode: '$H',
      category: 'Setup',
    },
    {
      id: 'unlock',
      name: 'Unlock',
      gcode: '$X',
      category: 'Setup',
    },
    {
      id: 'park',
      name: 'Park',
      gcode: 'G53 G0 Z-5\nG53 G0 X-5 Y-5',
      category: 'Movement',
    },
    {
      id: 'spindle-warmup',
      name: 'Spindle Warmup',
      gcode: 'M3 S1000\nG4 P30\nM3 S5000\nG4 P30\nM3 S10000\nG4 P60\nM5',
      category: 'Spindle',
    },
  ],
  workCoordinates: [
    { id: 'G54', name: 'G54 - Default', offset: { x: 0, y: 0, z: 0 } },
    { id: 'G55', name: 'G55', offset: { x: 0, y: 0, z: 0 } },
    { id: 'G56', name: 'G56', offset: { x: 0, y: 0, z: 0 } },
    { id: 'G57', name: 'G57', offset: { x: 0, y: 0, z: 0 } },
    { id: 'G58', name: 'G58', offset: { x: 0, y: 0, z: 0 } },
    { id: 'G59', name: 'G59', offset: { x: 0, y: 0, z: 0 } },
  ],
  recentFiles: [],
}

export class Store {
  private store: ElectronStore<AppSettings>

  constructor() {
    this.store = new ElectronStore<AppSettings>({
      defaults: defaultSettings,
      name: 'cncraft-settings',
    })
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.store.get(key)
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.store.set(key, value)
  }

  getAll(): AppSettings {
    return this.store.store
  }

  reset(): void {
    this.store.clear()
  }

  addRecentFile(filePath: string): void {
    const recent = this.get('recentFiles')
    const filtered = recent.filter(f => f !== filePath)
    filtered.unshift(filePath)
    this.set('recentFiles', filtered.slice(0, 10))
  }

  addMacro(macro: Macro): void {
    const macros = this.get('macros')
    macros.push(macro)
    this.set('macros', macros)
  }

  updateMacro(id: string, updates: Partial<Macro>): void {
    const macros = this.get('macros')
    const index = macros.findIndex(m => m.id === id)
    if (index !== -1) {
      macros[index] = { ...macros[index], ...updates }
      this.set('macros', macros)
    }
  }

  deleteMacro(id: string): void {
    const macros = this.get('macros')
    this.set('macros', macros.filter(m => m.id !== id))
  }

  updateWorkCoordinate(id: string, updates: Partial<WorkCoordinate>): void {
    const coords = this.get('workCoordinates')
    const index = coords.findIndex(c => c.id === id)
    if (index !== -1) {
      coords[index] = { ...coords[index], ...updates }
      this.set('workCoordinates', coords)
    }
  }
}
