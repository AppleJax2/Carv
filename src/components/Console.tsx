import { useStore } from '@/store/useStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { cn } from '@/lib/utils'
import { Terminal, Trash2, ChevronDown, ChevronUp, Send } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function Console() {
  const { 
    consoleMessages, 
    clearConsole, 
    addConsoleMessage,
    isConsoleOpen, 
    setConsoleOpen,
    isConnected 
  } = useStore()
  
  const [command, setCommand] = useState('')
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [consoleMessages])

  const handleSend = async () => {
    if (!command.trim() || !window.electronAPI || !isConnected) return
    
    addConsoleMessage('sent', command)
    setCommandHistory(prev => [...prev, command])
    setHistoryIndex(-1)
    
    await window.electronAPI.grbl.send(command)
    setCommand('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(commandHistory[commandHistory.length - 1 - newIndex] || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand('')
      }
    }
  }

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'sent':
        return 'text-blue-400'
      case 'received':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'info':
        return 'text-yellow-400'
      default:
        return 'text-muted-foreground'
    }
  }

  if (!isConsoleOpen) {
    return (
      <div 
        className="h-10 bg-card border-t border-border flex items-center justify-between px-4 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setConsoleOpen(true)}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Terminal className="w-4 h-4" />
          Console
        </div>
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card className="rounded-none border-x-0 border-b-0">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Console
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={clearConsole} title="Clear">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setConsoleOpen(false)} title="Minimize">
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={scrollRef}
          className="h-40 overflow-y-auto font-mono text-xs p-2 bg-background/50"
        >
          {consoleMessages.map((msg) => (
            <div key={msg.id} className={cn('py-0.5', getMessageStyle(msg.type))}>
              <span className="text-muted-foreground opacity-50">
                {msg.timestamp.toLocaleTimeString()}
              </span>
              {' '}
              {msg.type === 'sent' && <span className="text-blue-500">{'>'}</span>}
              {msg.type === 'received' && <span className="text-green-500">{'<'}</span>}
              {msg.type === 'error' && <span className="text-red-500">!</span>}
              {msg.type === 'info' && <span className="text-yellow-500">i</span>}
              {' '}
              {msg.content}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 p-2 border-t border-border">
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter G-code command..."
            disabled={!isConnected}
            className="flex-1 bg-transparent border-none outline-none text-sm font-mono placeholder:text-muted-foreground"
          />
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={handleSend}
            disabled={!isConnected || !command.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
