import { useState, useEffect, useMemo } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Square,
  Circle,
  Type,
  FileUp,
  Save,
  FolderOpen,
  Plus,
  Settings2,
  Route,
  Play,
  Undo2,
  Redo2,
  Copy,
  Clipboard,
  Trash2,
  Layers,
  Box,
  Grid3X3,
  Ruler,
  Move,
  Combine,
  Scissors,
  Home,
  Target,
  Package,
  Library,
  Puzzle,
} from 'lucide-react'

export interface CommandAction {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  category: 'file' | 'edit' | 'view' | 'design' | 'cam' | 'machine' | 'tools'
  action: () => void
  disabled?: boolean
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  additionalCommands?: CommandAction[]
}

export function CommandPalette({ open, onOpenChange, additionalCommands = [] }: CommandPaletteProps) {
  const {
    project,
    selectedObjectIds,
    undo,
    redo,
    copy,
    paste,
    deleteObjects,
    selectAll,
    deselectAll,
    setActiveTool,
    zoomIn,
    zoomOut,
    zoomToFit,
    setShowMachineSetup,
    setShowToolLibrary,
    setShowToolpathPanel,
    bringToFront,
    sendToBack,
    groupSelected,
    ungroupSelected,
  } = useDesignStore()

  const baseCommands: CommandAction[] = useMemo(() => [
    // File commands
    {
      id: 'new-project',
      label: 'New Project',
      icon: <Plus className="w-4 h-4" />,
      shortcut: '⌘N',
      category: 'file',
      action: () => {
        useDesignStore.getState().createNewProject('Untitled', 300, 300)
      },
    },
    {
      id: 'open-project',
      label: 'Open Project',
      icon: <FolderOpen className="w-4 h-4" />,
      shortcut: '⌘O',
      category: 'file',
      action: () => {
        // Will be handled by parent
      },
    },
    {
      id: 'save-project',
      label: 'Save Project',
      icon: <Save className="w-4 h-4" />,
      shortcut: '⌘S',
      category: 'file',
      action: () => {
        // Will be handled by parent
      },
      disabled: !project,
    },
    {
      id: 'import-svg',
      label: 'Import SVG/DXF',
      icon: <FileUp className="w-4 h-4" />,
      shortcut: '⌘I',
      category: 'file',
      action: () => {
        // Will be handled by parent
      },
      disabled: !project,
    },
    {
      id: 'import-3d',
      label: 'Import 3D Model',
      icon: <Box className="w-4 h-4" />,
      category: 'file',
      action: () => {
        // Will be handled by parent
      },
      disabled: !project,
    },

    // Edit commands
    {
      id: 'undo',
      label: 'Undo',
      icon: <Undo2 className="w-4 h-4" />,
      shortcut: '⌘Z',
      category: 'edit',
      action: undo,
    },
    {
      id: 'redo',
      label: 'Redo',
      icon: <Redo2 className="w-4 h-4" />,
      shortcut: '⌘⇧Z',
      category: 'edit',
      action: redo,
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: <Copy className="w-4 h-4" />,
      shortcut: '⌘C',
      category: 'edit',
      action: copy,
      disabled: selectedObjectIds.length === 0,
    },
    {
      id: 'paste',
      label: 'Paste',
      icon: <Clipboard className="w-4 h-4" />,
      shortcut: '⌘V',
      category: 'edit',
      action: paste,
    },
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: <Trash2 className="w-4 h-4" />,
      shortcut: 'Del',
      category: 'edit',
      action: () => deleteObjects(selectedObjectIds),
      disabled: selectedObjectIds.length === 0,
    },
    {
      id: 'select-all',
      label: 'Select All',
      icon: <Layers className="w-4 h-4" />,
      shortcut: '⌘A',
      category: 'edit',
      action: selectAll,
      disabled: !project,
    },
    {
      id: 'deselect-all',
      label: 'Deselect All',
      shortcut: 'Esc',
      category: 'edit',
      action: deselectAll,
    },
    {
      id: 'bring-to-front',
      label: 'Bring to Front',
      icon: <Layers className="w-4 h-4" />,
      shortcut: '⌘]',
      category: 'edit',
      action: bringToFront,
      disabled: selectedObjectIds.length === 0,
    },
    {
      id: 'send-to-back',
      label: 'Send to Back',
      icon: <Layers className="w-4 h-4" />,
      shortcut: '⌘[',
      category: 'edit',
      action: sendToBack,
      disabled: selectedObjectIds.length === 0,
    },
    {
      id: 'group',
      label: 'Group Selected',
      icon: <Combine className="w-4 h-4" />,
      shortcut: '⌘G',
      category: 'edit',
      action: groupSelected,
      disabled: selectedObjectIds.length < 2,
    },
    {
      id: 'ungroup',
      label: 'Ungroup',
      icon: <Scissors className="w-4 h-4" />,
      shortcut: '⌘⇧G',
      category: 'edit',
      action: ungroupSelected,
      disabled: selectedObjectIds.length === 0,
    },

    // View commands
    {
      id: 'zoom-in',
      label: 'Zoom In',
      shortcut: '⌘+',
      category: 'view',
      action: zoomIn,
    },
    {
      id: 'zoom-out',
      label: 'Zoom Out',
      shortcut: '⌘-',
      category: 'view',
      action: zoomOut,
    },
    {
      id: 'zoom-fit',
      label: 'Zoom to Fit',
      shortcut: '⌘0',
      category: 'view',
      action: zoomToFit,
    },
    {
      id: 'toggle-grid',
      label: 'Toggle Grid',
      icon: <Grid3X3 className="w-4 h-4" />,
      shortcut: '⌘\'',
      category: 'view',
      action: () => {
        if (project) {
          useDesignStore.getState().setProject({
            ...project,
            canvas: { ...project.canvas, showGrid: !project.canvas.showGrid }
          })
        }
      },
      disabled: !project,
    },

    // Design tool commands
    {
      id: 'tool-select',
      label: 'Select Tool',
      icon: <Move className="w-4 h-4" />,
      shortcut: 'V',
      category: 'design',
      action: () => setActiveTool('select'),
    },
    {
      id: 'tool-rectangle',
      label: 'Rectangle Tool',
      icon: <Square className="w-4 h-4" />,
      shortcut: 'R',
      category: 'design',
      action: () => setActiveTool('rectangle'),
    },
    {
      id: 'tool-ellipse',
      label: 'Ellipse Tool',
      icon: <Circle className="w-4 h-4" />,
      shortcut: 'E',
      category: 'design',
      action: () => setActiveTool('ellipse'),
    },
    {
      id: 'tool-text',
      label: 'Text Tool',
      icon: <Type className="w-4 h-4" />,
      shortcut: 'T',
      category: 'design',
      action: () => setActiveTool('text'),
    },
    {
      id: 'tool-measure',
      label: 'Measure Tool',
      icon: <Ruler className="w-4 h-4" />,
      shortcut: 'M',
      category: 'design',
      action: () => setActiveTool('measure'),
    },

    // CAM commands
    {
      id: 'show-toolpaths',
      label: 'Toggle Toolpath Panel',
      icon: <Route className="w-4 h-4" />,
      category: 'cam',
      action: () => setShowToolpathPanel(!useDesignStore.getState().showToolpathPanel),
    },
    {
      id: 'create-profile',
      label: 'Create Profile Toolpath',
      description: 'Cut along path outline',
      icon: <Route className="w-4 h-4" />,
      category: 'cam',
      action: () => {
        // Will be handled by CAM system
      },
      disabled: selectedObjectIds.length === 0,
    },
    {
      id: 'create-pocket',
      label: 'Create Pocket Toolpath',
      description: 'Clear area inside path',
      icon: <Route className="w-4 h-4" />,
      category: 'cam',
      action: () => {
        // Will be handled by CAM system
      },
      disabled: selectedObjectIds.length === 0,
    },
    {
      id: 'simulate',
      label: 'Simulate Toolpaths',
      icon: <Play className="w-4 h-4" />,
      shortcut: '⌘⇧S',
      category: 'cam',
      action: () => {
        // Will be handled by parent
      },
      disabled: !project || project.toolpaths.length === 0,
    },

    // Machine commands
    {
      id: 'machine-setup',
      label: 'Machine Setup',
      icon: <Settings2 className="w-4 h-4" />,
      category: 'machine',
      action: () => setShowMachineSetup(true),
    },
    {
      id: 'home-machine',
      label: 'Home Machine',
      icon: <Home className="w-4 h-4" />,
      shortcut: '⌘⇧H',
      category: 'machine',
      action: () => {
        // Will be handled by machine controller
      },
    },
    {
      id: 'set-origin',
      label: 'Set Work Origin',
      icon: <Target className="w-4 h-4" />,
      category: 'machine',
      action: () => {
        // Will be handled by machine controller
      },
    },

    // Tools commands
    {
      id: 'tool-library',
      label: 'Tool Library',
      icon: <Package className="w-4 h-4" />,
      category: 'tools',
      action: () => setShowToolLibrary(true),
    },
    {
      id: 'design-library',
      label: 'Design Library',
      description: 'Browse clipart, templates, and designs',
      icon: <Library className="w-4 h-4" />,
      category: 'tools',
      action: () => {
        // Will be handled by parent - opens DesignLibrary modal
        window.dispatchEvent(new CustomEvent('carv:open-design-library'))
      },
    },
    {
      id: 'app-library',
      label: 'App Library',
      description: 'Generators, utilities, and plugins',
      icon: <Puzzle className="w-4 h-4" />,
      category: 'tools',
      action: () => {
        // Will be handled by parent - opens AppLibrary modal
        window.dispatchEvent(new CustomEvent('carv:open-app-library'))
      },
    },
  ], [project, selectedObjectIds, undo, redo, copy, paste, deleteObjects, selectAll, deselectAll, setActiveTool, zoomIn, zoomOut, zoomToFit, setShowMachineSetup, setShowToolLibrary, setShowToolpathPanel, bringToFront, sendToBack, groupSelected, ungroupSelected])

  const allCommands = useMemo(() => [...baseCommands, ...additionalCommands], [baseCommands, additionalCommands])

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandAction[]> = {}
    for (const cmd of allCommands) {
      if (!groups[cmd.category]) groups[cmd.category] = []
      groups[cmd.category].push(cmd)
    }
    return groups
  }, [allCommands])

  const categoryLabels: Record<string, string> = {
    file: 'File',
    edit: 'Edit',
    view: 'View',
    design: 'Design Tools',
    cam: 'CAM',
    machine: 'Machine',
    tools: 'Tools',
  }

  const handleSelect = (commandId: string) => {
    const command = allCommands.find(c => c.id === commandId)
    if (command && !command.disabled) {
      command.action()
      onOpenChange(false)
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-md">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {Object.entries(groupedCommands).map(([category, commands], idx) => (
            <div key={category}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={categoryLabels[category] || category}>
                {commands.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    value={cmd.id}
                    onSelect={handleSelect}
                    disabled={cmd.disabled}
                    className={cn(cmd.disabled && 'opacity-50')}
                  >
                    {cmd.icon && <span className="mr-2">{cmd.icon}</span>}
                    <div className="flex-1">
                      <div>{cmd.label}</div>
                      {cmd.description && (
                        <div className="text-xs text-muted-foreground">{cmd.description}</div>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <span className="ml-auto text-xs text-muted-foreground">{cmd.shortcut}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return { open, setOpen }
}
