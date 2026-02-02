import { useState, useCallback, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  PanelRightClose, 
  PanelRightOpen,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

interface PanelConfig {
  id: string
  title: string
  icon?: ReactNode
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  collapsible?: boolean
}

interface WorkspaceLayoutProps {
  leftPanels?: PanelConfig[]
  rightPanels?: PanelConfig[]
  bottomPanel?: PanelConfig
  toolbar?: ReactNode
  header?: ReactNode
  children: ReactNode
  renderPanel: (panelId: string) => ReactNode
}

export function WorkspaceLayout({
  leftPanels = [],
  rightPanels = [],
  bottomPanel,
  toolbar,
  header,
  children,
  renderPanel,
}: WorkspaceLayoutProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [bottomCollapsed, setBottomCollapsed] = useState(true)
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(320)
  const [bottomHeight, setBottomHeight] = useState(200)
  const [isResizingLeft, setIsResizingLeft] = useState(false)
  const [isResizingRight, setIsResizingRight] = useState(false)
  const [isResizingBottom, setIsResizingBottom] = useState(false)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft) {
      const newWidth = Math.max(200, Math.min(500, e.clientX - 48))
      setLeftWidth(newWidth)
    }
    if (isResizingRight) {
      const newWidth = Math.max(250, Math.min(600, window.innerWidth - e.clientX))
      setRightWidth(newWidth)
    }
    if (isResizingBottom) {
      const newHeight = Math.max(100, Math.min(400, window.innerHeight - e.clientY))
      setBottomHeight(newHeight)
    }
  }, [isResizingLeft, isResizingRight, isResizingBottom])

  const handleMouseUp = useCallback(() => {
    setIsResizingLeft(false)
    setIsResizingRight(false)
    setIsResizingBottom(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const startResize = (direction: 'left' | 'right' | 'bottom') => {
    if (direction === 'left') setIsResizingLeft(true)
    if (direction === 'right') setIsResizingRight(true)
    if (direction === 'bottom') setIsResizingBottom(true)
    document.body.style.cursor = direction === 'bottom' ? 'ns-resize' : 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div 
      className="h-screen flex flex-col bg-background text-foreground overflow-hidden"
      onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {header && (
        <div className="h-12 border-b border-border bg-card flex-shrink-0">
          {header}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {toolbar && (
          <div className="w-12 border-r border-border bg-card flex-shrink-0">
            {toolbar}
          </div>
        )}

        {leftPanels.length > 0 && (
          <>
            <div 
              className={cn(
                'border-r border-border bg-card flex-shrink-0 flex flex-col transition-all duration-200',
                leftCollapsed ? 'w-0 overflow-hidden' : ''
              )}
              style={{ width: leftCollapsed ? 0 : leftWidth }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-medium">
                  {leftPanels[0]?.title}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => setLeftCollapsed(true)}
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Collapse panel</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 overflow-y-auto">
                {leftPanels.map(panel => (
                  <div key={panel.id}>
                    {renderPanel(panel.id)}
                  </div>
                ))}
              </div>
            </div>
            
            {!leftCollapsed && (
              <div 
                className="w-1 bg-border hover:bg-primary/50 cursor-ew-resize flex-shrink-0 transition-colors"
                onMouseDown={() => startResize('left')}
              />
            )}
            
            {leftCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute left-12 top-14 z-10"
                    onClick={() => setLeftCollapsed(false)}
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Expand panel</TooltipContent>
              </Tooltip>
            )}
          </>
        )}

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>

          {bottomPanel && !bottomCollapsed && (
            <>
              <div 
                className="h-1 bg-border hover:bg-primary/50 cursor-ns-resize flex-shrink-0 transition-colors"
                onMouseDown={() => startResize('bottom')}
              />
              <div 
                className="border-t border-border bg-card flex-shrink-0 flex flex-col"
                style={{ height: bottomHeight }}
              >
                <div className="flex items-center justify-between px-3 py-1 border-b border-border">
                  <span className="text-xs font-medium">{bottomPanel.title}</span>
                  <Button 
                    variant="ghost" 
                    size="icon-sm"
                    onClick={() => setBottomCollapsed(true)}
                  >
                    <Minimize2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {renderPanel(bottomPanel.id)}
                </div>
              </div>
            </>
          )}

          {bottomPanel && bottomCollapsed && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setBottomCollapsed(false)}
                    className="bg-card/90 backdrop-blur"
                  >
                    <Maximize2 className="w-3 h-3 mr-1" />
                    {bottomPanel.title}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show {bottomPanel.title}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {rightPanels.length > 0 && (
          <>
            {!rightCollapsed && (
              <div 
                className="w-1 bg-border hover:bg-primary/50 cursor-ew-resize flex-shrink-0 transition-colors"
                onMouseDown={() => startResize('right')}
              />
            )}
            
            <div 
              className={cn(
                'border-l border-border bg-card flex-shrink-0 flex flex-col transition-all duration-200',
                rightCollapsed ? 'w-0 overflow-hidden' : ''
              )}
              style={{ width: rightCollapsed ? 0 : rightWidth }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon-sm"
                      onClick={() => setRightCollapsed(true)}
                    >
                      <PanelRightClose className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Collapse panel</TooltipContent>
                </Tooltip>
                <span className="text-sm font-medium">
                  {rightPanels[0]?.title}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {rightPanels.map(panel => (
                  <div key={panel.id}>
                    {renderPanel(panel.id)}
                  </div>
                ))}
              </div>
            </div>
            
            {rightCollapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute right-0 top-14 z-10"
                    onClick={() => setRightCollapsed(false)}
                  >
                    <PanelRightOpen className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Expand panel</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  )
}
