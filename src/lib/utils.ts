import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function formatNumber(value: number, decimals: number = 3): string {
  return value.toFixed(decimals)
}

export function parseGcodeFile(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

export function estimateJobTime(gcode: string[], defaultFeedRate: number = 1000): number {
  let totalTime = 0
  let currentFeedRate = defaultFeedRate
  let lastPosition = { x: 0, y: 0, z: 0 }
  let isAbsolute = true

  for (const line of gcode) {
    const upper = line.toUpperCase()
    
    if (upper.startsWith(';') || upper.startsWith('(')) continue
    
    if (upper.includes('G90')) isAbsolute = true
    if (upper.includes('G91')) isAbsolute = false
    
    const feedMatch = upper.match(/F([\d.]+)/)
    if (feedMatch) {
      currentFeedRate = parseFloat(feedMatch[1])
    }
    
    const xMatch = upper.match(/X([-\d.]+)/)
    const yMatch = upper.match(/Y([-\d.]+)/)
    const zMatch = upper.match(/Z([-\d.]+)/)
    
    if (xMatch || yMatch || zMatch) {
      const newPos = { ...lastPosition }
      
      if (xMatch) {
        newPos.x = isAbsolute ? parseFloat(xMatch[1]) : lastPosition.x + parseFloat(xMatch[1])
      }
      if (yMatch) {
        newPos.y = isAbsolute ? parseFloat(yMatch[1]) : lastPosition.y + parseFloat(yMatch[1])
      }
      if (zMatch) {
        newPos.z = isAbsolute ? parseFloat(zMatch[1]) : lastPosition.z + parseFloat(zMatch[1])
      }
      
      const distance = Math.sqrt(
        Math.pow(newPos.x - lastPosition.x, 2) +
        Math.pow(newPos.y - lastPosition.y, 2) +
        Math.pow(newPos.z - lastPosition.z, 2)
      )
      
      const isRapid = upper.includes('G0 ') || upper.startsWith('G0')
      const feedRate = isRapid ? 5000 : currentFeedRate
      
      totalTime += (distance / feedRate) * 60 * 1000
      lastPosition = newPos
    }
  }
  
  return totalTime
}

export const ALARM_CODES: Record<number, string> = {
  1: 'Hard limit triggered. Check limit switches and machine position.',
  2: 'Soft limit triggered. Motion exceeds machine travel.',
  3: 'Reset while in motion. Position may be lost.',
  4: 'Probe fail. Probe did not contact within search distance.',
  5: 'Probe fail. Probe already triggered before starting cycle.',
  6: 'Homing fail. Reset during active homing cycle.',
  7: 'Homing fail. Door opened during homing cycle.',
  8: 'Homing fail. Pull off travel failed to clear limit switch.',
  9: 'Homing fail. Could not find limit switch within search distance.',
}

export const STATE_COLORS: Record<string, string> = {
  Idle: 'text-green-500',
  Run: 'text-blue-500',
  Hold: 'text-yellow-500',
  Jog: 'text-blue-400',
  Alarm: 'text-red-500',
  Door: 'text-yellow-500',
  Check: 'text-purple-500',
  Home: 'text-cyan-500',
  Sleep: 'text-gray-500',
}

export const STATE_BG_COLORS: Record<string, string> = {
  Idle: 'bg-green-500/20',
  Run: 'bg-blue-500/20',
  Hold: 'bg-yellow-500/20',
  Jog: 'bg-blue-400/20',
  Alarm: 'bg-red-500/20',
  Door: 'bg-yellow-500/20',
  Check: 'bg-purple-500/20',
  Home: 'bg-cyan-500/20',
  Sleep: 'bg-gray-500/20',
}
