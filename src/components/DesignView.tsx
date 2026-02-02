import { useEffect, useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { useMachineStore } from '@/store/useMachineStore'
import { DesignCanvas } from './DesignCanvas'
import { DesignToolbar } from './DesignToolbar'
import { LayersPanel } from './LayersPanel'
import { MachineSetup } from './MachineSetup'
import { PropertiesPanel } from './PropertiesPanel'
import { ToolpathPanel } from './ToolpathPanel'
import { ImportDialog } from './ImportDialog'
import { ToolLibrary } from './ToolLibrary'
import { ExportDialog } from './ExportDialog'
import { SimulationView } from './SimulationView'
import { BooleanToolbar } from './BooleanToolbar'
import { STLImportDialog } from './STLImportDialog'
import { DesignLibrary } from './DesignLibrary'
import { AppLibrary } from './AppLibrary'
import { Workspace3D } from './Workspace3D'
import { NewProjectDialog } from './NewProjectDialog'
import { AutoSaveIndicator } from './AutoSaveIndicator'
import { ResizableHandle } from './ui/resizable-panel'
import {
  BoxMaker,
  PuzzleDesigner,
  InlayGenerator,
  SignMaker,
  ImageTracer,
  NestingOptimizer,
  FeedsCalculator,
  CabinetDesigner,
  LivingHinge,
  GearGenerator,
  DovetailGenerator,
  VoronoiGenerator,
  CelticKnotGenerator,
  HalftoneGenerator,
} from './apps'
import { Button } from './ui/button'
import { CarvLogoInline } from './CarvLogo'
import { ThemeSwitcher } from './ThemeSwitcher'
import { 
  Settings2, 
  Wrench, 
  FolderOpen, 
  Save, 
  FileDown,
  FileUp,
  Plus,
  Route,
  Play,
  Package,
  Box,
  Library,
  Puzzle,
  Layers,
  Box as Box3D
} from 'lucide-react'
import { DEFAULT_TOOLS, DEFAULT_MATERIALS } from '@/types/machine'
import { saveProjectToFile, loadProjectFromFile } from '@/lib/projectManager'
import type { MachineConfig } from '@/types/machine'

interface DesignViewProps {
  onSwitchToControl: () => void
}

export function DesignView({ onSwitchToControl }: DesignViewProps) {
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showToolLibrary, setShowToolLibrary] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showSimulation, setShowSimulation] = useState(false)
  const [showSTLImport, setShowSTLImport] = useState(false)
  const [showDesignLibrary, setShowDesignLibrary] = useState(false)
  const [showAppLibrary, setShowAppLibrary] = useState(false)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d')
  const [activeApp, setActiveApp] = useState<string | null>(null)
  const [rightPanelWidth, setRightPanelWidth] = useState(256)
  const [toolpathPanelWidth, setToolpathPanelWidth] = useState(320)
  
  const {
    project,
    showMachineSetup,
    setShowMachineSetup,
    showToolpathPanel,
    setShowToolpathPanel,
    setMachineConfig,
    machineConfig,
    setTools,
    setMaterials,
  } = useDesignStore()

  const { addMachine } = useMachineStore()

  useEffect(() => {
    setTools(DEFAULT_TOOLS)
    setMaterials(DEFAULT_MATERIALS)
  }, [setTools, setMaterials])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const { setActiveTool, undo, redo, copy, paste, deleteObjects, selectedObjectIds, selectAll } = useDesignStore.getState()

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) redo()
            else undo()
            break
          case 'y':
            e.preventDefault()
            redo()
            break
          case 'c':
            e.preventDefault()
            copy()
            break
          case 'v':
            e.preventDefault()
            paste()
            break
          case 'a':
            e.preventDefault()
            selectAll()
            break
          case 'n':
            e.preventDefault()
            setShowNewProjectDialog(true)
            break
          case 's':
            e.preventDefault()
            if (e.shiftKey) {
              setShowSimulation(true)
            } else {
              handleSaveProject()
            }
            break
          case 'e':
            e.preventDefault()
            setShowExportDialog(true)
            break
          case 'o':
            e.preventDefault()
            handleOpenProject()
            break
        }
        return
      }

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select')
          break
        case 'h':
          setActiveTool('pan')
          break
        case 'r':
          setActiveTool('rectangle')
          break
        case 'e':
          setActiveTool('ellipse')
          break
        case 'p':
          setActiveTool('polygon')
          break
        case 'l':
          setActiveTool('line')
          break
        case 'n':
          setActiveTool('pen')
          break
        case 't':
          setActiveTool('text')
          break
        case 'a':
          setActiveTool('node-edit')
          break
        case 'm':
          setActiveTool('measure')
          break
        case 'delete':
        case 'backspace':
          if (selectedObjectIds.length > 0) {
            deleteObjects(selectedObjectIds)
          }
          break
        case 'escape':
          useDesignStore.getState().deselectAll()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSaveMachineConfig = (config: MachineConfig) => {
    // Save to design store for current session
    setMachineConfig(config)
    setShowMachineSetup(false)
    
    // Save to machine store for persistence across sessions
    addMachine(config.name || 'My CNC Machine', config)
    
    if (project) {
      useDesignStore.getState().setProject({
        ...project,
        canvas: {
          ...project.canvas,
          width: config.workspace.width,
          height: config.workspace.depth,
        },
      })
    }
  }

  const handleSaveProject = async () => {
    if (!project) return
    const { tools, materials } = useDesignStore.getState()
    await saveProjectToFile(project, machineConfig, tools, materials)
  }

  const handleOpenProject = async () => {
    const result = await loadProjectFromFile()
    if (result) {
      useDesignStore.getState().setProject(result.project)
      if (result.machineConfig) {
        setMachineConfig(result.machineConfig)
      }
      if (result.tools.length > 0) {
        setTools(result.tools)
      }
      if (result.materials.length > 0) {
        setMaterials(result.materials)
      }
    }
  }

  return (
    <div className="h-full flex flex-col noise-overlay">
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <CarvLogoInline />
          <div className="h-6 w-px bg-border/50" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShowNewProjectDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
            <Button variant="ghost" size="sm" onClick={handleOpenProject}>
              <FolderOpen className="w-4 h-4 mr-1" />
              Open
            </Button>
            <Button variant="ghost" size="sm" disabled={!project} onClick={handleSaveProject}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm" disabled={!project} onClick={() => setShowExportDialog(true)}>
              <FileDown className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowImportDialog(true)} disabled={!project}>
              <FileUp className="w-4 h-4 mr-1" />
              Import
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSTLImport(true)} disabled={!project}>
              <Box className="w-4 h-4 mr-1" />
              3D
            </Button>
            <div className="h-4 w-px bg-border mx-1" />
            <Button variant="ghost" size="sm" onClick={() => setShowDesignLibrary(true)}>
              <Library className="w-4 h-4 mr-1" />
              Designs
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAppLibrary(true)}>
              <Puzzle className="w-4 h-4 mr-1" />
              Apps
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project && (
            <>
              <div className="flex rounded-md border border-border overflow-hidden">
                <Button
                  variant={viewMode === '2d' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none border-0"
                  onClick={() => setViewMode('2d')}
                >
                  <Layers className="w-4 h-4 mr-1" />
                  2D
                </Button>
                <Button
                  variant={viewMode === '3d' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none border-0"
                  onClick={() => setViewMode('3d')}
                >
                  <Box3D className="w-4 h-4 mr-1" />
                  3D
                </Button>
              </div>
              <span className="text-sm text-muted-foreground">
                {project.name} — {project.canvas.width} × {project.canvas.height} mm
              </span>
              <AutoSaveIndicator />
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowToolLibrary(true)}
          >
            <Package className="w-4 h-4 mr-1" />
            Tools
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowToolpathPanel(!showToolpathPanel)}
          >
            <Route className="w-4 h-4 mr-1" />
            Toolpaths
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            disabled={!project || project.toolpaths.length === 0}
            onClick={() => setShowSimulation(true)}
          >
            <Play className="w-4 h-4 mr-1" />
            Simulate
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMachineSetup(true)}
          >
            <Settings2 className="w-4 h-4 mr-1" />
            Machine Setup
          </Button>
          <ThemeSwitcher variant="dropdown" />
          <Button 
            variant="default" 
            size="sm"
            onClick={onSwitchToControl}
          >
            <Wrench className="w-4 h-4 mr-1" />
            Control
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <DesignToolbar />
        
        <div className="flex-1 flex">
          {project ? (
            <div className="flex-1 relative">
              {viewMode === '2d' ? (
                <>
                  <DesignCanvas className="w-full h-full" />
                  <BooleanToolbar />
                </>
              ) : (
                <Workspace3D className="w-full h-full" />
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-background">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-semibold">Welcome to Carv</h2>
                <p className="text-muted-foreground max-w-md">
                  Create a new project to start designing, or open an existing project.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setShowNewProjectDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                  <Button variant="outline" onClick={handleOpenProject}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Open Project
                  </Button>
                </div>
                {!machineConfig && (
                  <p className="text-sm text-muted-foreground mt-4">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto"
                      onClick={() => setShowMachineSetup(true)}
                    >
                      Set up your machine
                    </Button>
                    {' '}to configure workspace dimensions.
                  </p>
                )}
              </div>
            </div>
          )}
          
          {showToolpathPanel && project && (
            <>
              <ResizableHandle 
                side="right" 
                onResize={(delta) => setToolpathPanelWidth(w => Math.max(240, Math.min(480, w + delta)))} 
              />
              <div className="border-l border-border flex flex-col" style={{ width: toolpathPanelWidth }}>
                <ToolpathPanel />
              </div>
            </>
          )}
        </div>

        <ResizableHandle 
          side="right" 
          onResize={(delta) => setRightPanelWidth(w => Math.max(200, Math.min(400, w + delta)))} 
        />
        <div className="border-l border-border flex flex-col" style={{ width: rightPanelWidth }}>
          <div className="flex-1 overflow-hidden">
            <LayersPanel />
          </div>
          <div className="h-64 border-t border-border">
            <PropertiesPanel />
          </div>
        </div>
      </div>

      {showMachineSetup && (
        <MachineSetup
          config={machineConfig}
          onSave={handleSaveMachineConfig}
          onClose={() => setShowMachineSetup(false)}
        />
      )}

      {showImportDialog && (
        <ImportDialog onClose={() => setShowImportDialog(false)} />
      )}

      {showToolLibrary && (
        <ToolLibrary onClose={() => setShowToolLibrary(false)} />
      )}

      {showExportDialog && (
        <ExportDialog onClose={() => setShowExportDialog(false)} />
      )}

      {showSimulation && (
        <SimulationView onClose={() => setShowSimulation(false)} />
      )}

      {showSTLImport && (
        <STLImportDialog onClose={() => setShowSTLImport(false)} />
      )}

      {showDesignLibrary && (
        <DesignLibrary onClose={() => setShowDesignLibrary(false)} />
      )}

      {showAppLibrary && (
        <AppLibrary 
          onClose={() => setShowAppLibrary(false)} 
          onLaunchApp={(app) => {
            setShowAppLibrary(false)
            setActiveApp(app.id)
          }}
        />
      )}

      {showNewProjectDialog && (
        <NewProjectDialog onClose={() => setShowNewProjectDialog(false)} />
      )}

      {activeApp === 'box-maker' && (
        <BoxMaker onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'puzzle-designer' && (
        <PuzzleDesigner onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'inlay-generator' && (
        <InlayGenerator onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'sign-maker' && (
        <SignMaker onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'image-tracer' && (
        <ImageTracer onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'nesting-optimizer' && (
        <NestingOptimizer onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'feeds-calculator' && (
        <FeedsCalculator onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'cabinet-designer' && (
        <CabinetDesigner onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'living-hinge' && (
        <LivingHinge onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'gear-generator' && (
        <GearGenerator onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'dovetail-generator' && (
        <DovetailGenerator onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'voronoi-generator' && (
        <VoronoiGenerator onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'celtic-knot-generator' && (
        <CelticKnotGenerator onClose={() => setActiveApp(null)} />
      )}

      {activeApp === 'halftone-generator' && (
        <HalftoneGenerator onClose={() => setActiveApp(null)} />
      )}
    </div>
  )
}
