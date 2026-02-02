import { useEffect, useRef, useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { saveProjectToFile } from '@/lib/projectManager'
import { cn } from '@/lib/utils'
import { Cloud, CloudOff, Check, Loader2 } from 'lucide-react'

const AUTOSAVE_INTERVAL = 30000 // 30 seconds

export function AutoSaveIndicator() {
  const { 
    project, 
    isDirty, 
    autoSaveEnabled, 
    lastSavedAt,
    markSaved,
    machineConfig,
    tools,
    materials
  } = useDesignStore()
  
  const [isSaving, setIsSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!autoSaveEnabled || !project || !isDirty) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      setIsSaving(true)
      try {
        await saveProjectToFile(project, machineConfig, tools, materials)
        markSaved()
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)
      } catch (err) {
        console.error('Autosave failed:', err)
      } finally {
        setIsSaving(false)
      }
    }, AUTOSAVE_INTERVAL)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [project, isDirty, autoSaveEnabled, machineConfig, tools, materials, markSaved])

  if (!project) return null

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never'
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors',
        isSaving && 'text-blue-400',
        showSaved && 'text-green-400',
        isDirty && !isSaving && 'text-yellow-400',
        !isDirty && !showSaved && 'text-muted-foreground'
      )}
    >
      {isSaving ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Saving...</span>
        </>
      ) : showSaved ? (
        <>
          <Check className="w-3 h-3" />
          <span>Saved</span>
        </>
      ) : isDirty ? (
        <>
          <Cloud className="w-3 h-3" />
          <span>Unsaved changes</span>
        </>
      ) : autoSaveEnabled ? (
        <>
          <Cloud className="w-3 h-3" />
          <span>Saved {formatTime(lastSavedAt)}</span>
        </>
      ) : (
        <>
          <CloudOff className="w-3 h-3" />
          <span>Auto-save off</span>
        </>
      )}
    </div>
  )
}
