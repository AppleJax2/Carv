import { useState, useRef, useEffect } from 'react'
import { useDesignStore, DesignTool } from '@/store/useDesignStore'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Hexagon,
  Minus,
  Pen,
  Type,
  Move3D,
  Ruler,
  ChevronDown,
  Move,
  Maximize2,
  Grid3X3,
  Merge,
  Minus as MinusIcon,
  Layers,
  FileUp,
  Box,
  Library,
  Sparkles,
  Wrench,
  Route,
  Play,
  FileDown,
  Settings2,
  Target,
  Crosshair,
  CircleDot,
  ArrowUpToLine,
  ArrowDownToLine,
  Group,
  Ungroup,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  GalleryHorizontal,
  GalleryVertical,
  Slice,
  PenTool,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Focus,
  Eye,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip'

// ============================================================================
// Types
// ============================================================================

export type WorkspaceMode = 'design' | 'manufacture'

interface ToolbarItem {
  id: string
  label: string
  icon: React.ReactNode
  shortcut?: string
  action?: () => void
  disabled?: boolean
  tool?: DesignTool
}

interface ToolbarCategory {
  id: string
  label: string
  icon: React.ReactNode
  items: ToolbarItem[]
}

// ============================================================================
// Toolbar Dropdown Component
// ============================================================================

function ToolbarDropdown({ 
  category, 
  isOpen, 
  onToggle,
  onClose,
  activeTool,
  onSelectTool,
}: { 
  category: ToolbarCategory
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  activeTool: DesignTool
  onSelectTool: (tool: DesignTool) => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  const handleItemClick = (item: ToolbarItem) => {
    if (item.tool) {
      onSelectTool(item.tool)
    } else if (item.action) {
      item.action()
    }
    onClose()
  }

  // Find if any tool in this category is active
  const hasActiveTool = category.items.some(item => item.tool === activeTool)

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1 px-2 py-1.5 rounded-md text-sm font-medium transition-colors",
          "hover:bg-accent",
          isOpen && "bg-accent",
          hasActiveTool && "text-primary"
        )}
      >
        <span className="flex items-center gap-1.5">
          {category.icon}
          <span className="hidden lg:inline">{category.label}</span>
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-[200px] py-1 bg-popover border border-border rounded-lg shadow-xl">
          {category.items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              className={cn(
                "w-full px-3 py-2 flex items-center gap-3 text-left text-sm transition-colors",
                "hover:bg-accent",
                item.disabled && "opacity-40 cursor-not-allowed",
                item.tool === activeTool && "bg-primary/10 text-primary"
              )}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-xs text-muted-foreground">{item.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Quick Action Button
// ============================================================================

function QuickActionButton({ 
  item, 
  isActive = false,
  size = 'default'
}: { 
  item: ToolbarItem
  isActive?: boolean
  size?: 'default' | 'sm'
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={item.action}
          disabled={item.disabled}
          className={cn(
            "flex items-center justify-center rounded-md transition-colors",
            size === 'sm' ? "w-7 h-7" : "w-8 h-8",
            "hover:bg-accent",
            isActive && "bg-primary text-primary-foreground",
            item.disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {item.icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {item.label}
        {item.shortcut && <span className="ml-1 text-muted-foreground">({item.shortcut})</span>}
      </TooltipContent>
    </Tooltip>
  )
}

// ============================================================================
// Design Mode Toolbar
// ============================================================================

interface DesignToolbarProps {
  onShowImport: () => void
  onShowImport3D: () => void
  onShowDesignLibrary: () => void
  onShowAppLibrary: () => void
  onShowPreview: () => void
}

export function DesignModeToolbar({
  onShowImport,
  onShowImport3D,
  onShowDesignLibrary,
  onShowAppLibrary,
  onShowPreview,
}: DesignToolbarProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  
  const {
    activeTool,
    setActiveTool,
    selectedObjectIds,
    undo,
    redo,
    zoomIn,
    zoomOut,
    zoomToFit,
    history,
    historyIndex,
    alignObjects,
    distributeObjects,
    bringToFront,
    sendToBack,
    groupSelected,
    ungroupSelected,
    booleanOperation,
  } = useDesignStore()

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1
  const hasSelection = selectedObjectIds.length > 0
  const hasMultipleSelection = selectedObjectIds.length > 1

  // SKETCH category - 2D drawing tools
  const sketchCategory: ToolbarCategory = {
    id: 'sketch',
    label: 'Sketch',
    icon: <PenTool className="w-4 h-4" />,
    items: [
      { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" />, shortcut: 'R', tool: 'rectangle' },
      { id: 'ellipse', label: 'Ellipse', icon: <Circle className="w-4 h-4" />, shortcut: 'E', tool: 'ellipse' },
      { id: 'polygon', label: 'Polygon', icon: <Hexagon className="w-4 h-4" />, shortcut: 'P', tool: 'polygon' },
      { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" />, shortcut: 'L', tool: 'line' },
      { id: 'pen', label: 'Pen / Bezier', icon: <Pen className="w-4 h-4" />, shortcut: 'N', tool: 'pen' },
      { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, shortcut: 'T', tool: 'text' },
    ],
  }

  // MODIFY category - transform and edit tools
  const modifyCategory: ToolbarCategory = {
    id: 'modify',
    label: 'Modify',
    icon: <Move className="w-4 h-4" />,
    items: [
      { id: 'node-edit', label: 'Edit Nodes', icon: <Move3D className="w-4 h-4" />, shortcut: 'A', tool: 'node-edit' },
      { id: 'align-left', label: 'Align Left', icon: <AlignLeft className="w-4 h-4" />, action: () => alignObjects('left'), disabled: !hasMultipleSelection },
      { id: 'align-center', label: 'Align Center', icon: <AlignCenter className="w-4 h-4" />, action: () => alignObjects('center'), disabled: !hasMultipleSelection },
      { id: 'align-right', label: 'Align Right', icon: <AlignRight className="w-4 h-4" />, action: () => alignObjects('right'), disabled: !hasMultipleSelection },
      { id: 'align-top', label: 'Align Top', icon: <AlignStartVertical className="w-4 h-4" />, action: () => alignObjects('top'), disabled: !hasMultipleSelection },
      { id: 'align-middle', label: 'Align Middle', icon: <AlignCenterVertical className="w-4 h-4" />, action: () => alignObjects('middle'), disabled: !hasMultipleSelection },
      { id: 'align-bottom', label: 'Align Bottom', icon: <AlignEndVertical className="w-4 h-4" />, action: () => alignObjects('bottom'), disabled: !hasMultipleSelection },
      { id: 'distribute-h', label: 'Distribute Horizontal', icon: <GalleryHorizontal className="w-4 h-4" />, action: () => distributeObjects('horizontal'), disabled: !hasMultipleSelection },
      { id: 'distribute-v', label: 'Distribute Vertical', icon: <GalleryVertical className="w-4 h-4" />, action: () => distributeObjects('vertical'), disabled: !hasMultipleSelection },
      { id: 'group', label: 'Group', icon: <Group className="w-4 h-4" />, shortcut: 'Ctrl+G', action: groupSelected, disabled: !hasMultipleSelection },
      { id: 'ungroup', label: 'Ungroup', icon: <Ungroup className="w-4 h-4" />, shortcut: 'Ctrl+Shift+G', action: ungroupSelected, disabled: !hasSelection },
      { id: 'bring-front', label: 'Bring to Front', icon: <ArrowUpToLine className="w-4 h-4" />, action: bringToFront, disabled: !hasSelection },
      { id: 'send-back', label: 'Send to Back', icon: <ArrowDownToLine className="w-4 h-4" />, action: sendToBack, disabled: !hasSelection },
    ],
  }

  // BOOLEAN category - combine shapes
  const booleanCategory: ToolbarCategory = {
    id: 'boolean',
    label: 'Combine',
    icon: <Merge className="w-4 h-4" />,
    items: [
      { id: 'union', label: 'Union (Add)', icon: <Merge className="w-4 h-4" />, action: () => booleanOperation('union'), disabled: !hasMultipleSelection },
      { id: 'subtract', label: 'Subtract (Cut)', icon: <MinusIcon className="w-4 h-4" />, action: () => booleanOperation('subtract'), disabled: !hasMultipleSelection },
      { id: 'intersect', label: 'Intersect', icon: <Layers className="w-4 h-4" />, action: () => booleanOperation('intersect'), disabled: !hasMultipleSelection },
    ],
  }

  // INSERT category - import and library
  const insertCategory: ToolbarCategory = {
    id: 'insert',
    label: 'Insert',
    icon: <FileUp className="w-4 h-4" />,
    items: [
      { id: 'import-svg', label: 'Import SVG/DXF', icon: <FileUp className="w-4 h-4" />, action: onShowImport },
      { id: 'import-3d', label: 'Import 3D Model', icon: <Box className="w-4 h-4" />, action: onShowImport3D },
      { id: 'design-library', label: 'Design Library', icon: <Library className="w-4 h-4" />, action: onShowDesignLibrary },
    ],
  }

  // INSPECT category - measurement tools
  const inspectCategory: ToolbarCategory = {
    id: 'inspect',
    label: 'Inspect',
    icon: <Ruler className="w-4 h-4" />,
    items: [
      { id: 'measure', label: 'Measure', icon: <Ruler className="w-4 h-4" />, shortcut: 'M', tool: 'measure' },
    ],
  }

  // APPS category - generators
  const appsCategory: ToolbarCategory = {
    id: 'apps',
    label: 'Apps',
    icon: <Sparkles className="w-4 h-4" />,
    items: [
      { id: 'app-library', label: 'Open App Library...', icon: <Grid3X3 className="w-4 h-4" />, action: onShowAppLibrary },
    ],
  }

  const categories = [sketchCategory, modifyCategory, booleanCategory, insertCategory, inspectCategory, appsCategory]

  // Quick action items
  const quickActions: ToolbarItem[] = [
    { id: 'select', label: 'Select', icon: <MousePointer2 className="w-4 h-4" />, shortcut: 'V', tool: 'select' },
    { id: 'pan', label: 'Pan', icon: <Hand className="w-4 h-4" />, shortcut: 'H', tool: 'pan' },
  ]

  const historyActions: ToolbarItem[] = [
    { id: 'undo', label: 'Undo', icon: <Undo2 className="w-4 h-4" />, shortcut: 'Ctrl+Z', action: undo, disabled: !canUndo },
    { id: 'redo', label: 'Redo', icon: <Redo2 className="w-4 h-4" />, shortcut: 'Ctrl+Y', action: redo, disabled: !canRedo },
  ]

  const viewActions: ToolbarItem[] = [
    { id: 'zoom-in', label: 'Zoom In', icon: <ZoomIn className="w-4 h-4" />, shortcut: '+', action: zoomIn },
    { id: 'zoom-out', label: 'Zoom Out', icon: <ZoomOut className="w-4 h-4" />, shortcut: '-', action: zoomOut },
    { id: 'zoom-fit', label: 'Fit to View', icon: <Focus className="w-4 h-4" />, shortcut: '0', action: zoomToFit },
  ]

  return (
    <div className="flex items-center gap-1 px-2">
      {/* Quick Selection Tools */}
      <div className="flex items-center gap-0.5 pr-2 border-r border-border">
        {quickActions.map(item => (
          <QuickActionButton 
            key={item.id} 
            item={{ ...item, action: () => item.tool && setActiveTool(item.tool) }}
            isActive={item.tool === activeTool}
          />
        ))}
      </div>

      {/* Category Dropdowns */}
      <div className="flex items-center gap-0.5">
        {categories.map(category => (
          <ToolbarDropdown
            key={category.id}
            category={category}
            isOpen={openCategory === category.id}
            onToggle={() => setOpenCategory(openCategory === category.id ? null : category.id)}
            onClose={() => setOpenCategory(null)}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-2" />

      {/* History Actions */}
      <div className="flex items-center gap-0.5">
        {historyActions.map(item => (
          <QuickActionButton key={item.id} item={item} />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-2" />

      {/* View Actions */}
      <div className="flex items-center gap-0.5">
        {viewActions.map(item => (
          <QuickActionButton key={item.id} item={item} />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-2" />

      {/* Preview Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onShowPreview}
        className="h-8"
      >
        <Eye className="w-4 h-4 mr-1" />
        Preview
      </Button>
    </div>
  )
}

// ============================================================================
// Manufacture Mode Toolbar
// ============================================================================

interface ManufactureToolbarProps {
  onShowToolLibrary: () => void
  onShowSetup: () => void
  onShowSimulation: () => void
  onShowExport: () => void
  onShowProbe: () => void
}

export function ManufactureModeToolbar({
  onShowToolLibrary,
  onShowSetup,
  onShowSimulation,
  onShowExport,
  onShowProbe,
}: ManufactureToolbarProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  
  const {
    setShowToolpathPanel,
    showToolpathPanel,
  } = useDesignStore()

  // SETUP category
  const setupCategory: ToolbarCategory = {
    id: 'setup',
    label: 'Setup',
    icon: <Settings2 className="w-4 h-4" />,
    items: [
      { id: 'new-setup', label: 'New Setup', icon: <Settings2 className="w-4 h-4" />, action: onShowSetup },
      { id: 'stock', label: 'Define Stock', icon: <Box className="w-4 h-4" />, action: onShowSetup },
      { id: 'wcs', label: 'Work Coordinate System', icon: <Crosshair className="w-4 h-4" />, action: onShowSetup },
    ],
  }

  // 2D TOOLPATHS category
  const toolpaths2DCategory: ToolbarCategory = {
    id: '2d',
    label: '2D',
    icon: <Route className="w-4 h-4" />,
    items: [
      { id: '2d-profile', label: '2D Profile', icon: <Square className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
      { id: '2d-pocket', label: '2D Pocket', icon: <Layers className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
      { id: '2d-contour', label: '2D Contour', icon: <CircleDot className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
      { id: 'facing', label: 'Face', icon: <Maximize2 className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
      { id: 'drill', label: 'Drill', icon: <Target className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
      { id: 'engrave', label: 'Engrave', icon: <Pen className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
      { id: 'vcarve', label: 'V-Carve', icon: <Slice className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
    ],
  }

  // 3D TOOLPATHS category
  const toolpaths3DCategory: ToolbarCategory = {
    id: '3d',
    label: '3D',
    icon: <Box className="w-4 h-4" />,
    items: [
      { id: '3d-rough', label: '3D Roughing', icon: <Layers className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
      { id: '3d-finish', label: '3D Finishing', icon: <Sparkles className="w-4 h-4" />, action: () => setShowToolpathPanel(true) },
    ],
  }

  // TOOLS category
  const toolsCategory: ToolbarCategory = {
    id: 'tools',
    label: 'Tools',
    icon: <Wrench className="w-4 h-4" />,
    items: [
      { id: 'tool-library', label: 'Tool Library', icon: <Wrench className="w-4 h-4" />, action: onShowToolLibrary },
      { id: 'probe', label: 'Probe Wizard', icon: <Target className="w-4 h-4" />, action: onShowProbe },
    ],
  }

  // ACTIONS category
  const actionsCategory: ToolbarCategory = {
    id: 'actions',
    label: 'Actions',
    icon: <Play className="w-4 h-4" />,
    items: [
      { id: 'simulate', label: 'Simulate', icon: <Play className="w-4 h-4" />, action: onShowSimulation },
      { id: 'post-process', label: 'Post Process (Export)', icon: <FileDown className="w-4 h-4" />, action: onShowExport },
    ],
  }

  const categories = [setupCategory, toolpaths2DCategory, toolpaths3DCategory, toolsCategory, actionsCategory]

  return (
    <div className="flex items-center gap-1 px-2">
      {/* Category Dropdowns */}
      <div className="flex items-center gap-0.5">
        {categories.map(category => (
          <ToolbarDropdown
            key={category.id}
            category={category}
            isOpen={openCategory === category.id}
            onToggle={() => setOpenCategory(openCategory === category.id ? null : category.id)}
            onClose={() => setOpenCategory(null)}
            activeTool={'select'}
            onSelectTool={() => {}}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border mx-2" />

      {/* Quick Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant={showToolpathPanel ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setShowToolpathPanel(!showToolpathPanel)}
          className="h-8"
        >
          <Route className="w-4 h-4 mr-1" />
          Toolpaths
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowSimulation}
          className="h-8"
        >
          <Play className="w-4 h-4 mr-1" />
          Simulate
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onShowExport}
          className="h-8"
        >
          <FileDown className="w-4 h-4 mr-1" />
          Export G-code
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Mode Switcher Component
// ============================================================================

interface ModeSwitcherProps {
  mode: WorkspaceMode
  onModeChange: (mode: WorkspaceMode) => void
}

export function ModeSwitcher({ mode, onModeChange }: ModeSwitcherProps) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-0.5">
      <button
        onClick={() => onModeChange('design')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
          mode === 'design' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-1.5">
          <PenTool className="w-4 h-4" />
          Design
        </span>
      </button>
      <button
        onClick={() => onModeChange('manufacture')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
          mode === 'manufacture' 
            ? "bg-background text-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-1.5">
          <Wrench className="w-4 h-4" />
          Manufacture
        </span>
      </button>
    </div>
  )
}

export default { DesignModeToolbar, ManufactureModeToolbar, ModeSwitcher }
