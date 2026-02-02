import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { 
  Search, 
  X, 
  Download,
  Star,
  Box,
  Puzzle,
  Layers,
  Type,
  Settings2,
  CheckCircle,
  ExternalLink,
  Lock,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMarketplaceStore } from '@/store/useMarketplaceStore'
import type { GeneratorApp, UtilityApp } from '@/types/marketplace'
import { GENERATOR_TYPES } from '@/types/marketplace'
import { ALL_APP_STUBS, COMING_SOON_APPS } from '@/lib/appStubs'

interface AppLibraryProps {
  onClose: () => void
  onLaunchApp?: (app: GeneratorApp | UtilityApp) => void
}

export function AppLibrary({ onClose, onLaunchApp }: AppLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'featured' | 'generators' | 'utilities' | 'installed'>('featured')
  
  const { 
    installedApps,
    installApp,
    uninstallApp,
    hasPurchased,
  } = useMarketplaceStore()

  const [apps] = useState<(GeneratorApp | UtilityApp)[]>(ALL_APP_STUBS)

  const filteredApps = apps.filter(app => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!app.name.toLowerCase().includes(query) && 
          !app.description.toLowerCase().includes(query)) {
        return false
      }
    }
    if (activeTab === 'generators' && app.category !== 'generator') return false
    if (activeTab === 'utilities' && app.category !== 'utility') return false
    if (selectedType && app.category === 'generator' && (app as GeneratorApp).generatorType !== selectedType) {
      return false
    }
    return true
  })

  const installedAppIds = installedApps.map(a => a.marketplaceId)
  const featuredApps = apps.filter(a => a.featured)

  const isInstalled = (appId: string) => installedAppIds.includes(appId)
  const isComingSoon = (appId: string) => COMING_SOON_APPS.includes(appId)

  const handleInstall = (app: GeneratorApp | UtilityApp) => {
    if (app.pricing.type === 'paid' && !hasPurchased(app.id)) {
      return
    }
    installApp(app)
  }

  const handleLaunch = (app: GeneratorApp | UtilityApp) => {
    if (onLaunchApp) {
      onLaunchApp(app)
    }
    onClose()
  }

  const getAppIcon = (app: GeneratorApp | UtilityApp) => {
    if (app.category === 'generator') {
      const genApp = app as GeneratorApp
      switch (genApp.generatorType) {
        case 'box': return <Box className="w-6 h-6" />
        case 'puzzle': return <Puzzle className="w-6 h-6" />
        case 'inlay': return <Layers className="w-6 h-6" />
        case 'sign': return <Type className="w-6 h-6" />
        default: return <Settings2 className="w-6 h-6" />
      }
    }
    return <Settings2 className="w-6 h-6" />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">App Library</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-border p-3 flex flex-col gap-1 overflow-y-auto">
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                activeTab === 'featured' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
              onClick={() => { setActiveTab('featured'); setSelectedType(null) }}
            >
              <Sparkles className="w-4 h-4" />
              Featured
            </button>
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                activeTab === 'generators' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
              onClick={() => { setActiveTab('generators'); setSelectedType(null) }}
            >
              <Box className="w-4 h-4" />
              Generators
            </button>
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                activeTab === 'utilities' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
              onClick={() => { setActiveTab('utilities'); setSelectedType(null) }}
            >
              <Settings2 className="w-4 h-4" />
              Utilities
            </button>
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                activeTab === 'installed' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
              onClick={() => { setActiveTab('installed'); setSelectedType(null) }}
            >
              <CheckCircle className="w-4 h-4" />
              Installed
              {installedApps.length > 0 && (
                <span className="ml-auto text-xs bg-muted px-1.5 rounded">{installedApps.length}</span>
              )}
            </button>
            
            {activeTab === 'generators' && (
              <>
                <div className="h-px bg-border my-2" />
                <div className="text-xs font-medium text-muted-foreground px-3 py-1">Types</div>
                {GENERATOR_TYPES.map(type => (
                  <button
                    key={type.id}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors',
                      selectedType === type.id ? 'bg-accent' : 'hover:bg-accent/50'
                    )}
                    onClick={() => setSelectedType(type.id)}
                  >
                    {type.name}
                  </button>
                ))}
              </>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'featured' && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    Featured Apps
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {featuredApps.map(app => (
                      <AppCard 
                        key={app.id}
                        app={app}
                        icon={getAppIcon(app)}
                        isInstalled={isInstalled(app.id)}
                        isComingSoon={isComingSoon(app.id)}
                        hasPurchased={hasPurchased(app.id)}
                        onInstall={() => handleInstall(app)}
                        onUninstall={() => uninstallApp(app.id)}
                        onLaunch={() => handleLaunch(app)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'installed' && (
                <div className="grid grid-cols-2 gap-4">
                  {installedApps.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      No apps installed yet. Browse the library to find useful tools.
                    </div>
                  ) : (
                    installedApps.map(installed => {
                      const app = apps.find(a => a.id === installed.marketplaceId)
                      if (!app) return null
                      return (
                        <AppCard 
                          key={installed.id}
                          app={app}
                          icon={getAppIcon(app)}
                          isInstalled={true}
                          hasPurchased={true}
                          onInstall={() => {}}
                          onUninstall={() => uninstallApp(installed.id)}
                          onLaunch={() => handleLaunch(app)}
                        />
                      )
                    })
                  )}
                </div>
              )}

              {(activeTab === 'generators' || activeTab === 'utilities') && (
                <div className="grid grid-cols-2 gap-4">
                  {filteredApps.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-muted-foreground">
                      No apps found matching your search.
                    </div>
                  ) : (
                    filteredApps.map(app => (
                      <AppCard 
                        key={app.id}
                        app={app}
                        icon={getAppIcon(app)}
                        isInstalled={isInstalled(app.id)}
                        isComingSoon={isComingSoon(app.id)}
                        hasPurchased={hasPurchased(app.id)}
                        onInstall={() => handleInstall(app)}
                        onUninstall={() => uninstallApp(app.id)}
                        onLaunch={() => handleLaunch(app)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AppCardProps {
  app: GeneratorApp | UtilityApp
  icon: React.ReactNode
  isInstalled: boolean
  isComingSoon?: boolean
  hasPurchased: boolean
  onInstall: () => void
  onUninstall: () => void
  onLaunch: () => void
}

function AppCard({ app, icon, isInstalled, isComingSoon = false, hasPurchased, onInstall, onUninstall, onLaunch }: AppCardProps) {
  const isPaid = app.pricing.type === 'paid'
  const canAccess = !isPaid || hasPurchased

  return (
    <div className={cn(
      "border border-border rounded-lg p-4 transition-colors",
      isComingSoon ? "opacity-75" : "hover:border-primary/50"
    )}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium truncate">{app.name}</h4>
            {isComingSoon && (
              <span className="text-[10px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                Coming Soon
              </span>
            )}
            {app.verified && !isComingSoon && (
              <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {app.description}
          </p>
          
          {!isComingSoon && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                {app.rating.toFixed(1)}
              </span>
              <span>{app.downloads.toLocaleString()} downloads</span>
              {isPaid && !hasPurchased && (
                <span className="text-amber-500 font-medium">${app.pricing.price}</span>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-3">
        {isComingSoon ? (
          <Button size="sm" className="flex-1" variant="outline" disabled>
            <Sparkles className="w-3 h-3 mr-1" />
            Coming Soon
          </Button>
        ) : isInstalled ? (
          <>
            <Button size="sm" className="flex-1" onClick={onLaunch}>
              <ExternalLink className="w-3 h-3 mr-1" />
              Launch
            </Button>
            <Button size="sm" variant="outline" onClick={onUninstall}>
              Uninstall
            </Button>
          </>
        ) : canAccess ? (
          <Button size="sm" className="flex-1" onClick={onInstall}>
            <Download className="w-3 h-3 mr-1" />
            Install
          </Button>
        ) : (
          <Button size="sm" className="flex-1" variant="outline">
            <Lock className="w-3 h-3 mr-1" />
            Purchase - ${app.pricing.price}
          </Button>
        )}
      </div>
    </div>
  )
}

export default AppLibrary
