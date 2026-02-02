import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { 
  Search, 
  X, 
  Heart, 
  Download, 
  Star,
  Grid3X3,
  List,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMarketplaceStore } from '@/store/useMarketplaceStore'
import type { DesignAsset } from '@/types/marketplace'
import { DESIGN_CATEGORIES } from '@/types/marketplace'

interface DesignLibraryProps {
  onClose: () => void
  onInsert?: (design: DesignAsset) => void
}

export function DesignLibrary({ onClose, onInsert }: DesignLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'featured' | 'categories' | 'favorites'>('featured')
  
  const { 
    favorites, 
    addFavorite, 
    removeFavorite, 
    isFavorite,
    hasPurchased,
    addRecentlyViewed,
  } = useMarketplaceStore()

  const [designs] = useState<DesignAsset[]>(SAMPLE_DESIGNS)

  const filteredDesigns = designs.filter(design => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (!design.name.toLowerCase().includes(query) && 
          !design.tags.some(t => t.toLowerCase().includes(query))) {
        return false
      }
    }
    if (selectedCategory && design.subcategory !== selectedCategory) {
      return false
    }
    if (activeTab === 'favorites' && !isFavorite(design.id)) {
      return false
    }
    return true
  })

  const featuredDesigns = designs.filter(d => d.featured)
  const freeDesigns = designs.filter(d => d.pricing.type === 'free')

  const handleInsertDesign = async (design: DesignAsset) => {
    addRecentlyViewed(design.id)
    
    if (design.pricing.type === 'paid' && !hasPurchased(design.id)) {
      return
    }

    if (onInsert) {
      onInsert(design)
    }
    
    onClose()
  }

  const toggleFavorite = (designId: string) => {
    if (isFavorite(designId)) {
      removeFavorite(designId)
    } else {
      addFavorite(designId)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-[900px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Design Library</h2>
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
              onClick={() => { setActiveTab('featured'); setSelectedCategory(null) }}
            >
              <Sparkles className="w-4 h-4" />
              Featured
            </button>
            <button
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors',
                activeTab === 'favorites' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
              onClick={() => { setActiveTab('favorites'); setSelectedCategory(null) }}
            >
              <Heart className="w-4 h-4" />
              Favorites
              {favorites.length > 0 && (
                <span className="ml-auto text-xs bg-muted px-1.5 rounded">{favorites.length}</span>
              )}
            </button>
            
            <div className="h-px bg-border my-2" />
            
            <div className="text-xs font-medium text-muted-foreground px-3 py-1">Categories</div>
            
            {DESIGN_CATEGORIES.map(category => (
              <button
                key={category.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-left transition-colors',
                  selectedCategory === category.id ? 'bg-accent' : 'hover:bg-accent/50'
                )}
                onClick={() => { setActiveTab('categories'); setSelectedCategory(category.id) }}
              >
                <span>{category.icon}</span>
                <span className="flex-1">{category.name}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search designs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              
              <div className="flex items-center gap-1 border border-border rounded-md p-0.5">
                <button
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'grid' ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  className={cn(
                    'p-1.5 rounded transition-colors',
                    viewMode === 'list' ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'featured' && !selectedCategory && (
                <>
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Featured Designs
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {featuredDesigns.slice(0, 4).map(design => (
                        <DesignCard 
                          key={design.id} 
                          design={design}
                          isFavorite={isFavorite(design.id)}
                          hasPurchased={hasPurchased(design.id)}
                          onToggleFavorite={() => toggleFavorite(design.id)}
                          onInsert={() => handleInsertDesign(design)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Free Designs
                    </h3>
                    <div className="grid grid-cols-4 gap-3">
                      {freeDesigns.slice(0, 8).map(design => (
                        <DesignCard 
                          key={design.id} 
                          design={design}
                          isFavorite={isFavorite(design.id)}
                          hasPurchased={hasPurchased(design.id)}
                          onToggleFavorite={() => toggleFavorite(design.id)}
                          onInsert={() => handleInsertDesign(design)}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {(activeTab === 'categories' || activeTab === 'favorites' || selectedCategory) && (
                <div className={cn(
                  viewMode === 'grid' ? 'grid grid-cols-4 gap-3' : 'flex flex-col gap-2'
                )}>
                  {filteredDesigns.length === 0 ? (
                    <div className="col-span-4 text-center py-12 text-muted-foreground">
                      {activeTab === 'favorites' 
                        ? 'No favorites yet. Click the heart icon to save designs.'
                        : 'No designs found matching your search.'}
                    </div>
                  ) : (
                    filteredDesigns.map(design => (
                      viewMode === 'grid' ? (
                        <DesignCard 
                          key={design.id} 
                          design={design}
                          isFavorite={isFavorite(design.id)}
                          hasPurchased={hasPurchased(design.id)}
                          onToggleFavorite={() => toggleFavorite(design.id)}
                          onInsert={() => handleInsertDesign(design)}
                        />
                      ) : (
                        <DesignListItem
                          key={design.id}
                          design={design}
                          isFavorite={isFavorite(design.id)}
                          hasPurchased={hasPurchased(design.id)}
                          onToggleFavorite={() => toggleFavorite(design.id)}
                          onInsert={() => handleInsertDesign(design)}
                        />
                      )
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

interface DesignCardProps {
  design: DesignAsset
  isFavorite: boolean
  hasPurchased: boolean
  onToggleFavorite: () => void
  onInsert: () => void
}

function DesignCard({ design, isFavorite, hasPurchased, onToggleFavorite, onInsert }: DesignCardProps) {
  const isPaid = design.pricing.type === 'paid'
  const canAccess = !isPaid || hasPurchased

  return (
    <div className="group relative bg-muted/30 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors">
      <div className="aspect-square bg-muted flex items-center justify-center p-4">
        <div 
          className="w-full h-full bg-contain bg-center bg-no-repeat opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ backgroundImage: `url(${design.thumbnail})` }}
        />
        
        {isPaid && !hasPurchased && (
          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
            <Lock className="w-3 h-3" />
            ${design.pricing.price}
          </div>
        )}
        
        <button
          className={cn(
            'absolute top-2 right-2 p-1.5 rounded-full transition-all',
            isFavorite 
              ? 'bg-red-500 text-white' 
              : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
          )}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
        >
          <Heart className={cn('w-3 h-3', isFavorite && 'fill-current')} />
        </button>

        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button 
            size="sm" 
            onClick={onInsert}
            disabled={!canAccess}
          >
            {canAccess ? (
              <>
                <Download className="w-3 h-3 mr-1" />
                Insert
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mr-1" />
                Purchase
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="p-2">
        <div className="text-xs font-medium truncate">{design.name}</div>
        <div className="text-xs text-muted-foreground truncate">{design.author}</div>
      </div>
    </div>
  )
}

function DesignListItem({ design, isFavorite, hasPurchased, onToggleFavorite, onInsert }: DesignCardProps) {
  const isPaid = design.pricing.type === 'paid'
  const canAccess = !isPaid || hasPurchased

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/50 transition-colors">
      <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center">
        <div 
          className="w-full h-full bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${design.thumbnail})` }}
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{design.name}</div>
        <div className="text-xs text-muted-foreground">{design.author}</div>
      </div>
      
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
        {design.rating.toFixed(1)}
      </div>
      
      {isPaid && !hasPurchased && (
        <div className="text-xs font-medium text-amber-500">${design.pricing.price}</div>
      )}
      
      <button
        className={cn(
          'p-1.5 rounded transition-colors',
          isFavorite ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'
        )}
        onClick={onToggleFavorite}
      >
        <Heart className={cn('w-4 h-4', isFavorite && 'fill-current')} />
      </button>
      
      <Button size="sm" variant="outline" onClick={onInsert} disabled={!canAccess}>
        {canAccess ? 'Insert' : 'Purchase'}
      </Button>
    </div>
  )
}

const SAMPLE_DESIGNS: DesignAsset[] = [
  {
    id: '1',
    name: 'Mountain Landscape',
    description: 'Beautiful mountain silhouette design',
    author: 'Carv Community',
    version: '1.0',
    category: 'design',
    tags: ['nature', 'mountain', 'landscape', 'outdoor'],
    thumbnail: '/designs/mountain.svg',
    pricing: { type: 'free' },
    downloads: 1250,
    rating: 4.8,
    ratingCount: 89,
    createdAt: new Date(),
    updatedAt: new Date(),
    featured: true,
    designType: 'clipart',
    subcategory: 'nature',
    fileFormat: 'svg',
    fileUrl: '/designs/mountain.svg',
  },
  {
    id: '2',
    name: 'Geometric Wolf',
    description: 'Low-poly geometric wolf head',
    author: 'Carv Community',
    version: '1.0',
    category: 'design',
    tags: ['animal', 'wolf', 'geometric', 'modern'],
    thumbnail: '/designs/wolf.svg',
    pricing: { type: 'free' },
    downloads: 2100,
    rating: 4.9,
    ratingCount: 156,
    createdAt: new Date(),
    updatedAt: new Date(),
    featured: true,
    designType: 'clipart',
    subcategory: 'animals',
    fileFormat: 'svg',
    fileUrl: '/designs/wolf.svg',
  },
  {
    id: '3',
    name: 'Celtic Knot Border',
    description: 'Traditional Celtic knot pattern',
    author: 'Carv Community',
    version: '1.0',
    category: 'design',
    tags: ['celtic', 'border', 'pattern', 'traditional'],
    thumbnail: '/designs/celtic.svg',
    pricing: { type: 'free' },
    downloads: 890,
    rating: 4.7,
    ratingCount: 67,
    createdAt: new Date(),
    updatedAt: new Date(),
    featured: false,
    designType: 'pattern',
    subcategory: 'patterns',
    fileFormat: 'svg',
    fileUrl: '/designs/celtic.svg',
  },
  {
    id: '4',
    name: 'Christmas Ornament Set',
    description: 'Collection of 12 holiday ornament designs',
    author: 'Premium Designs',
    version: '1.0',
    category: 'design',
    tags: ['christmas', 'holiday', 'ornament', 'seasonal'],
    thumbnail: '/designs/christmas.svg',
    pricing: { type: 'paid', price: 4.99, currency: 'USD' },
    downloads: 450,
    rating: 4.9,
    ratingCount: 34,
    createdAt: new Date(),
    updatedAt: new Date(),
    featured: true,
    designType: 'clipart',
    subcategory: 'holidays',
    fileFormat: 'svg',
    fileUrl: '/designs/christmas.svg',
  },
  {
    id: '5',
    name: 'Workshop Sign Template',
    description: 'Customizable workshop sign with tool icons',
    author: 'Carv Community',
    version: '1.0',
    category: 'design',
    tags: ['sign', 'workshop', 'tools', 'text'],
    thumbnail: '/designs/workshop.svg',
    pricing: { type: 'free' },
    downloads: 1800,
    rating: 4.6,
    ratingCount: 112,
    createdAt: new Date(),
    updatedAt: new Date(),
    featured: false,
    designType: 'template',
    subcategory: 'signs',
    fileFormat: 'svg',
    fileUrl: '/designs/workshop.svg',
  },
  {
    id: '6',
    name: 'Mandala Collection',
    description: '8 intricate mandala designs for v-carving',
    author: 'Premium Designs',
    version: '1.0',
    category: 'design',
    tags: ['mandala', 'intricate', 'vcarve', 'decorative'],
    thumbnail: '/designs/mandala.svg',
    pricing: { type: 'paid', price: 6.99, currency: 'USD' },
    downloads: 320,
    rating: 5.0,
    ratingCount: 28,
    createdAt: new Date(),
    updatedAt: new Date(),
    featured: true,
    designType: 'clipart',
    subcategory: 'patterns',
    fileFormat: 'svg',
    fileUrl: '/designs/mandala.svg',
  },
]

export default DesignLibrary
