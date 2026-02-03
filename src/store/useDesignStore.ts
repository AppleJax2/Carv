import { create } from 'zustand'
import type { 
  Project, 
  DesignObject, 
  Layer, 
  Toolpath
} from '@/types/design'
import type { MachineConfig, Tool, Material } from '@/types/machine'
import { DEFAULT_TOOL_LIBRARY } from '@/lib/defaultToolLibrary'

interface DesignState {
  project: Project | null
  
  machineConfig: MachineConfig | null
  tools: Tool[]
  materials: Material[]
  
  selectedObjectIds: string[]
  activeLayerId: string | null
  activeToolId: string | null
  
  activeTool: DesignTool
  
  viewTransform: {
    x: number
    y: number
    zoom: number
  }
  
  clipboard: DesignObject[]
  history: HistoryEntry[]
  historyIndex: number
  
  showMachineSetup: boolean
  showToolLibrary: boolean
  showToolpathPanel: boolean
  
  // Autosave state
  lastSavedAt: Date | null
  isDirty: boolean
  autoSaveEnabled: boolean
  
  setProject: (project: Project | null) => void
  createNewProject: (name: string, width: number, height: number) => void
  
  setMachineConfig: (config: MachineConfig | null) => void
  setTools: (tools: Tool[]) => void
  setMaterials: (materials: Material[]) => void
  
  addObject: (object: DesignObject) => void
  updateObject: (id: string, updates: Partial<DesignObject>) => void
  deleteObjects: (ids: string[]) => void
  
  selectObjects: (ids: string[]) => void
  selectAll: () => void
  deselectAll: () => void
  
  addLayer: (name: string) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  
  addToolpath: (toolpath: Toolpath) => void
  updateToolpath: (id: string, updates: Partial<Toolpath>) => void
  deleteToolpath: (id: string) => void
  
  setActiveTool: (tool: DesignTool) => void
  setActiveToolId: (id: string | null) => void
  
  setViewTransform: (transform: Partial<{ x: number; y: number; zoom: number }>) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  
  copy: () => void
  paste: () => void
  duplicate: () => void
  
  undo: () => void
  redo: () => void
  pushHistory: (entry: HistoryEntry) => void
  
  setShowMachineSetup: (show: boolean) => void
  setShowToolLibrary: (show: boolean) => void
  setShowToolpathPanel: (show: boolean) => void
  
  // Autosave methods
  markDirty: () => void
  markSaved: () => void
  setAutoSaveEnabled: (enabled: boolean) => void
  
  groupSelected: () => void
  ungroupSelected: () => void
  bringToFront: () => void
  sendToBack: () => void
  
  alignObjects: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  distributeObjects: (direction: 'horizontal' | 'vertical') => void
  
  booleanOperation: (operation: 'union' | 'subtract' | 'intersect') => void
}

export type DesignTool = 
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'pen'
  | 'text'
  | 'node-edit'
  | 'measure'

interface HistoryEntry {
  type: string
  timestamp: number
  snapshot: {
    objects: DesignObject[]
    layers: Layer[]
  }
}

const createDefaultProject = (name: string, width: number, height: number): Project => ({
  id: crypto.randomUUID(),
  name,
  createdAt: new Date(),
  modifiedAt: new Date(),
  canvas: {
    width,
    height,
    unit: 'mm',
    gridSize: 10,
    snapToGrid: true,
    showGrid: true,
    backgroundColor: '#f8fafc', // Light background for better contrast
  },
  layers: [
    {
      id: 'default',
      name: 'Layer 1',
      visible: true,
      locked: false,
      color: '#3b82f6',
      order: 0,
    },
  ],
  objects: [],
  toolpaths: [],
  material: {
    id: 'plywood',
    thickness: 18,
  },
  notes: '',
})

export const useDesignStore = create<DesignState>((set, get) => ({
  project: null,
  machineConfig: null,
  tools: DEFAULT_TOOL_LIBRARY,
  materials: [],
  selectedObjectIds: [],
  activeLayerId: 'default',
  activeToolId: null,
  activeTool: 'select',
  viewTransform: { x: 0, y: 0, zoom: 1 },
  clipboard: [],
  history: [],
  historyIndex: -1,
  showMachineSetup: false,
  showToolLibrary: false,
  showToolpathPanel: false,
  
  lastSavedAt: null,
  isDirty: false,
  autoSaveEnabled: true,

  setProject: (project) => set({ project, isDirty: true }),

  createNewProject: (name, width, height) => {
    const project = createDefaultProject(name, width, height)
    set({ 
      project, 
      selectedObjectIds: [], 
      activeLayerId: 'default',
      history: [],
      historyIndex: -1,
    })
  },

  setMachineConfig: (config) => set({ machineConfig: config }),
  setTools: (tools) => set({ tools }),
  setMaterials: (materials) => set({ materials }),

  addObject: (object) => {
    const { project, pushHistory } = get()
    if (!project) return

    pushHistory({
      type: 'addObject',
      timestamp: Date.now(),
      snapshot: { objects: [...project.objects], layers: [...project.layers] },
    })

    set({
      project: {
        ...project,
        objects: [...project.objects, object],
        modifiedAt: new Date(),
      },
    })
  },

  updateObject: (id, updates) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        objects: project.objects.map(obj =>
          obj.id === id ? { ...obj, ...updates } as DesignObject : obj
        ),
        modifiedAt: new Date(),
      },
    })
  },

  deleteObjects: (ids) => {
    const { project, pushHistory } = get()
    if (!project) return

    pushHistory({
      type: 'deleteObjects',
      timestamp: Date.now(),
      snapshot: { objects: [...project.objects], layers: [...project.layers] },
    })

    set({
      project: {
        ...project,
        objects: project.objects.filter(obj => !ids.includes(obj.id)),
        modifiedAt: new Date(),
      },
      selectedObjectIds: [],
    })
  },

  selectObjects: (ids) => set({ selectedObjectIds: ids }),

  selectAll: () => {
    const { project } = get()
    if (!project) return
    set({ selectedObjectIds: project.objects.map(obj => obj.id) })
  },

  deselectAll: () => set({ selectedObjectIds: [] }),

  addLayer: (name) => {
    const { project } = get()
    if (!project) return

    const newLayer: Layer = {
      id: crypto.randomUUID(),
      name,
      visible: true,
      locked: false,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      order: project.layers.length,
    }

    set({
      project: {
        ...project,
        layers: [...project.layers, newLayer],
        modifiedAt: new Date(),
      },
      activeLayerId: newLayer.id,
    })
  },

  updateLayer: (id, updates) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        layers: project.layers.map(layer =>
          layer.id === id ? { ...layer, ...updates } : layer
        ),
        modifiedAt: new Date(),
      },
    })
  },

  deleteLayer: (id) => {
    const { project } = get()
    if (!project || project.layers.length <= 1) return

    set({
      project: {
        ...project,
        layers: project.layers.filter(layer => layer.id !== id),
        objects: project.objects.filter(obj => obj.layerId !== id),
        modifiedAt: new Date(),
      },
      activeLayerId: project.layers[0].id,
    })
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),

  addToolpath: (toolpath) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        toolpaths: [...project.toolpaths, toolpath],
        modifiedAt: new Date(),
      },
    })
  },

  updateToolpath: (id, updates) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        toolpaths: project.toolpaths.map(tp =>
          tp.id === id ? { ...tp, ...updates } : tp
        ),
        modifiedAt: new Date(),
      },
    })
  },

  deleteToolpath: (id) => {
    const { project } = get()
    if (!project) return

    set({
      project: {
        ...project,
        toolpaths: project.toolpaths.filter(tp => tp.id !== id),
        modifiedAt: new Date(),
      },
    })
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveToolId: (id) => set({ activeToolId: id }),

  setViewTransform: (transform) => set(state => ({
    viewTransform: { ...state.viewTransform, ...transform },
  })),

  zoomIn: () => set(state => ({
    viewTransform: { ...state.viewTransform, zoom: Math.min(state.viewTransform.zoom * 1.25, 10) },
  })),

  zoomOut: () => set(state => ({
    viewTransform: { ...state.viewTransform, zoom: Math.max(state.viewTransform.zoom / 1.25, 0.1) },
  })),

  zoomToFit: () => {
    const { project } = get()
    if (!project) return
    set({ viewTransform: { x: 0, y: 0, zoom: 1 } })
  },

  copy: () => {
    const { project, selectedObjectIds } = get()
    if (!project) return

    const selectedObjects = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
    set({ clipboard: JSON.parse(JSON.stringify(selectedObjects)) })
  },

  paste: () => {
    const { project, clipboard, activeLayerId, pushHistory } = get()
    if (!project || clipboard.length === 0) return

    pushHistory({
      type: 'paste',
      timestamp: Date.now(),
      snapshot: { objects: [...project.objects], layers: [...project.layers] },
    })

    const newObjects = clipboard.map(obj => ({
      ...obj,
      id: crypto.randomUUID(),
      layerId: activeLayerId || 'default',
      transform: {
        ...obj.transform,
        x: obj.transform.x + 10,
        y: obj.transform.y + 10,
      },
    }))

    set({
      project: {
        ...project,
        objects: [...project.objects, ...newObjects],
        modifiedAt: new Date(),
      },
      selectedObjectIds: newObjects.map(obj => obj.id),
    })
  },

  duplicate: () => {
    const { copy, paste } = get()
    copy()
    paste()
  },

  undo: () => {
    const { history, historyIndex, project } = get()
    if (historyIndex < 0 || !project) return

    const entry = history[historyIndex]
    set({
      project: {
        ...project,
        objects: entry.snapshot.objects,
        layers: entry.snapshot.layers,
        modifiedAt: new Date(),
      },
      historyIndex: historyIndex - 1,
    })
  },

  redo: () => {
    const { history, historyIndex, project } = get()
    if (historyIndex >= history.length - 1 || !project) return

    const entry = history[historyIndex + 1]
    set({
      project: {
        ...project,
        objects: entry.snapshot.objects,
        layers: entry.snapshot.layers,
        modifiedAt: new Date(),
      },
      historyIndex: historyIndex + 1,
    })
  },

  pushHistory: (entry) => {
    const { history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(entry)
    
    if (newHistory.length > 50) {
      newHistory.shift()
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    })
  },

  setShowMachineSetup: (show) => set({ showMachineSetup: show }),
  setShowToolLibrary: (show) => set({ showToolLibrary: show }),
  setShowToolpathPanel: (show) => set({ showToolpathPanel: show }),

  groupSelected: () => {
    // TODO: Implement grouping
  },

  ungroupSelected: () => {
    // TODO: Implement ungrouping
  },

  bringToFront: () => {
    const { project, selectedObjectIds } = get()
    if (!project || selectedObjectIds.length === 0) return

    const selected = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
    const others = project.objects.filter(obj => !selectedObjectIds.includes(obj.id))

    set({
      project: {
        ...project,
        objects: [...others, ...selected],
        modifiedAt: new Date(),
      },
    })
  },

  sendToBack: () => {
    const { project, selectedObjectIds } = get()
    if (!project || selectedObjectIds.length === 0) return

    const selected = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
    const others = project.objects.filter(obj => !selectedObjectIds.includes(obj.id))

    set({
      project: {
        ...project,
        objects: [...selected, ...others],
        modifiedAt: new Date(),
      },
    })
  },

  alignObjects: (alignment) => {
    const { project, selectedObjectIds } = get()
    if (!project || selectedObjectIds.length < 2) return

    const selected = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
    
    let targetValue: number
    switch (alignment) {
      case 'left':
        targetValue = Math.min(...selected.map(obj => obj.transform.x))
        break
      case 'right':
        targetValue = Math.max(...selected.map(obj => obj.transform.x))
        break
      case 'center':
        const minX = Math.min(...selected.map(obj => obj.transform.x))
        const maxX = Math.max(...selected.map(obj => obj.transform.x))
        targetValue = (minX + maxX) / 2
        break
      case 'top':
        targetValue = Math.min(...selected.map(obj => obj.transform.y))
        break
      case 'bottom':
        targetValue = Math.max(...selected.map(obj => obj.transform.y))
        break
      case 'middle':
        const minY = Math.min(...selected.map(obj => obj.transform.y))
        const maxY = Math.max(...selected.map(obj => obj.transform.y))
        targetValue = (minY + maxY) / 2
        break
    }

    const updatedObjects = project.objects.map(obj => {
      if (!selectedObjectIds.includes(obj.id)) return obj
      
      const newTransform = { ...obj.transform }
      if (['left', 'right', 'center'].includes(alignment)) {
        newTransform.x = targetValue
      } else {
        newTransform.y = targetValue
      }
      
      return { ...obj, transform: newTransform } as DesignObject
    })

    set({
      project: {
        ...project,
        objects: updatedObjects,
        modifiedAt: new Date(),
      },
    })
  },

  distributeObjects: (direction) => {
    const { project, selectedObjectIds } = get()
    if (!project || selectedObjectIds.length < 3) return

    const selected = project.objects
      .filter(obj => selectedObjectIds.includes(obj.id))
      .sort((a, b) => 
        direction === 'horizontal' 
          ? a.transform.x - b.transform.x 
          : a.transform.y - b.transform.y
      )

    const first = selected[0]
    const last = selected[selected.length - 1]
    const totalDistance = direction === 'horizontal'
      ? last.transform.x - first.transform.x
      : last.transform.y - first.transform.y
    const step = totalDistance / (selected.length - 1)

    const updatedObjects = project.objects.map(obj => {
      const index = selected.findIndex(s => s.id === obj.id)
      if (index === -1) return obj

      const newTransform = { ...obj.transform }
      if (direction === 'horizontal') {
        newTransform.x = first.transform.x + step * index
      } else {
        newTransform.y = first.transform.y + step * index
      }

      return { ...obj, transform: newTransform } as DesignObject
    })

    set({
      project: {
        ...project,
        objects: updatedObjects,
        modifiedAt: new Date(),
      },
    })
  },

  markDirty: () => set({ isDirty: true }),
  
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),
  
  setAutoSaveEnabled: (enabled) => set({ autoSaveEnabled: enabled }),

  booleanOperation: (operation) => {
    // TODO: Implement boolean operations using clipper-lib or similar
    console.log('Boolean operation:', operation)
  },
}))
