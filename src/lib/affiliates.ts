export interface AffiliateLink {
  id: string
  name: string
  url: string
  category: 'bits' | 'wood' | 'accessories' | 'machines' | 'finishing'
  description?: string
  logo?: string
}

export interface BitAffiliate {
  manufacturer: string
  productUrl: string
  affiliateTag?: string
  priceRange?: string
}

export const BIT_AFFILIATES: Record<string, BitAffiliate[]> = {
  'end-mill': [
    {
      manufacturer: 'Amana Tool',
      productUrl: 'https://www.amanatool.com/end-mills',
      priceRange: '$15-80',
    },
    {
      manufacturer: 'Whiteside',
      productUrl: 'https://www.whitesiderouterbits.com/collections/cnc-router-bits',
      priceRange: '$20-60',
    },
    {
      manufacturer: 'SpeTool',
      productUrl: 'https://www.amazon.com/stores/SpeTool/page/12345',
      priceRange: '$8-25',
    },
    {
      manufacturer: 'Yonico',
      productUrl: 'https://www.amazon.com/stores/Yonico/page/12345',
      priceRange: '$10-30',
    },
  ],
  'v-bit': [
    {
      manufacturer: 'Amana Tool',
      productUrl: 'https://www.amanatool.com/v-groove-bits',
      priceRange: '$20-90',
    },
    {
      manufacturer: 'Whiteside',
      productUrl: 'https://www.whitesiderouterbits.com/collections/v-groove-bits',
      priceRange: '$25-70',
    },
    {
      manufacturer: 'SpeTool',
      productUrl: 'https://www.amazon.com/s?k=spetool+v+bit',
      priceRange: '$12-35',
    },
  ],
  'ball-nose': [
    {
      manufacturer: 'Amana Tool',
      productUrl: 'https://www.amanatool.com/ball-nose-bits',
      priceRange: '$25-100',
    },
    {
      manufacturer: 'Whiteside',
      productUrl: 'https://www.whitesiderouterbits.com/collections/ball-nose',
      priceRange: '$30-80',
    },
  ],
  'drill': [
    {
      manufacturer: 'Amana Tool',
      productUrl: 'https://www.amanatool.com/drill-bits',
      priceRange: '$10-40',
    },
  ],
}

export const WOOD_SUPPLIERS: AffiliateLink[] = [
  {
    id: 'ocooch',
    name: 'Ocooch Hardwoods',
    url: 'https://ocoochhardwoods.com',
    category: 'wood',
    description: 'Premium domestic and exotic hardwoods, great for CNC projects',
  },
  {
    id: 'bell-forest',
    name: 'Bell Forest Products',
    url: 'https://www.bellforestproducts.com',
    category: 'wood',
    description: 'Wide selection of domestic and exotic lumber',
  },
  {
    id: 'woodcraft',
    name: 'Woodcraft',
    url: 'https://www.woodcraft.com',
    category: 'wood',
    description: 'Lumber, project wood, and woodworking supplies',
  },
  {
    id: 'rockler',
    name: 'Rockler',
    url: 'https://www.rockler.com',
    category: 'wood',
    description: 'Hardwood lumber and woodworking hardware',
  },
]

export const ACCESSORY_SUPPLIERS: AffiliateLink[] = [
  {
    id: 'pwncnc',
    name: 'PwnCNC',
    url: 'https://pwncnc.com',
    category: 'accessories',
    description: 'Dust boots, laser modules, and CNC upgrades',
  },
  {
    id: 'inventables',
    name: 'Inventables',
    url: 'https://www.inventables.com',
    category: 'accessories',
    description: 'CNC accessories, materials, and bits',
  },
  {
    id: 'carbide3d',
    name: 'Carbide 3D',
    url: 'https://shop.carbide3d.com',
    category: 'accessories',
    description: 'BitSetter, BitZero, and Shapeoko accessories',
  },
]

export const FINISHING_SUPPLIERS: AffiliateLink[] = [
  {
    id: 'odies-oil',
    name: "Odie's Oil",
    url: 'https://odiesoil.com',
    category: 'finishing',
    description: 'Premium wood finish, food-safe and easy to apply',
  },
  {
    id: 'rubio-monocoat',
    name: 'Rubio Monocoat',
    url: 'https://www.rubiomonocoatusa.com',
    category: 'finishing',
    description: 'One-coat oil finish with hardwax protection',
  },
  {
    id: 'general-finishes',
    name: 'General Finishes',
    url: 'https://generalfinishes.com',
    category: 'finishing',
    description: 'Water-based finishes, stains, and topcoats',
  },
]

export function getAffiliatesForToolType(toolType: string): BitAffiliate[] {
  return BIT_AFFILIATES[toolType] || BIT_AFFILIATES['end-mill'] || []
}

export function buildAffiliateUrl(baseUrl: string, affiliateTag?: string): string {
  if (!affiliateTag) return baseUrl
  
  const url = new URL(baseUrl)
  if (baseUrl.includes('amazon.com')) {
    url.searchParams.set('tag', affiliateTag)
  }
  return url.toString()
}

export function getAllSuppliers(): AffiliateLink[] {
  return [
    ...WOOD_SUPPLIERS,
    ...ACCESSORY_SUPPLIERS,
    ...FINISHING_SUPPLIERS,
  ]
}

export function getSuppliersByCategory(category: AffiliateLink['category']): AffiliateLink[] {
  return getAllSuppliers().filter(s => s.category === category)
}
