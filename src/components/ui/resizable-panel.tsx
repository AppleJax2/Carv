import { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ResizablePanelProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  side: 'left' | 'right'
  className?: string
  onResize?: (width: number) => void
}

export function ResizablePanel({
  children,
  defaultWidth = 256,
  minWidth = 180,
  maxWidth = 400,
  side,
  className,
  onResize,
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current) return

    const panelRect = panelRef.current.getBoundingClientRect()
    let newWidth: number

    if (side === 'left') {
      newWidth = e.clientX - panelRect.left
    } else {
      newWidth = panelRect.right - e.clientX
    }

    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
    setWidth(newWidth)
    onResize?.(newWidth)
  }, [isResizing, side, minWidth, maxWidth, onResize])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={panelRef}
      className={cn("relative flex-shrink-0", className)}
      style={{ width }}
    >
      {children}
      
      <div
        className={cn(
          "absolute top-0 bottom-0 w-1 cursor-col-resize z-10 group",
          "hover:bg-primary/30 transition-colors",
          isResizing && "bg-primary/50",
          side === 'left' ? "right-0" : "left-0"
        )}
        onMouseDown={handleMouseDown}
      >
        <div 
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-1 h-8 rounded-full",
            "bg-border group-hover:bg-primary/50 transition-colors",
            side === 'left' ? "right-0" : "left-0"
          )}
        />
      </div>
    </div>
  )
}

interface ResizableHandleProps {
  onResize: (delta: number) => void
  side: 'left' | 'right'
  className?: string
}

export function ResizableHandle({ onResize, side, className }: ResizableHandleProps) {
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = side === 'right' 
        ? startXRef.current - e.clientX 
        : e.clientX - startXRef.current
      startXRef.current = e.clientX
      onResize(delta)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onResize, side])

  return (
    <div
      className={cn(
        "w-1 cursor-col-resize flex-shrink-0 group relative",
        "hover:bg-primary/20 transition-colors",
        isResizing && "bg-primary/40",
        className
      )}
      onMouseDown={handleMouseDown}
    >
      <div 
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-0.5 h-12 rounded-full bg-border",
          "group-hover:bg-primary/60 group-hover:h-16 transition-all",
          isResizing && "bg-primary h-20"
        )}
      />
    </div>
  )
}
