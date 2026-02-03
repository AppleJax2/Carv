import { useState, useRef, useEffect } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  FolderOpen,
  Save,
  FileDown,
  FileUp,
  Plus,
  Settings,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Clipboard,
  Trash2,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Layers,
  Route,
  Package,
  Box,
  HelpCircle,
  Info,
  Keyboard,
  ExternalLink,
  Bug,
  RefreshCw,
  ChevronRight,
  Check,
  Monitor,
  Target,
  Home,
  Crosshair,
  User,
  LogOut,
  Crown,
} from 'lucide-react'

interface MenuBarProps {
  onNewProject: () => void
  onOpenProject: () => void
  onSaveProject: () => void
  onExportGcode: () => void
  onImportFile: () => void
  onImport3D: () => void
  onShowToolLibrary: () => void
  onShowMachineSetup: () => void
  onShowToolpaths: () => void
  onShowSimulation: () => void
  onShowDesignLibrary: () => void
  onShowAppLibrary: () => void
  onSwitchToControl: () => void
  onShowProbe?: () => void
  viewMode: '2d' | '3d'
  onSetViewMode: (mode: '2d' | '3d') => void
  showToolpathPanel: boolean
  showGrid?: boolean
  onToggleGrid?: () => void
  showRulers?: boolean
  onToggleRulers?: () => void
  showSnap?: boolean
  onToggleSnap?: () => void
}

interface MenuItem {
  label: string
  shortcut?: string
  icon?: React.ReactNode
  action?: () => void
  disabled?: boolean
  checked?: boolean
  separator?: boolean
  submenu?: MenuItem[]
}

interface Menu {
  label: string
  items: MenuItem[]
}

export function MenuBar({
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportGcode,
  onImportFile,
  onImport3D,
  onShowToolLibrary,
  onShowMachineSetup,
  onShowToolpaths,
  onShowSimulation,
  onShowDesignLibrary,
  onShowAppLibrary,
  onSwitchToControl,
  onShowProbe,
  viewMode,
  onSetViewMode,
  showToolpathPanel,
  showGrid = true,
  onToggleGrid,
  showRulers = true,
  onToggleRulers,
  showSnap = true,
  onToggleSnap,
}: MenuBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  
  const { user, logout } = useAuth()
  
  const {
    project,
    selectedObjectIds,
    deleteObjects,
    duplicate,
    undo,
    redo,
    history,
    historyIndex,
    selectAll,
    deselectAll,
    setViewTransform,
    zoomIn: storeZoomIn,
    zoomOut: storeZoomOut,
  } = useDesignStore()
  
  // Computed values
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCut = () => {
    // TODO: Implement cut to clipboard
    if (selectedObjectIds.length > 0) {
      navigator.clipboard.writeText(JSON.stringify(selectedObjectIds))
      deleteObjects(selectedObjectIds)
    }
  }

  const handleCopy = () => {
    // TODO: Implement copy to clipboard
    if (selectedObjectIds.length > 0) {
      navigator.clipboard.writeText(JSON.stringify(selectedObjectIds))
    }
  }

  const handlePaste = async () => {
    // TODO: Implement paste from clipboard
    try {
      const text = await navigator.clipboard.readText()
      console.log('Paste:', text)
    } catch (err) {
      console.error('Failed to paste:', err)
    }
  }

  const handleSelectAll = () => {
    selectAll()
  }

  const handleDeselectAll = () => {
    deselectAll()
  }

  const handleDelete = () => {
    if (selectedObjectIds.length > 0) {
      deleteObjects(selectedObjectIds)
    }
  }

  const handleDuplicate = () => {
    if (selectedObjectIds.length > 0) {
      duplicate()
    }
  }

  const handleZoomIn = () => {
    storeZoomIn()
  }

  const handleZoomOut = () => {
    storeZoomOut()
  }

  const handleZoomFit = () => {
    // Reset to default zoom
    setViewTransform({ zoom: 1 })
  }

  const handleZoom100 = () => {
    setViewTransform({ zoom: 1 })
  }

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }

  const handleOpenDocs = () => {
    window.open('https://carv.ai/docs', '_blank')
  }

  const handleOpenGitHub = () => {
    window.open('https://github.com/carv-ai/carv', '_blank')
  }

  const handleReportBug = () => {
    window.open('https://github.com/carv-ai/carv/issues/new', '_blank')
  }

  const handleShowAbout = () => {
    // TODO: Show about dialog
    alert('Carv - CNC Design & Control Software\nVersion 1.0.0')
  }

  const handleShowShortcuts = () => {
    // TODO: Show keyboard shortcuts dialog
    alert(`Keyboard Shortcuts:
    
Ctrl+N - New Project
Ctrl+O - Open Project
Ctrl+S - Save Project
Ctrl+Shift+E - Export G-code
Ctrl+Z - Undo
Ctrl+Shift+Z - Redo
Ctrl+X - Cut
Ctrl+C - Copy
Ctrl+V - Paste
Ctrl+A - Select All
Delete - Delete Selected
Ctrl+D - Duplicate
Ctrl++ - Zoom In
Ctrl+- - Zoom Out
Ctrl+0 - Zoom 100%
F11 - Fullscreen`)
  }

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Project', shortcut: 'Ctrl+N', icon: <Plus className="w-4 h-4" />, action: onNewProject },
        { label: 'Open Project...', shortcut: 'Ctrl+O', icon: <FolderOpen className="w-4 h-4" />, action: onOpenProject },
        { separator: true, label: '' },
        { label: 'Save', shortcut: 'Ctrl+S', icon: <Save className="w-4 h-4" />, action: onSaveProject, disabled: !project },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', icon: <Save className="w-4 h-4" />, action: onSaveProject, disabled: !project },
        { separator: true, label: '' },
        { label: 'Import SVG/DXF...', icon: <FileUp className="w-4 h-4" />, action: onImportFile, disabled: !project },
        { label: 'Import 3D Model...', icon: <Box className="w-4 h-4" />, action: onImport3D, disabled: !project },
        { separator: true, label: '' },
        { label: 'Export G-code...', shortcut: 'Ctrl+Shift+E', icon: <FileDown className="w-4 h-4" />, action: onExportGcode, disabled: !project },
        { separator: true, label: '' },
        { label: 'Design Library', icon: <Layers className="w-4 h-4" />, action: onShowDesignLibrary },
        { label: 'App Library', icon: <Grid3X3 className="w-4 h-4" />, action: onShowAppLibrary },
        { separator: true, label: '' },
        { label: 'Settings...', icon: <Settings className="w-4 h-4" />, action: onShowMachineSetup },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', icon: <Undo2 className="w-4 h-4" />, action: undo, disabled: !canUndo },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', icon: <Redo2 className="w-4 h-4" />, action: redo, disabled: !canRedo },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', icon: <Scissors className="w-4 h-4" />, action: handleCut, disabled: selectedObjectIds.length === 0 },
        { label: 'Copy', shortcut: 'Ctrl+C', icon: <Copy className="w-4 h-4" />, action: handleCopy, disabled: selectedObjectIds.length === 0 },
        { label: 'Paste', shortcut: 'Ctrl+V', icon: <Clipboard className="w-4 h-4" />, action: handlePaste },
        { label: 'Duplicate', shortcut: 'Ctrl+D', icon: <Copy className="w-4 h-4" />, action: handleDuplicate, disabled: selectedObjectIds.length === 0 },
        { separator: true, label: '' },
        { label: 'Delete', shortcut: 'Del', icon: <Trash2 className="w-4 h-4" />, action: handleDelete, disabled: selectedObjectIds.length === 0 },
        { separator: true, label: '' },
        { label: 'Select All', shortcut: 'Ctrl+A', icon: <MousePointer2 className="w-4 h-4" />, action: handleSelectAll, disabled: !project },
        { label: 'Deselect All', shortcut: 'Esc', action: handleDeselectAll, disabled: selectedObjectIds.length === 0 },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl++', icon: <ZoomIn className="w-4 h-4" />, action: handleZoomIn },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', icon: <ZoomOut className="w-4 h-4" />, action: handleZoomOut },
        { label: 'Zoom to Fit', shortcut: 'Ctrl+1', icon: <Maximize2 className="w-4 h-4" />, action: handleZoomFit },
        { label: 'Zoom 100%', shortcut: 'Ctrl+0', action: handleZoom100 },
        { separator: true, label: '' },
        { label: '2D View', checked: viewMode === '2d', action: () => onSetViewMode('2d') },
        { label: '3D View', checked: viewMode === '3d', action: () => onSetViewMode('3d') },
        { separator: true, label: '' },
        { label: 'Show Grid', checked: showGrid, action: onToggleGrid },
        { label: 'Show Rulers', checked: showRulers, action: onToggleRulers },
        { label: 'Snap to Grid', checked: showSnap, action: onToggleSnap },
        { separator: true, label: '' },
        { label: 'Toolpath Panel', checked: showToolpathPanel, icon: <Route className="w-4 h-4" />, action: onShowToolpaths },
        { label: 'Tool Library', icon: <Package className="w-4 h-4" />, action: onShowToolLibrary },
        { separator: true, label: '' },
        { label: 'Fullscreen', shortcut: 'F11', icon: <Maximize2 className="w-4 h-4" />, action: handleFullscreen },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Tool Library...', icon: <Package className="w-4 h-4" />, action: onShowToolLibrary },
        { label: 'Machine Setup...', icon: <Settings className="w-4 h-4" />, action: onShowMachineSetup },
        { separator: true, label: '' },
        { label: 'Generate Toolpaths', icon: <Route className="w-4 h-4" />, action: onShowToolpaths, disabled: !project },
        { label: 'Simulate', icon: <RefreshCw className="w-4 h-4" />, action: onShowSimulation, disabled: !project },
        { separator: true, label: '' },
        { label: 'Switch to Control Mode', icon: <Monitor className="w-4 h-4" />, action: onSwitchToControl },
      ],
    },
    {
      label: 'Machine',
      items: [
        { label: 'Probe Wizard...', shortcut: 'Ctrl+P', icon: <Target className="w-4 h-4" />, action: onShowProbe },
        { separator: true, label: '' },
        { label: 'Home All Axes', icon: <Home className="w-4 h-4" />, action: () => window.electronAPI?.grbl.home() },
        { label: 'Set Zero Here', icon: <Crosshair className="w-4 h-4" />, action: () => window.electronAPI?.grbl.setZero('all') },
        { separator: true, label: '' },
        { label: 'Machine Setup...', icon: <Settings className="w-4 h-4" />, action: onShowMachineSetup },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Documentation', icon: <HelpCircle className="w-4 h-4" />, action: handleOpenDocs },
        { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+/', icon: <Keyboard className="w-4 h-4" />, action: handleShowShortcuts },
        { separator: true, label: '' },
        { label: 'GitHub Repository', icon: <ExternalLink className="w-4 h-4" />, action: handleOpenGitHub },
        { label: 'Report a Bug', icon: <Bug className="w-4 h-4" />, action: handleReportBug },
        { separator: true, label: '' },
        { label: 'About Carv', icon: <Info className="w-4 h-4" />, action: handleShowAbout },
      ],
    },
  ]

  const handleMenuClick = (menuLabel: string) => {
    setOpenMenu(openMenu === menuLabel ? null : menuLabel)
  }

  const handleMenuHover = (menuLabel: string) => {
    if (openMenu !== null) {
      setOpenMenu(menuLabel)
    }
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.action && !item.disabled) {
      item.action()
      setOpenMenu(null)
    }
  }

  return (
    <div ref={menuBarRef} className="flex items-center h-7 bg-card/60 border-b border-border/50 text-sm select-none">
      {menus.map((menu) => (
        <div key={menu.label} className="relative">
          <button
            className={cn(
              "px-3 h-7 text-sm font-medium transition-colors",
              "hover:bg-accent/80",
              openMenu === menu.label && "bg-accent"
            )}
            onClick={() => handleMenuClick(menu.label)}
            onMouseEnter={() => handleMenuHover(menu.label)}
          >
            {menu.label}
          </button>
          
          {openMenu === menu.label && (
            <div className="absolute top-full left-0 z-50 min-w-[220px] py-1 bg-popover border border-border rounded-md shadow-lg">
              {menu.items.map((item, index) => (
                item.separator ? (
                  <div key={index} className="h-px my-1 bg-border" />
                ) : (
                  <button
                    key={index}
                    className={cn(
                      "w-full px-3 py-1.5 flex items-center gap-3 text-left text-sm",
                      "hover:bg-accent transition-colors",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                  >
                    <span className="w-4 h-4 flex items-center justify-center">
                      {item.checked !== undefined ? (
                        item.checked ? <Check className="w-4 h-4" /> : null
                      ) : (
                        item.icon
                      )}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-muted-foreground ml-4">{item.shortcut}</span>
                    )}
                    {item.submenu && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Menu */}
      {user && (
        <div className="relative" ref={userMenuRef}>
          <button
            className={cn(
              "flex items-center gap-2 px-3 h-7 text-sm font-medium transition-colors rounded-md",
              "hover:bg-accent/80",
              showUserMenu && "bg-accent"
            )}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <User className="w-3 h-3 text-white" />
            </div>
            <span className="max-w-[120px] truncate">{user.name || user.email}</span>
            {user.subscriptionTier === 'pro' && (
              <Crown className="w-3 h-3 text-yellow-500" />
            )}
          </button>

          {showUserMenu && (
            <div className="absolute top-full right-0 z-50 min-w-[200px] py-1 bg-popover border border-border rounded-md shadow-lg mt-1">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium truncate">{user.name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize mt-1">
                  {user.subscriptionTier} Plan
                </p>
              </div>
              <button
                className="w-full px-3 py-1.5 flex items-center gap-3 text-left text-sm hover:bg-accent transition-colors text-red-500"
                onClick={() => {
                  setShowUserMenu(false)
                  logout()
                }}
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
