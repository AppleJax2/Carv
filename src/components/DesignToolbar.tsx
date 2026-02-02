import { useState } from 'react'
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
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Copy,
  Clipboard,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Group,
  Ungroup,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './ui/tooltip'

interface ToolItem {
  id: DesignTool
  icon: React.ReactNode
  label: string
  shortcut?: string
}

interface ToolSection {
  title: string
  tools: (ToolItem | ActionItem)[]
}

interface ActionItem {
  id: string
  icon: React.ReactNode
  label: string
  shortcut?: string
  action: () => void
  disabled?: boolean
}

export function DesignToolbar() {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const {
    activeTool,
    setActiveTool,
    selectedObjectIds,
    undo,
    redo,
    zoomIn,
    zoomOut,
    zoomToFit,
    copy,
    paste,
    deleteObjects,
    history,
    historyIndex,
    alignObjects,
    bringToFront,
    sendToBack,
    groupSelected,
    ungroupSelected,
  } = useDesignStore()

  const canUndo = historyIndex >= 0
  const canRedo = historyIndex < history.length - 1
  const hasSelection = selectedObjectIds.length > 0
  const hasMultipleSelection = selectedObjectIds.length > 1

  const toolSections: ToolSection[] = [
    {
      title: 'Tools',
      tools: [
        { id: 'select' as DesignTool, icon: <MousePointer2 className="w-4 h-4" />, label: 'Select', shortcut: 'V' },
        { id: 'pan' as DesignTool, icon: <Hand className="w-4 h-4" />, label: 'Pan', shortcut: 'H' },
        { id: 'rectangle' as DesignTool, icon: <Square className="w-4 h-4" />, label: 'Rectangle', shortcut: 'R' },
        { id: 'ellipse' as DesignTool, icon: <Circle className="w-4 h-4" />, label: 'Ellipse', shortcut: 'E' },
        { id: 'polygon' as DesignTool, icon: <Hexagon className="w-4 h-4" />, label: 'Polygon', shortcut: 'P' },
        { id: 'line' as DesignTool, icon: <Minus className="w-4 h-4" />, label: 'Line', shortcut: 'L' },
        { id: 'pen' as DesignTool, icon: <Pen className="w-4 h-4" />, label: 'Pen', shortcut: 'N' },
        { id: 'text' as DesignTool, icon: <Type className="w-4 h-4" />, label: 'Text', shortcut: 'T' },
        { id: 'node-edit' as DesignTool, icon: <Move3D className="w-4 h-4" />, label: 'Node Edit', shortcut: 'A' },
        { id: 'measure' as DesignTool, icon: <Ruler className="w-4 h-4" />, label: 'Measure', shortcut: 'M' },
      ],
    },
    {
      title: 'History',
      tools: [
        { id: 'undo', icon: <Undo2 className="w-4 h-4" />, label: 'Undo', shortcut: 'Ctrl+Z', action: undo, disabled: !canUndo },
        { id: 'redo', icon: <Redo2 className="w-4 h-4" />, label: 'Redo', shortcut: 'Ctrl+Y', action: redo, disabled: !canRedo },
      ],
    },
    {
      title: 'View',
      tools: [
        { id: 'zoom-in', icon: <ZoomIn className="w-4 h-4" />, label: 'Zoom In', shortcut: '+', action: zoomIn },
        { id: 'zoom-out', icon: <ZoomOut className="w-4 h-4" />, label: 'Zoom Out', shortcut: '-', action: zoomOut },
        { id: 'zoom-fit', icon: <Maximize className="w-4 h-4" />, label: 'Fit to View', shortcut: '0', action: zoomToFit },
      ],
    },
    {
      title: 'Edit',
      tools: [
        { id: 'copy', icon: <Copy className="w-4 h-4" />, label: 'Copy', shortcut: 'Ctrl+C', action: copy, disabled: !hasSelection },
        { id: 'paste', icon: <Clipboard className="w-4 h-4" />, label: 'Paste', shortcut: 'Ctrl+V', action: paste },
        { id: 'delete', icon: <Trash2 className="w-4 h-4" />, label: 'Delete', shortcut: 'Del', action: () => deleteObjects(selectedObjectIds), disabled: !hasSelection },
      ],
    },
    {
      title: 'Align',
      tools: [
        { id: 'align-left', icon: <AlignLeft className="w-4 h-4" />, label: 'Align Left', action: () => alignObjects('left'), disabled: !hasMultipleSelection },
        { id: 'align-center', icon: <AlignCenter className="w-4 h-4" />, label: 'Align Center', action: () => alignObjects('center'), disabled: !hasMultipleSelection },
        { id: 'align-right', icon: <AlignRight className="w-4 h-4" />, label: 'Align Right', action: () => alignObjects('right'), disabled: !hasMultipleSelection },
        { id: 'align-top', icon: <AlignStartVertical className="w-4 h-4" />, label: 'Align Top', action: () => alignObjects('top'), disabled: !hasMultipleSelection },
        { id: 'align-middle', icon: <AlignCenterVertical className="w-4 h-4" />, label: 'Align Middle', action: () => alignObjects('middle'), disabled: !hasMultipleSelection },
        { id: 'align-bottom', icon: <AlignEndVertical className="w-4 h-4" />, label: 'Align Bottom', action: () => alignObjects('bottom'), disabled: !hasMultipleSelection },
      ],
    },
    {
      title: 'Arrange',
      tools: [
        { id: 'bring-front', icon: <ArrowUpToLine className="w-4 h-4" />, label: 'Bring to Front', action: bringToFront, disabled: !hasSelection },
        { id: 'send-back', icon: <ArrowDownToLine className="w-4 h-4" />, label: 'Send to Back', action: sendToBack, disabled: !hasSelection },
        { id: 'group', icon: <Group className="w-4 h-4" />, label: 'Group', shortcut: 'Ctrl+G', action: groupSelected, disabled: !hasMultipleSelection },
        { id: 'ungroup', icon: <Ungroup className="w-4 h-4" />, label: 'Ungroup', shortcut: 'Ctrl+Shift+G', action: ungroupSelected, disabled: !hasSelection },
      ],
    },
  ]

  const isToolItem = (item: ToolItem | ActionItem): item is ToolItem => {
    return 'id' in item && !('action' in item)
  }

  return (
    <div 
      className={cn(
        "flex flex-col bg-card border-r border-border transition-all duration-200 overflow-hidden",
        isExpanded ? "w-44" : "w-12"
      )}
    >
      <div className="flex items-center justify-between p-2 border-b border-border">
        {isExpanded && <span className="text-xs font-medium text-muted-foreground">Tools</span>}
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 ml-auto"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5">
        {toolSections.map((section, sectionIdx) => (
          <div key={section.title}>
            {sectionIdx > 0 && <div className="h-px bg-border my-2" />}
            
            {isExpanded && (
              <div className="text-[10px] font-medium text-muted-foreground px-1.5 py-1 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            
            <div className={cn("space-y-0.5", !isExpanded && "flex flex-col items-center")}>
              {section.tools.map((item) => {
                const isTool = isToolItem(item)
                const isActive = isTool && activeTool === item.id
                const isDisabled = !isTool && (item as ActionItem).disabled

                const handleClick = () => {
                  if (isTool) {
                    setActiveTool(item.id)
                  } else {
                    (item as ActionItem).action()
                  }
                }

                const button = (
                  <button
                    key={item.id}
                    onClick={handleClick}
                    disabled={isDisabled}
                    className={cn(
                      "flex items-center gap-2 rounded-md transition-colors text-sm",
                      isExpanded ? "w-full px-2 py-1.5" : "w-8 h-8 justify-center",
                      isActive 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent",
                      isDisabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {isExpanded && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.shortcut && (
                          <span className="text-[10px] text-muted-foreground opacity-60">
                            {item.shortcut}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )

                if (!isExpanded) {
                  return (
                    <Tooltip key={item.id}>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                        {item.shortcut && (
                          <span className="text-muted-foreground ml-1">({item.shortcut})</span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  )
                }

                return button
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
