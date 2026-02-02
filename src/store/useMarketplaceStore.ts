import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { 
  DesignAsset, 
  GeneratorApp, 
  UtilityApp, 
  InstalledApp,
  UserPurchase,
  DesignCategory,
  DESIGN_CATEGORIES,
} from '@/types/marketplace'

interface MarketplaceState {
  installedApps: InstalledApp[]
  purchases: UserPurchase[]
  favorites: string[]
  recentlyViewed: string[]
  
  designCache: Map<string, DesignAsset>
  appCache: Map<string, GeneratorApp | UtilityApp>
  
  isLoading: boolean
  error: string | null
  
  installApp: (app: GeneratorApp | UtilityApp) => void
  uninstallApp: (appId: string) => void
  enableApp: (appId: string, enabled: boolean) => void
  
  addPurchase: (purchase: UserPurchase) => void
  hasPurchased: (itemId: string) => boolean
  
  addFavorite: (itemId: string) => void
  removeFavorite: (itemId: string) => void
  isFavorite: (itemId: string) => boolean
  
  addRecentlyViewed: (itemId: string) => void
  
  cacheDesign: (design: DesignAsset) => void
  getCachedDesign: (id: string) => DesignAsset | undefined
  
  cacheApp: (app: GeneratorApp | UtilityApp) => void
  getCachedApp: (id: string) => GeneratorApp | UtilityApp | undefined
  
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set, get) => ({
      installedApps: [],
      purchases: [],
      favorites: [],
      recentlyViewed: [],
      designCache: new Map(),
      appCache: new Map(),
      isLoading: false,
      error: null,

      installApp: (app) => {
        const installed: InstalledApp = {
          id: crypto.randomUUID(),
          marketplaceId: app.id,
          name: app.name,
          version: app.version,
          installedAt: new Date(),
          enabled: true,
          entryPoint: app.entryPoint,
          permissions: app.permissions,
        }
        
        set(state => ({
          installedApps: [...state.installedApps, installed]
        }))
      },

      uninstallApp: (appId) => {
        set(state => ({
          installedApps: state.installedApps.filter(a => a.id !== appId)
        }))
      },

      enableApp: (appId, enabled) => {
        set(state => ({
          installedApps: state.installedApps.map(a => 
            a.id === appId ? { ...a, enabled } : a
          )
        }))
      },

      addPurchase: (purchase) => {
        set(state => ({
          purchases: [...state.purchases, purchase]
        }))
      },

      hasPurchased: (itemId) => {
        return get().purchases.some(p => p.itemId === itemId)
      },

      addFavorite: (itemId) => {
        set(state => ({
          favorites: [...new Set([...state.favorites, itemId])]
        }))
      },

      removeFavorite: (itemId) => {
        set(state => ({
          favorites: state.favorites.filter(id => id !== itemId)
        }))
      },

      isFavorite: (itemId) => {
        return get().favorites.includes(itemId)
      },

      addRecentlyViewed: (itemId) => {
        set(state => {
          const filtered = state.recentlyViewed.filter(id => id !== itemId)
          return {
            recentlyViewed: [itemId, ...filtered].slice(0, 50)
          }
        })
      },

      cacheDesign: (design) => {
        const cache = new Map(get().designCache)
        cache.set(design.id, design)
        set({ designCache: cache })
      },

      getCachedDesign: (id) => {
        return get().designCache.get(id)
      },

      cacheApp: (app) => {
        const cache = new Map(get().appCache)
        cache.set(app.id, app)
        set({ appCache: cache })
      },

      getCachedApp: (id) => {
        return get().appCache.get(id)
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'carv-marketplace-store',
      partialize: (state) => ({
        installedApps: state.installedApps,
        purchases: state.purchases,
        favorites: state.favorites,
        recentlyViewed: state.recentlyViewed,
      }),
    }
  )
)

export async function fetchDesignLibrary(category?: string, search?: string): Promise<DesignAsset[]> {
  return []
}

export async function fetchAppLibrary(type?: 'generator' | 'utility'): Promise<(GeneratorApp | UtilityApp)[]> {
  return []
}

export async function fetchDesignById(id: string): Promise<DesignAsset | null> {
  return null
}

export async function fetchAppById(id: string): Promise<GeneratorApp | UtilityApp | null> {
  return null
}

export async function downloadDesign(design: DesignAsset): Promise<string> {
  return design.fileUrl
}

export function canAccessItem(item: { pricing: { type: string } }, hasPurchased: boolean): boolean {
  if (item.pricing.type === 'free') return true
  if (item.pricing.type === 'freemium') return true
  return hasPurchased
}
