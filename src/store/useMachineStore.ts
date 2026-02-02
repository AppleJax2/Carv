import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { MachineConfig } from '@/types/machine'

export interface SavedMachine {
  id: string
  name: string
  config: MachineConfig
  createdAt: Date
  updatedAt: Date
}

export type DimensionSource = 'machine' | 'manual'

export interface NewProjectDefaults {
  dimensionSource: DimensionSource
  selectedMachineId: string | null
  manualWidth: number
  manualHeight: number
  unit: 'mm' | 'inch'
  defaultMaterialThickness: number
}

interface MachineState {
  // Saved machine profiles
  savedMachines: SavedMachine[]
  activeMachineId: string | null
  
  // New project defaults
  newProjectDefaults: NewProjectDefaults
  
  // Actions for machines
  addMachine: (name: string, config: MachineConfig) => SavedMachine
  updateMachine: (id: string, updates: Partial<Omit<SavedMachine, 'id' | 'createdAt'>>) => void
  deleteMachine: (id: string) => void
  setActiveMachine: (id: string | null) => void
  duplicateMachine: (id: string) => SavedMachine | null
  
  // Actions for new project defaults
  setDimensionSource: (source: DimensionSource) => void
  setSelectedMachineId: (id: string | null) => void
  setManualDimensions: (width: number, height: number) => void
  setDefaultUnit: (unit: 'mm' | 'inch') => void
  setDefaultMaterialThickness: (thickness: number) => void
  
  // Computed helpers
  getActiveMachine: () => SavedMachine | null
  getNewProjectDimensions: () => { width: number; height: number; unit: 'mm' | 'inch' }
}

const DEFAULT_NEW_PROJECT_DEFAULTS: NewProjectDefaults = {
  dimensionSource: 'manual',
  selectedMachineId: null,
  manualWidth: 300,
  manualHeight: 300,
  unit: 'mm',
  defaultMaterialThickness: 18,
}

export const useMachineStore = create<MachineState>()(
  persist(
    (set, get) => ({
      savedMachines: [],
      activeMachineId: null,
      newProjectDefaults: DEFAULT_NEW_PROJECT_DEFAULTS,

      addMachine: (name, config) => {
        const newMachine: SavedMachine = {
          id: crypto.randomUUID(),
          name,
          config: {
            ...config,
            id: crypto.randomUUID(),
            name,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        set(state => ({
          savedMachines: [...state.savedMachines, newMachine],
          activeMachineId: newMachine.id,
          newProjectDefaults: {
            ...state.newProjectDefaults,
            selectedMachineId: newMachine.id,
            dimensionSource: 'machine',
          },
        }))

        return newMachine
      },

      updateMachine: (id, updates) => {
        set(state => ({
          savedMachines: state.savedMachines.map(machine =>
            machine.id === id
              ? {
                  ...machine,
                  ...updates,
                  updatedAt: new Date(),
                  config: updates.config
                    ? { ...machine.config, ...updates.config }
                    : machine.config,
                }
              : machine
          ),
        }))
      },

      deleteMachine: (id) => {
        const { savedMachines, activeMachineId, newProjectDefaults } = get()
        const remaining = savedMachines.filter(m => m.id !== id)
        
        set({
          savedMachines: remaining,
          activeMachineId: activeMachineId === id 
            ? (remaining[0]?.id || null) 
            : activeMachineId,
          newProjectDefaults: newProjectDefaults.selectedMachineId === id
            ? {
                ...newProjectDefaults,
                selectedMachineId: remaining[0]?.id || null,
                dimensionSource: remaining.length > 0 ? 'machine' : 'manual',
              }
            : newProjectDefaults,
        })
      },

      setActiveMachine: (id) => set({ activeMachineId: id }),

      duplicateMachine: (id) => {
        const { savedMachines } = get()
        const original = savedMachines.find(m => m.id === id)
        if (!original) return null

        const duplicate: SavedMachine = {
          id: crypto.randomUUID(),
          name: `${original.name} (Copy)`,
          config: {
            ...JSON.parse(JSON.stringify(original.config)),
            id: crypto.randomUUID(),
            name: `${original.name} (Copy)`,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        set(state => ({
          savedMachines: [...state.savedMachines, duplicate],
        }))

        return duplicate
      },

      setDimensionSource: (source) => {
        set(state => ({
          newProjectDefaults: {
            ...state.newProjectDefaults,
            dimensionSource: source,
          },
        }))
      },

      setSelectedMachineId: (id) => {
        set(state => ({
          newProjectDefaults: {
            ...state.newProjectDefaults,
            selectedMachineId: id,
            dimensionSource: id ? 'machine' : 'manual',
          },
        }))
      },

      setManualDimensions: (width, height) => {
        set(state => ({
          newProjectDefaults: {
            ...state.newProjectDefaults,
            manualWidth: width,
            manualHeight: height,
          },
        }))
      },

      setDefaultUnit: (unit) => {
        set(state => ({
          newProjectDefaults: {
            ...state.newProjectDefaults,
            unit,
          },
        }))
      },

      setDefaultMaterialThickness: (thickness) => {
        set(state => ({
          newProjectDefaults: {
            ...state.newProjectDefaults,
            defaultMaterialThickness: thickness,
          },
        }))
      },

      getActiveMachine: () => {
        const { savedMachines, activeMachineId } = get()
        return savedMachines.find(m => m.id === activeMachineId) || null
      },

      getNewProjectDimensions: () => {
        const { savedMachines, newProjectDefaults } = get()
        const { dimensionSource, selectedMachineId, manualWidth, manualHeight, unit } = newProjectDefaults

        if (dimensionSource === 'machine' && selectedMachineId) {
          const machine = savedMachines.find(m => m.id === selectedMachineId)
          if (machine) {
            return {
              width: machine.config.workspace.width,
              height: machine.config.workspace.depth,
              unit: 'mm' as const,
            }
          }
        }

        return { width: manualWidth, height: manualHeight, unit }
      },
    }),
    {
      name: 'carv-machine-store',
      partialize: (state) => ({
        savedMachines: state.savedMachines,
        activeMachineId: state.activeMachineId,
        newProjectDefaults: state.newProjectDefaults,
      }),
    }
  )
)
