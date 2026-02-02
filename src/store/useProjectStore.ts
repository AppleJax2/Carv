import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  Project, 
  Setup, 
  Operation, 
  Keepout,
  CanvasSettings,
  StockDefinition,
  WorkCoordinateSystem,
} from '@/types/project'
import type { DesignObject, Layer } from '@/types/design'
import type { MachineConfig, Tool, Material } from '@/types/machine'
import { createDefaultProject, createDefaultSetup, migrateProject } from '@/types/project'

export type DesignTool = 
  | 'select'
  | 'pan'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'pen'
  | 'bezier'
  | 'text'
  | 'node-edit'
  | 'measure'
  | 'dimension'
  | 'offset'
  | 'fillet'
  | 'chamfer'

export type WorkspaceMode = 'design' | 'cam' | 'simulate' | 'run'

interface HistoryEntry {
  type: string
  timestamp: number
  snapshot: {
    objects: DesignObject[]
    layers: Layer[]
    setups: Setup[]
  }
}

interface SnapSettings {
  enabled: boolean
  toGrid: boolean
  toObjects: boolean
  toGuides: boolean
  toEndpoints: boolean
  toMidpoints: boolean
  toIntersections: boolean
  toCenters: boolean
  tolerance: number
}

interface ViewSettings {
  showGrid: boolean
  showRulers: boolean
  showOrigin: boolean
  showToolpaths: boolean
  showSimulation: boolean
  showKeepouts: boolean
  showStock: boolean
  showLabels: boolean
}

interface ProjectState {
  project: Project | null
  
  machineConfig: MachineConfig | null
  tools: Tool[]
  materials: Material[]
  keepouts: Keepout[]
  
  workspaceMode: WorkspaceMode
  
  selectedObjectIds: string[]
  selectedOperationIds: string[]
  activeLayerId: string | null
  activeSetupId: string | null
  activeToolId: string | null
  
  activeTool: DesignTool
  
  viewTransform: {
    x: number
    y: number
    zoom: number
  }
  
  snapSettings: SnapSettings
  viewSettings: ViewSettings
  
  clipboard: DesignObject[]
  history: HistoryEntry[]
  historyIndex: number
  
  showMachineSetup: boolean
  showToolLibrary: boolean
  showOperationPanel: boolean
  showCommandPalette: boolean
  
  setProject: (project: Project | null) => void
  createNewProject: (name: string, width?: number, height?: number) => void
  loadProject: (data: any) => void
  
  setMachineConfig: (config: MachineConfig | null) => void
  setTools: (tools: Tool[]) => void
  addTool: (tool: Tool) => void
  updateTool: (id: string, updates: Partial<Tool>) => void
  deleteTool: (id: string) => void
  
  setMaterials: (materials: Material[]) => void
  
  addObject: (object: DesignObject) => void
  updateObject: (id: string, updates: Partial<DesignObject>) => void
  deleteObjects: (ids: string[]) => void
  duplicateObjects: (ids: string[]) => DesignObject[]
  
  selectObjects: (ids: string[]) => void
  selectAll: () => void
  deselectAll: () => void
  selectByType: (type: string) => void
  selectByLayer: (layerId: string) => void
  invertSelection: () => void
  
  addLayer: (name: string) => void
  updateLayer: (id: string, updates: Partial<Layer>) => void
  deleteLayer: (id: string) => void
  setActiveLayer: (id: string) => void
  reorderLayers: (fromIndex: number, toIndex: number) => void
  
  addSetup: (name?: string) => Setup
  updateSetup: (id: string, updates: Partial<Setup>) => void
  deleteSetup: (id: string) => void
  setActiveSetup: (id: string) => void
  duplicateSetup: (id: string) => Setup
  
  addOperation: (setupId: string, operation: Partial<Operation>) => Operation
  updateOperation: (setupId: string, operationId: string, updates: Partial<Operation>) => void
  deleteOperation: (setupId: string, operationId: string) => void
  reorderOperations: (setupId: string, fromIndex: number, toIndex: number) => void
  
  addKeepout: (keepout: Keepout) => void
  updateKeepout: (id: string, updates: Partial<Keepout>) => void
  deleteKeepout: (id: string) => void
  
  setWorkspaceMode: (mode: WorkspaceMode) => void
  setActiveTool: (tool: DesignTool) => void
  setActiveToolId: (id: string | null) => void
  
  setViewTransform: (transform: Partial<{ x: number; y: number; zoom: number }>) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  zoomToSelection: () => void
  
  setSnapSettings: (settings: Partial<SnapSettings>) => void
  setViewSettings: (settings: Partial<ViewSettings>) => void
  
  copy: () => void
  paste: () => void
  duplicate: () => void
  
  undo: () => void
  redo: () => void
  pushHistory: (entry: HistoryEntry) => void
  clearHistory: () => void
  
  setShowMachineSetup: (show: boolean) => void
  setShowToolLibrary: (show: boolean) => void
  setShowOperationPanel: (show: boolean) => void
  setShowCommandPalette: (show: boolean) => void
  
  groupSelected: () => void
  ungroupSelected: () => void
  bringToFront: () => void
  sendToBack: () => void
  bringForward: () => void
  sendBackward: () => void
  
  alignObjects: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void
  distributeObjects: (direction: 'horizontal' | 'vertical') => void
  
  flipObjects: (direction: 'horizontal' | 'vertical') => void
  rotateObjects: (angle: number) => void
  scaleObjects: (scaleX: number, scaleY: number) => void
  
  updateCanvasSettings: (settings: Partial<CanvasSettings>) => void
  updateStock: (setupId: string, stock: Partial<StockDefinition>) => void
  updateWCS: (setupId: string, wcs: Partial<WorkCoordinateSystem>) => void
}

const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  toGrid: true,
  toObjects: true,
  toGuides: true,
  toEndpoints: true,
  toMidpoints: true,
  toIntersections: true,
  toCenters: true,
  tolerance: 10,
}

const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  showGrid: true,
  showRulers: true,
  showOrigin: true,
  showToolpaths: true,
  showSimulation: false,
  showKeepouts: true,
  showStock: true,
  showLabels: true,
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: null,
      machineConfig: null,
      tools: [],
      materials: [],
      keepouts: [],
      
      workspaceMode: 'design',
      
      selectedObjectIds: [],
      selectedOperationIds: [],
      activeLayerId: 'default',
      activeSetupId: null,
      activeToolId: null,
      
      activeTool: 'select',
      
      viewTransform: { x: 0, y: 0, zoom: 1 },
      
      snapSettings: DEFAULT_SNAP_SETTINGS,
      viewSettings: DEFAULT_VIEW_SETTINGS,
      
      clipboard: [],
      history: [],
      historyIndex: -1,
      
      showMachineSetup: false,
      showToolLibrary: false,
      showOperationPanel: false,
      showCommandPalette: false,

      setProject: (project) => set({ 
        project,
        activeSetupId: project?.setups[0]?.id || null,
        activeLayerId: project?.layers[0]?.id || null,
      }),

      createNewProject: (name, width = 300, height = 300) => {
        const project = createDefaultProject(name)
        project.canvas.width = width
        project.canvas.height = height
        set({ 
          project, 
          selectedObjectIds: [], 
          selectedOperationIds: [],
          activeLayerId: 'default',
          activeSetupId: project.setups[0]?.id || null,
          history: [],
          historyIndex: -1,
        })
      },

      loadProject: (data) => {
        const project = migrateProject(data)
        set({
          project,
          selectedObjectIds: [],
          selectedOperationIds: [],
          activeLayerId: project.layers[0]?.id || null,
          activeSetupId: project.setups[0]?.id || null,
          history: [],
          historyIndex: -1,
        })
      },

      setMachineConfig: (config) => set({ machineConfig: config }),
      
      setTools: (tools) => set({ tools }),
      
      addTool: (tool) => set(state => ({ tools: [...state.tools, tool] })),
      
      updateTool: (id, updates) => set(state => ({
        tools: state.tools.map(t => t.id === id ? { ...t, ...updates } : t)
      })),
      
      deleteTool: (id) => set(state => ({
        tools: state.tools.filter(t => t.id !== id)
      })),
      
      setMaterials: (materials) => set({ materials }),

      addObject: (object) => {
        const { project, pushHistory } = get()
        if (!project) return

        pushHistory({
          type: 'addObject',
          timestamp: Date.now(),
          snapshot: { 
            objects: [...project.objects], 
            layers: [...project.layers],
            setups: [...project.setups],
          },
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
          snapshot: { 
            objects: [...project.objects], 
            layers: [...project.layers],
            setups: [...project.setups],
          },
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

      duplicateObjects: (ids) => {
        const { project, activeLayerId } = get()
        if (!project) return []

        const objectsToDuplicate = project.objects.filter(obj => ids.includes(obj.id))
        const newObjects = objectsToDuplicate.map(obj => ({
          ...obj,
          id: crypto.randomUUID(),
          layerId: activeLayerId || obj.layerId,
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

        return newObjects
      },

      selectObjects: (ids) => set({ selectedObjectIds: ids }),

      selectAll: () => {
        const { project } = get()
        if (!project) return
        set({ selectedObjectIds: project.objects.map(obj => obj.id) })
      },

      deselectAll: () => set({ selectedObjectIds: [], selectedOperationIds: [] }),

      selectByType: (type) => {
        const { project } = get()
        if (!project) return
        set({ 
          selectedObjectIds: project.objects
            .filter(obj => obj.type === type)
            .map(obj => obj.id) 
        })
      },

      selectByLayer: (layerId) => {
        const { project } = get()
        if (!project) return
        set({ 
          selectedObjectIds: project.objects
            .filter(obj => obj.layerId === layerId)
            .map(obj => obj.id) 
        })
      },

      invertSelection: () => {
        const { project, selectedObjectIds } = get()
        if (!project) return
        set({
          selectedObjectIds: project.objects
            .filter(obj => !selectedObjectIds.includes(obj.id))
            .map(obj => obj.id)
        })
      },

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

      reorderLayers: (fromIndex, toIndex) => {
        const { project } = get()
        if (!project) return

        const layers = [...project.layers]
        const [removed] = layers.splice(fromIndex, 1)
        layers.splice(toIndex, 0, removed)
        
        layers.forEach((layer, idx) => { layer.order = idx })

        set({
          project: {
            ...project,
            layers,
            modifiedAt: new Date(),
          },
        })
      },

      addSetup: (name) => {
        const { project } = get()
        if (!project) return createDefaultSetup()

        const setup = createDefaultSetup(name || `Setup ${project.setups.length + 1}`)
        setup.order = project.setups.length

        set({
          project: {
            ...project,
            setups: [...project.setups, setup],
            modifiedAt: new Date(),
          },
          activeSetupId: setup.id,
        })

        return setup
      },

      updateSetup: (id, updates) => {
        const { project } = get()
        if (!project) return

        set({
          project: {
            ...project,
            setups: project.setups.map(setup =>
              setup.id === id ? { ...setup, ...updates } : setup
            ),
            modifiedAt: new Date(),
          },
        })
      },

      deleteSetup: (id) => {
        const { project } = get()
        if (!project || project.setups.length <= 1) return

        const remainingSetups = project.setups.filter(s => s.id !== id)
        
        set({
          project: {
            ...project,
            setups: remainingSetups,
            modifiedAt: new Date(),
          },
          activeSetupId: remainingSetups[0]?.id || null,
        })
      },

      setActiveSetup: (id) => set({ activeSetupId: id }),

      duplicateSetup: (id) => {
        const { project } = get()
        if (!project) return createDefaultSetup()

        const original = project.setups.find(s => s.id === id)
        if (!original) return createDefaultSetup()

        const duplicate: Setup = {
          ...JSON.parse(JSON.stringify(original)),
          id: crypto.randomUUID(),
          name: `${original.name} (Copy)`,
          order: project.setups.length,
          operations: original.operations.map(op => ({
            ...op,
            id: crypto.randomUUID(),
          })),
        }

        set({
          project: {
            ...project,
            setups: [...project.setups, duplicate],
            modifiedAt: new Date(),
          },
          activeSetupId: duplicate.id,
        })

        return duplicate
      },

      addOperation: (setupId, operation) => {
        const { project, tools } = get()
        if (!project) return {} as Operation

        const setup = project.setups.find(s => s.id === setupId)
        if (!setup) return {} as Operation

        const defaultTool = tools[0]
        
        const newOperation: Operation = {
          id: crypto.randomUUID(),
          name: operation.name || `Operation ${setup.operations.length + 1}`,
          type: operation.type || 'profile',
          order: setup.operations.length,
          enabled: true,
          toolId: operation.toolId || defaultTool?.id || '',
          sourceObjectIds: operation.sourceObjectIds || [],
          settings: {
            cutDepth: 5,
            depthPerPass: 2,
            feedRate: defaultTool?.defaultFeedRate || 1000,
            plungeRate: defaultTool?.defaultPlungeRate || 500,
            retractRate: defaultTool?.defaultPlungeRate || 500,
            spindleSpeed: defaultTool?.defaultSpindleSpeed || 18000,
            spindleDirection: 'cw',
            coolant: 'off',
            safeHeight: 10,
            retractHeight: 5,
            stockToLeave: 0,
            stockToLeaveZ: 0,
            useRamping: false,
            useTabs: false,
            useLeadInOut: false,
            ...operation.settings,
          },
          warnings: [],
          errors: [],
        }

        set({
          project: {
            ...project,
            setups: project.setups.map(s =>
              s.id === setupId
                ? { ...s, operations: [...s.operations, newOperation] }
                : s
            ),
            modifiedAt: new Date(),
          },
        })

        return newOperation
      },

      updateOperation: (setupId, operationId, updates) => {
        const { project } = get()
        if (!project) return

        set({
          project: {
            ...project,
            setups: project.setups.map(setup =>
              setup.id === setupId
                ? {
                    ...setup,
                    operations: setup.operations.map(op =>
                      op.id === operationId ? { ...op, ...updates } : op
                    ),
                  }
                : setup
            ),
            modifiedAt: new Date(),
          },
        })
      },

      deleteOperation: (setupId, operationId) => {
        const { project } = get()
        if (!project) return

        set({
          project: {
            ...project,
            setups: project.setups.map(setup =>
              setup.id === setupId
                ? {
                    ...setup,
                    operations: setup.operations.filter(op => op.id !== operationId),
                  }
                : setup
            ),
            modifiedAt: new Date(),
          },
        })
      },

      reorderOperations: (setupId, fromIndex, toIndex) => {
        const { project } = get()
        if (!project) return

        const setup = project.setups.find(s => s.id === setupId)
        if (!setup) return

        const operations = [...setup.operations]
        const [removed] = operations.splice(fromIndex, 1)
        operations.splice(toIndex, 0, removed)
        operations.forEach((op, idx) => { op.order = idx })

        set({
          project: {
            ...project,
            setups: project.setups.map(s =>
              s.id === setupId ? { ...s, operations } : s
            ),
            modifiedAt: new Date(),
          },
        })
      },

      addKeepout: (keepout) => set(state => ({
        keepouts: [...state.keepouts, keepout]
      })),

      updateKeepout: (id, updates) => set(state => ({
        keepouts: state.keepouts.map(k => k.id === id ? { ...k, ...updates } : k)
      })),

      deleteKeepout: (id) => set(state => ({
        keepouts: state.keepouts.filter(k => k.id !== id)
      })),

      setWorkspaceMode: (mode) => set({ workspaceMode: mode }),
      
      setActiveTool: (tool) => set({ activeTool: tool }),
      
      setActiveToolId: (id) => set({ activeToolId: id }),

      setViewTransform: (transform) => set(state => ({
        viewTransform: { ...state.viewTransform, ...transform },
      })),

      zoomIn: () => set(state => ({
        viewTransform: { 
          ...state.viewTransform, 
          zoom: Math.min(state.viewTransform.zoom * 1.25, 20) 
        },
      })),

      zoomOut: () => set(state => ({
        viewTransform: { 
          ...state.viewTransform, 
          zoom: Math.max(state.viewTransform.zoom / 1.25, 0.05) 
        },
      })),

      zoomToFit: () => {
        const { project } = get()
        if (!project) return
        set({ viewTransform: { x: 0, y: 0, zoom: 1 } })
      },

      zoomToSelection: () => {
        const { project, selectedObjectIds } = get()
        if (!project || selectedObjectIds.length === 0) return
        set({ viewTransform: { x: 0, y: 0, zoom: 1 } })
      },

      setSnapSettings: (settings) => set(state => ({
        snapSettings: { ...state.snapSettings, ...settings }
      })),

      setViewSettings: (settings) => set(state => ({
        viewSettings: { ...state.viewSettings, ...settings }
      })),

      copy: () => {
        const { project, selectedObjectIds } = get()
        if (!project) return

        const selectedObjects = project.objects.filter(obj => 
          selectedObjectIds.includes(obj.id)
        )
        set({ clipboard: JSON.parse(JSON.stringify(selectedObjects)) })
      },

      paste: () => {
        const { project, clipboard, activeLayerId, pushHistory } = get()
        if (!project || clipboard.length === 0) return

        pushHistory({
          type: 'paste',
          timestamp: Date.now(),
          snapshot: { 
            objects: [...project.objects], 
            layers: [...project.layers],
            setups: [...project.setups],
          },
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
            setups: entry.snapshot.setups,
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
            setups: entry.snapshot.setups,
            modifiedAt: new Date(),
          },
          historyIndex: historyIndex + 1,
        })
      },

      pushHistory: (entry) => {
        const { history, historyIndex } = get()
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push(entry)
        
        if (newHistory.length > 100) {
          newHistory.shift()
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1,
        })
      },

      clearHistory: () => set({ history: [], historyIndex: -1 }),

      setShowMachineSetup: (show) => set({ showMachineSetup: show }),
      setShowToolLibrary: (show) => set({ showToolLibrary: show }),
      setShowOperationPanel: (show) => set({ showOperationPanel: show }),
      setShowCommandPalette: (show) => set({ showCommandPalette: show }),

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

      bringForward: () => {
        const { project, selectedObjectIds } = get()
        if (!project || selectedObjectIds.length === 0) return

        const objects = [...project.objects]
        for (const id of selectedObjectIds) {
          const idx = objects.findIndex(obj => obj.id === id)
          if (idx < objects.length - 1) {
            [objects[idx], objects[idx + 1]] = [objects[idx + 1], objects[idx]]
          }
        }

        set({
          project: { ...project, objects, modifiedAt: new Date() },
        })
      },

      sendBackward: () => {
        const { project, selectedObjectIds } = get()
        if (!project || selectedObjectIds.length === 0) return

        const objects = [...project.objects]
        for (const id of [...selectedObjectIds].reverse()) {
          const idx = objects.findIndex(obj => obj.id === id)
          if (idx > 0) {
            [objects[idx], objects[idx - 1]] = [objects[idx - 1], objects[idx]]
          }
        }

        set({
          project: { ...project, objects, modifiedAt: new Date() },
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
            targetValue = Math.max(...selected.map(obj => obj.transform.y))
            break
          case 'bottom':
            targetValue = Math.min(...selected.map(obj => obj.transform.y))
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
          project: { ...project, objects: updatedObjects, modifiedAt: new Date() },
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
          project: { ...project, objects: updatedObjects, modifiedAt: new Date() },
        })
      },

      flipObjects: (direction) => {
        const { project, selectedObjectIds } = get()
        if (!project || selectedObjectIds.length === 0) return

        const selected = project.objects.filter(obj => selectedObjectIds.includes(obj.id))
        
        const centerX = selected.reduce((sum, obj) => sum + obj.transform.x, 0) / selected.length
        const centerY = selected.reduce((sum, obj) => sum + obj.transform.y, 0) / selected.length

        const updatedObjects = project.objects.map(obj => {
          if (!selectedObjectIds.includes(obj.id)) return obj
          
          const newTransform = { ...obj.transform }
          if (direction === 'horizontal') {
            newTransform.x = 2 * centerX - obj.transform.x
            newTransform.scaleX *= -1
          } else {
            newTransform.y = 2 * centerY - obj.transform.y
            newTransform.scaleY *= -1
          }
          
          return { ...obj, transform: newTransform } as DesignObject
        })

        set({
          project: { ...project, objects: updatedObjects, modifiedAt: new Date() },
        })
      },

      rotateObjects: (angle) => {
        const { project, selectedObjectIds } = get()
        if (!project || selectedObjectIds.length === 0) return

        const updatedObjects = project.objects.map(obj => {
          if (!selectedObjectIds.includes(obj.id)) return obj
          
          return {
            ...obj,
            transform: {
              ...obj.transform,
              rotation: (obj.transform.rotation + angle) % 360,
            },
          } as DesignObject
        })

        set({
          project: { ...project, objects: updatedObjects, modifiedAt: new Date() },
        })
      },

      scaleObjects: (scaleX, scaleY) => {
        const { project, selectedObjectIds } = get()
        if (!project || selectedObjectIds.length === 0) return

        const updatedObjects = project.objects.map(obj => {
          if (!selectedObjectIds.includes(obj.id)) return obj
          
          return {
            ...obj,
            transform: {
              ...obj.transform,
              scaleX: obj.transform.scaleX * scaleX,
              scaleY: obj.transform.scaleY * scaleY,
            },
          } as DesignObject
        })

        set({
          project: { ...project, objects: updatedObjects, modifiedAt: new Date() },
        })
      },

      updateCanvasSettings: (settings) => {
        const { project } = get()
        if (!project) return

        set({
          project: {
            ...project,
            canvas: { ...project.canvas, ...settings },
            modifiedAt: new Date(),
          },
        })
      },

      updateStock: (setupId, stock) => {
        const { project } = get()
        if (!project) return

        set({
          project: {
            ...project,
            setups: project.setups.map(setup =>
              setup.id === setupId
                ? { ...setup, stock: { ...setup.stock, ...stock } }
                : setup
            ),
            modifiedAt: new Date(),
          },
        })
      },

      updateWCS: (setupId, wcs) => {
        const { project } = get()
        if (!project) return

        set({
          project: {
            ...project,
            setups: project.setups.map(setup =>
              setup.id === setupId
                ? { ...setup, workCoordinateSystem: { ...setup.workCoordinateSystem, ...wcs } }
                : setup
            ),
            modifiedAt: new Date(),
          },
        })
      },
    }),
    {
      name: 'carv-project-store',
      partialize: (state) => ({
        machineConfig: state.machineConfig,
        tools: state.tools,
        materials: state.materials,
        snapSettings: state.snapSettings,
        viewSettings: state.viewSettings,
      }),
    }
  )
)
