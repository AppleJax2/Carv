import type { Project } from '@/types/design'
import type { MachineConfig, Tool, Material } from '@/types/machine'

export interface ProjectFile {
  version: string
  createdAt: string
  modifiedAt: string
  project: Project
  machineConfig: MachineConfig | null
  tools: Tool[]
  materials: Material[]
}

const PROJECT_FILE_VERSION = '1.0.0'
const RECENT_PROJECTS_KEY = 'cncraft_recent_projects'
const MAX_RECENT_PROJECTS = 10

export function serializeProject(
  project: Project,
  machineConfig: MachineConfig | null,
  tools: Tool[],
  materials: Material[]
): string {
  const projectFile: ProjectFile = {
    version: PROJECT_FILE_VERSION,
    createdAt: typeof project.createdAt === 'string' ? project.createdAt : new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    project,
    machineConfig,
    tools,
    materials,
  }

  return JSON.stringify(projectFile, null, 2)
}

export function deserializeProject(json: string): ProjectFile {
  const data = JSON.parse(json)
  
  if (!data.version) {
    throw new Error('Invalid project file: missing version')
  }

  if (!data.project) {
    throw new Error('Invalid project file: missing project data')
  }

  const version = data.version.split('.').map(Number)
  const currentVersion = PROJECT_FILE_VERSION.split('.').map(Number)

  if (version[0] > currentVersion[0]) {
    throw new Error(`Project file version ${data.version} is newer than supported version ${PROJECT_FILE_VERSION}`)
  }

  return migrateProject(data)
}

function migrateProject(data: any): ProjectFile {
  let migrated = { ...data }

  if (!migrated.tools) {
    migrated.tools = []
  }

  if (!migrated.materials) {
    migrated.materials = []
  }

  if (!migrated.project.toolpaths) {
    migrated.project.toolpaths = []
  }

  for (const obj of migrated.project.objects) {
    if (!obj.id) obj.id = crypto.randomUUID()
    if (obj.visible === undefined) obj.visible = true
    if (obj.locked === undefined) obj.locked = false
    if (obj.selected === undefined) obj.selected = false
  }

  for (const layer of migrated.project.layers) {
    if (!layer.id) layer.id = crypto.randomUUID()
    if (layer.visible === undefined) layer.visible = true
    if (layer.locked === undefined) layer.locked = false
  }

  return migrated as ProjectFile
}

export interface RecentProject {
  path: string
  name: string
  lastOpened: string
  thumbnail?: string
}

export function getRecentProjects(): RecentProject[] {
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function addRecentProject(path: string, name: string, thumbnail?: string): void {
  const recent = getRecentProjects()
  
  const existing = recent.findIndex(p => p.path === path)
  if (existing !== -1) {
    recent.splice(existing, 1)
  }

  recent.unshift({
    path,
    name,
    lastOpened: new Date().toISOString(),
    thumbnail,
  })

  if (recent.length > MAX_RECENT_PROJECTS) {
    recent.pop()
  }

  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recent))
}

export function removeRecentProject(path: string): void {
  const recent = getRecentProjects()
  const filtered = recent.filter(p => p.path !== path)
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(filtered))
}

export function clearRecentProjects(): void {
  localStorage.removeItem(RECENT_PROJECTS_KEY)
}

export async function saveProjectToFile(
  project: Project,
  machineConfig: MachineConfig | null,
  tools: Tool[],
  materials: Material[],
  filePath?: string
): Promise<string | null> {
  const json = serializeProject(project, machineConfig, tools, materials)

  if ((window.electronAPI as any)?.file) {
    const result = await (window.electronAPI as any).file.saveProject(json, filePath)
    if (result.success && result.path) {
      addRecentProject(result.path, project.name)
      return result.path
    }
    return null
  }

  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name}.cncraft`
  a.click()
  URL.revokeObjectURL(url)
  
  return null
}

export async function loadProjectFromFile(filePath?: string): Promise<ProjectFile | null> {
  if ((window.electronAPI as any)?.file) {
    const result = await (window.electronAPI as any).file.openProject(filePath)
    if (result.success && result.content) {
      const projectFile = deserializeProject(result.content)
      if (result.path) {
        addRecentProject(result.path, projectFile.project.name)
      }
      return projectFile
    }
    return null
  }

  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.cncraft,.json'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const text = await file.text()
        const projectFile = deserializeProject(text)
        resolve(projectFile)
      } catch (err) {
        console.error('Failed to load project:', err)
        resolve(null)
      }
    }

    input.click()
  })
}

const AUTO_SAVE_KEY = 'cncraft_autosave'
const AUTO_SAVE_INTERVAL = 60000

let autoSaveTimer: number | null = null

export function startAutoSave(
  getState: () => { project: Project | null; machineConfig: MachineConfig | null; tools: Tool[]; materials: Material[] }
): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
  }

  autoSaveTimer = window.setInterval(() => {
    const state = getState()
    if (state.project) {
      const json = serializeProject(
        state.project,
        state.machineConfig,
        state.tools,
        state.materials
      )
      localStorage.setItem(AUTO_SAVE_KEY, json)
      console.log('Auto-saved project')
    }
  }, AUTO_SAVE_INTERVAL)
}

export function stopAutoSave(): void {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

export function getAutoSavedProject(): ProjectFile | null {
  try {
    const stored = localStorage.getItem(AUTO_SAVE_KEY)
    if (!stored) return null
    return deserializeProject(stored)
  } catch {
    return null
  }
}

export function clearAutoSave(): void {
  localStorage.removeItem(AUTO_SAVE_KEY)
}

export function exportProjectAsJSON(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export function validateProject(project: Project): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!project.id) errors.push('Project missing ID')
  if (!project.name) errors.push('Project missing name')
  if (!project.canvas) errors.push('Project missing canvas settings')
  if (!Array.isArray(project.layers)) errors.push('Project missing layers array')
  if (!Array.isArray(project.objects)) errors.push('Project missing objects array')
  if (!Array.isArray(project.toolpaths)) errors.push('Project missing toolpaths array')

  if (project.layers.length === 0) {
    errors.push('Project must have at least one layer')
  }

  const layerIds = new Set(project.layers.map(l => l.id))
  for (const obj of project.objects) {
    if (!layerIds.has(obj.layerId)) {
      errors.push(`Object ${obj.id} references non-existent layer ${obj.layerId}`)
    }
  }

  const objectIds = new Set(project.objects.map(o => o.id))
  for (const toolpath of project.toolpaths) {
    for (const sourceId of toolpath.sourceObjectIds) {
      if (!objectIds.has(sourceId)) {
        errors.push(`Toolpath ${toolpath.id} references non-existent object ${sourceId}`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function duplicateProject(project: Project): Project {
  const newProject: Project = JSON.parse(JSON.stringify(project))
  
  newProject.id = crypto.randomUUID()
  newProject.name = `${project.name} (Copy)`
  ;(newProject as any).createdAt = new Date().toISOString()
  ;(newProject as any).modifiedAt = new Date().toISOString()

  const idMap = new Map<string, string>()

  for (const layer of newProject.layers) {
    const oldId = layer.id
    layer.id = crypto.randomUUID()
    idMap.set(oldId, layer.id)
  }

  for (const obj of newProject.objects) {
    const oldId = obj.id
    obj.id = crypto.randomUUID()
    idMap.set(oldId, obj.id)
    
    if (idMap.has(obj.layerId)) {
      obj.layerId = idMap.get(obj.layerId)!
    }
  }

  for (const toolpath of newProject.toolpaths) {
    toolpath.id = crypto.randomUUID()
    toolpath.sourceObjectIds = toolpath.sourceObjectIds.map(id => idMap.get(id) || id)
  }

  return newProject
}
