export interface MarketplaceItem {
  id: string
  name: string
  description: string
  author: string
  authorUrl?: string
  version: string
  
  category: MarketplaceCategory
  tags: string[]
  
  thumbnail: string
  images?: string[]
  
  pricing: ItemPricing
  
  downloads: number
  rating: number
  ratingCount: number
  
  createdAt: Date
  updatedAt: Date
  
  featured?: boolean
  verified?: boolean
}

export type MarketplaceCategory = 
  | 'design'
  | 'generator'
  | 'utility'
  | 'template'
  | 'font'
  | 'material-preset'
  | 'machine-profile'
  | 'post-processor'

export interface ItemPricing {
  type: 'free' | 'paid' | 'freemium'
  price?: number
  currency?: 'USD'
  trialDays?: number
}

export interface DesignAsset extends MarketplaceItem {
  category: 'design'
  
  designType: 'clipart' | 'template' | 'pattern' | 'font'
  
  subcategory: string
  
  fileFormat: 'svg' | 'dxf' | 'carv'
  fileUrl: string
  
  dimensions?: {
    width: number
    height: number
    unit: 'mm' | 'inch'
  }
  
  recommendedMaterial?: string
  recommendedBit?: string
  estimatedTime?: number
}

export interface GeneratorApp extends MarketplaceItem {
  category: 'generator'
  
  generatorType: 'box' | 'puzzle' | 'inlay' | 'cabinet' | 'sign' | 'custom'
  
  entryPoint: string
  
  permissions: AppPermission[]
  
  configSchema?: Record<string, ParameterSchema>
}

export interface UtilityApp extends MarketplaceItem {
  category: 'utility'
  
  utilityType: 'import' | 'export' | 'optimization' | 'analysis' | 'custom'
  
  entryPoint: string
  
  permissions: AppPermission[]
  
  configSchema?: Record<string, ParameterSchema>
}

export type AppPermission = 
  | 'read-project'
  | 'write-project'
  | 'read-tools'
  | 'write-tools'
  | 'read-machine'
  | 'write-machine'
  | 'network'
  | 'filesystem'

export interface ParameterSchema {
  type: 'number' | 'string' | 'boolean' | 'select' | 'color'
  label: string
  description?: string
  default?: any
  min?: number
  max?: number
  step?: number
  options?: { value: string; label: string }[]
  required?: boolean
}

export interface DesignLibrary {
  categories: DesignCategory[]
  featured: DesignAsset[]
  recent: DesignAsset[]
  popular: DesignAsset[]
}

export interface DesignCategory {
  id: string
  name: string
  icon: string
  count: number
  subcategories?: { id: string; name: string; count: number }[]
}

export interface AppLibrary {
  generators: GeneratorApp[]
  utilities: UtilityApp[]
  featured: (GeneratorApp | UtilityApp)[]
}

export interface InstalledApp {
  id: string
  marketplaceId: string
  name: string
  version: string
  installedAt: Date
  enabled: boolean
  
  entryPoint: string
  permissions: AppPermission[]
}

export interface UserPurchase {
  id: string
  itemId: string
  itemType: 'design' | 'generator' | 'utility' | 'pack'
  purchasedAt: Date
  price: number
  currency: string
}

export interface DesignPack extends MarketplaceItem {
  category: 'design'
  
  packType: 'collection' | 'bundle' | 'subscription'
  
  designIds: string[]
  designCount: number
  
  previewDesigns: DesignAsset[]
}

export const DESIGN_CATEGORIES: DesignCategory[] = [
  { id: 'animals', name: 'Animals', icon: '🐾', count: 0 },
  { id: 'nature', name: 'Nature', icon: '🌿', count: 0 },
  { id: 'holidays', name: 'Holidays', icon: '🎄', count: 0 },
  { id: 'signs', name: 'Signs & Text', icon: '📝', count: 0 },
  { id: 'patterns', name: 'Patterns', icon: '🔷', count: 0 },
  { id: 'borders', name: 'Borders & Frames', icon: '🖼️', count: 0 },
  { id: 'symbols', name: 'Symbols & Icons', icon: '⭐', count: 0 },
  { id: 'food', name: 'Food & Drink', icon: '🍕', count: 0 },
  { id: 'sports', name: 'Sports', icon: '⚽', count: 0 },
  { id: 'vehicles', name: 'Vehicles', icon: '🚗', count: 0 },
  { id: 'music', name: 'Music', icon: '🎵', count: 0 },
  { id: 'tools', name: 'Tools & Hardware', icon: '🔧', count: 0 },
  { id: 'geometric', name: 'Geometric', icon: '📐', count: 0 },
  { id: 'vintage', name: 'Vintage', icon: '📜', count: 0 },
  { id: 'modern', name: 'Modern', icon: '✨', count: 0 },
]

export const GENERATOR_TYPES = [
  { id: 'box', name: 'Box Makers', description: 'Create boxes with various joint types' },
  { id: 'puzzle', name: 'Puzzle Generators', description: 'Create jigsaw and interlocking puzzles' },
  { id: 'inlay', name: 'Inlay Tools', description: 'Create inlay and pocket designs' },
  { id: 'cabinet', name: 'Cabinet & Furniture', description: 'Furniture and cabinet components' },
  { id: 'sign', name: 'Sign Makers', description: 'Create signs with text and borders' },
  { id: 'custom', name: 'Other', description: 'Other specialized generators' },
]
