import { useEffect, useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { useMachineStore } from '@/store/useMachineStore'
import { DesignCanvas } from './DesignCanvas'
import { DesignToolbar } from './DesignToolbar'
import { RightSidebar } from './RightSidebar'
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
import { CarveSettingsPanel } from './CarveSettingsPanel'
import { BitEditor } from './BitEditor'
import { CarvePreview } from './CarvePreview'
import { PreCarveWizard } from './PreCarveWizard'
import { ProbeModule } from './ProbeModule'
import { MenuBar } from './MenuBar'
import { DesignModeToolbar, ManufactureModeToolbar, ModeSwitcher, WorkspaceMode } from './CADToolbar'
import { MaterialPreviewModal } from './MaterialPreviewModal'
import { QuickSetupWizard } from './QuickSetupWizard'
import { MachineSetup } from './MachineSetup'
import type { Tool } from '@/types/machine'
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
import { formatDimension } from '@/lib/utils'
import { Button } from './ui/button'
import { CarvLogoInline } from './CarvLogo'
import { ThemeSwitcher } from './ThemeSwitcher'
import { 
  Wrench, 
  Plus,
  Layers,
  Box as Box3D,
  FolderOpen,
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
  const [showCarveSettings, setShowCarveSettings] = useState(false)
  const [showBitEditor, setShowBitEditor] = useState(false)
  const [editingBit, setEditingBit] = useState<Tool | null>(null)
  const [showCarvePreview, setShowCarvePreview] = useState(false)
  const [showPreCarveWizard, setShowPreCarveWizard] = useState(false)
  const [showQuickSetup, setShowQuickSetup] = useState(false)
  const [showProbeModule, setShowProbeModule] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('design')
  const [showMaterialPreview, setShowMaterialPreview] = useState(false)
  const [carveSettings, setCarveSettings] = useState({
    materialWidth: 300,
    materialHeight: 300,
    materialThickness: 18,
    materialColor: '#8B4513',
    useTwoBits: false,
    roughingBitId: null as string | null,
    finishingBitId: null as string | null,
  })
  
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
      {/* Menu Bar */}
      <MenuBar
        onNewProject={() => setShowNewProjectDialog(true)}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onExportGcode={() => setShowExportDialog(true)}
        onImportFile={() => setShowImportDialog(true)}
        onImport3D={() => setShowSTLImport(true)}
        onShowToolLibrary={() => setShowToolLibrary(true)}
        onShowMachineSetup={() => setShowMachineSetup(true)}
        onShowToolpaths={() => setShowToolpathPanel(!showToolpathPanel)}
        onShowSimulation={() => setShowSimulation(true)}
        onShowDesignLibrary={() => setShowDesignLibrary(true)}
        onShowAppLibrary={() => setShowAppLibrary(true)}
        onSwitchToControl={onSwitchToControl}
        onShowProbe={() => setShowProbeModule(true)}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        showToolpathPanel={showToolpathPanel}
      />

      {/* CAD Toolbar - Fusion 360 Style */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm">
        {/* Top row: Logo, Mode Switcher, Project Info, Actions */}
        <div className="h-10 px-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CarvLogoInline />
            <div className="h-5 w-px bg-border/50" />
            <ModeSwitcher mode={workspaceMode} onModeChange={setWorkspaceMode} />
          </div>

          <div className="flex items-center gap-2">
            {project && (
              <>
                <div className="flex rounded-md border border-border overflow-hidden">
                  <Button
                    variant={viewMode === '2d' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-0 h-7 px-2"
                    onClick={() => setViewMode('2d')}
                  >
                    <Layers className="w-3.5 h-3.5 mr-1" />
                    2D
                  </Button>
                  <Button
                    variant={viewMode === '3d' ? 'default' : 'ghost'}
                    size="sm"
                    className="rounded-none border-0 h-7 px-2"
                    onClick={() => setViewMode('3d')}
                  >
                    <Box3D className="w-3.5 h-3.5 mr-1" />
                    3D
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {project.name} — {formatDimension(project.canvas.width, project.canvas.unit, { showUnit: false })} × {formatDimension(project.canvas.height, project.canvas.unit)} 
                </span>
                <AutoSaveIndicator />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ThemeSwitcher variant="dropdown" />
            <Button 
              variant="default" 
              size="sm"
              className="h-7"
              onClick={onSwitchToControl}
            >
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Control
            </Button>
          </div>
        </div>

        {/* Bottom row: Mode-specific toolbar */}
        <div className="h-10 px-1 flex items-center border-t border-border/50 bg-muted/30">
          {workspaceMode === 'design' ? (
            <DesignModeToolbar
              onShowImport={() => setShowImportDialog(true)}
              onShowImport3D={() => setShowSTLImport(true)}
              onShowDesignLibrary={() => setShowDesignLibrary(true)}
              onShowAppLibrary={() => setShowAppLibrary(true)}
              onShowPreview={() => setShowMaterialPreview(true)}
            />
          ) : (
            <ManufactureModeToolbar
              onShowToolLibrary={() => setShowToolLibrary(true)}
              onShowSetup={() => setShowMachineSetup(true)}
              onShowSimulation={() => setShowSimulation(true)}
              onShowExport={() => setShowExportDialog(true)}
              onShowProbe={() => setShowProbeModule(true)}
            />
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <DesignToolbar />
        
        <div className="flex-1 flex">
          {project ? (
            <div className="flex-1 relative">
              {viewMode === '2d' ? (
                <>
                  <DesignCanvas 
                    className="w-full h-full" 
                    onRequestRotation={() => setViewMode('3d')}
                  />
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
                  <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md">
                    <p className="text-sm text-muted-foreground mb-3">
                      No machine configured yet. Set up your CNC to get started.
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={() => setShowQuickSetup(true)}
                      >
                        Quick Setup
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMachineSetup(true)}
                      >
                        Advanced Setup
                      </Button>
                    </div>
                  </div>
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
          onResize={(delta) => setRightPanelWidth(w => Math.max(240, Math.min(400, w + delta)))} 
        />
        <div className="border-l border-border" style={{ width: rightPanelWidth }}>
          <RightSidebar className="h-full" />
        </div>
      </div>

      {showMachineSetup && (
        <MachineSetup
          config={machineConfig}
          onSave={handleSaveMachineConfig}
          onClose={() => setShowMachineSetup(false)}
        />
      )}

      {showQuickSetup && (
        <QuickSetupWizard
          onClose={() => setShowQuickSetup(false)}
          onComplete={(config) => {
            setMachineConfig(config)
            setShowQuickSetup(false)
          }}
          onAdvancedSetup={() => {
            setShowQuickSetup(false)
            setShowMachineSetup(true)
          }}
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

      {/* Carve Settings Panel - slides in from right */}
      {showCarveSettings && project && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="flex-1 bg-black/50"
            onClick={() => setShowCarveSettings(false)}
          />
          <CarveSettingsPanel
            onPreviewCarve={() => {
              setShowCarveSettings(false)
              setShowCarvePreview(true)
            }}
            onStartCarve={() => {
              setShowCarveSettings(false)
              setShowPreCarveWizard(true)
            }}
            onEditBit={(tool) => {
              setEditingBit(tool)
              setShowBitEditor(true)
            }}
          />
        </div>
      )}

      {/* Bit Editor Modal */}
      {showBitEditor && (
        <BitEditor
          tool={editingBit}
          onClose={() => {
            setShowBitEditor(false)
            setEditingBit(null)
          }}
          onSave={(tool) => {
            const { tools, setTools } = useDesignStore.getState()
            const existingIndex = tools.findIndex(t => t.id === tool.id)
            if (existingIndex >= 0) {
              const newTools = [...tools]
              newTools[existingIndex] = tool
              setTools(newTools)
            } else {
              setTools([...tools, tool])
            }
            setShowBitEditor(false)
            setEditingBit(null)
          }}
          onDelete={(toolId) => {
            const { tools, setTools } = useDesignStore.getState()
            setTools(tools.filter(t => t.id !== toolId))
            setShowBitEditor(false)
            setEditingBit(null)
          }}
        />
      )}

      {/* Carve Preview */}
      {showCarvePreview && (
        <CarvePreview
          materialWidth={carveSettings.materialWidth}
          materialHeight={carveSettings.materialHeight}
          materialThickness={carveSettings.materialThickness}
          materialColor={carveSettings.materialColor}
          roughingBit={useDesignStore.getState().tools.find(t => t.id === carveSettings.roughingBitId) || useDesignStore.getState().tools[0] || null}
          finishingBit={useDesignStore.getState().tools.find(t => t.id === carveSettings.finishingBitId) || null}
          useTwoBits={carveSettings.useTwoBits}
          onClose={() => setShowCarvePreview(false)}
          onStartCarve={() => {
            setShowCarvePreview(false)
            setShowPreCarveWizard(true)
          }}
        />
      )}

      {/* Pre-Carve Wizard */}
      {showPreCarveWizard && (
        <PreCarveWizard
          roughingBit={useDesignStore.getState().tools.find(t => t.id === carveSettings.roughingBitId) || useDesignStore.getState().tools[0] || null}
          finishingBit={useDesignStore.getState().tools.find(t => t.id === carveSettings.finishingBitId) || null}
          useTwoBits={carveSettings.useTwoBits}
          estimatedTime={30}
          onClose={() => setShowPreCarveWizard(false)}
          onStartCarve={() => {
            setShowPreCarveWizard(false)
            setShowExportDialog(true)
          }}
        />
      )}

      {/* Probe Module Dialog */}
      {showProbeModule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-lg shadow-xl w-[480px] max-h-[90vh] overflow-hidden">
            <ProbeModule onClose={() => setShowProbeModule(false)} />
          </div>
        </div>
      )}

      {/* Material Preview Modal */}
      {showMaterialPreview && (
        <MaterialPreviewModal
          onClose={() => setShowMaterialPreview(false)}
          onProceedToManufacture={() => {
            setShowMaterialPreview(false)
            setWorkspaceMode('manufacture')
          }}
        />
      )}
    </div>
  )
}
