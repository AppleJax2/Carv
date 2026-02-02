import { useState } from 'react'
import { useDesignStore } from '@/store/useDesignStore'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Type, X } from 'lucide-react'
import { getAvailableFonts, textToPath } from '@/lib/textToPath'
import type { TextObject } from '@/types/design'

interface TextDialogProps {
  position: { x: number; y: number }
  onClose: () => void
}

export function TextDialog({ position, onClose }: TextDialogProps) {
  const { activeLayerId, addObject, selectObjects } = useDesignStore()
  
  const [text, setText] = useState('Text')
  const [fontSize, setFontSize] = useState(24)
  const [fontFamily, setFontFamily] = useState('CNC Sans')
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left')
  const [convertToPath, setConvertToPath] = useState(true)

  const availableFonts = getAvailableFonts()

  const handleCreate = () => {
    if (!activeLayerId || !text.trim()) return

    if (convertToPath) {
      const textObj: TextObject = {
        id: crypto.randomUUID(),
        layerId: activeLayerId,
        name: `Text: "${text.slice(0, 20)}${text.length > 20 ? '...' : ''}"`,
        visible: true,
        locked: false,
        selected: false,
        type: 'text',
        content: text,
        fontFamily,
        fontSize,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign,
        letterSpacing: 0,
        lineHeight: 1.2,
        convertedToPath: true,
        transform: { x: position.x, y: position.y, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1, fillColor: null, fillOpacity: 1 },
      }

      const paths = textToPath(textObj, activeLayerId)
      
      if (paths.length > 0) {
        const ids: string[] = []
        for (const path of paths) {
          addObject(path)
          ids.push(path.id)
        }
        selectObjects(ids)
      }
    } else {
      const textObj: TextObject = {
        id: crypto.randomUUID(),
        layerId: activeLayerId,
        name: `Text: "${text.slice(0, 20)}${text.length > 20 ? '...' : ''}"`,
        visible: true,
        locked: false,
        selected: false,
        type: 'text',
        content: text,
        fontFamily,
        fontSize,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textAlign,
        letterSpacing: 0,
        lineHeight: 1.2,
        convertedToPath: false,
        transform: { x: position.x, y: position.y, rotation: 0, scaleX: 1, scaleY: 1 },
        style: { strokeColor: '#3b82f6', strokeWidth: 1, strokeOpacity: 1, fillColor: null, fillOpacity: 1 },
      }

      addObject(textObj)
      selectObjects([textObj.id])
    }

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[450px]">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              Add Text
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Text Content</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-24 px-3 py-2 rounded-md bg-secondary border border-input text-sm resize-none"
              placeholder="Enter your text..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Font</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
              >
                {availableFonts.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Size (mm)</label>
              <input
                type="number"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                min={1}
                max={500}
                className="w-full h-9 px-3 rounded-md bg-secondary border border-input text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Alignment</label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <Button
                  key={align}
                  variant={textAlign === align ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTextAlign(align)}
                  className="flex-1 capitalize"
                >
                  {align}
                </Button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-accent/50 rounded-md">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={convertToPath}
                onChange={(e) => setConvertToPath(e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <div className="text-sm font-medium">Convert to paths</div>
                <div className="text-xs text-muted-foreground">
                  Required for CNC toolpaths. Converts text to vector outlines.
                </div>
              </div>
            </label>
          </div>

          <div className="h-32 border border-border rounded-md bg-[#1a1a2e] flex items-center justify-center overflow-hidden">
            <div 
              className="text-blue-400"
              style={{ 
                fontFamily: fontFamily === 'CNC Sans' ? 'Arial' : fontFamily,
                fontSize: `${Math.min(fontSize, 48)}px`,
                textAlign,
                whiteSpace: 'pre-wrap',
                maxWidth: '90%',
              }}
            >
              {text || 'Preview'}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!text.trim()}>
              <Type className="w-4 h-4 mr-2" />
              Create Text
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
