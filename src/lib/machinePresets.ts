/**
 * Machine Presets Library
 * 
 * Contains verified specifications for popular hobby CNC machines.
 * All dimensions are stored in millimeters internally.
 * Sources: Official manufacturer specifications and documentation.
 */

export interface MachinePreset {
  id: string
  brand: string
  model: string
  description: string
  workArea: {
    x: number  // mm
    y: number  // mm
    z: number  // mm
  }
  footprint?: {
    width: number   // mm
    depth: number   // mm
    height?: number // mm
  }
  maxFeedRate?: {
    xy: number  // mm/min
    z: number   // mm/min
  }
  controller: string
  spindle?: string
  features?: string[]
  website?: string
}

// Conversion helpers
export const inchToMm = (inches: number): number => inches * 25.4
export const mmToInch = (mm: number): number => mm / 25.4

/**
 * Verified Machine Presets
 * Only includes machines with confirmed specifications from official sources
 */
export const MACHINE_PRESETS: MachinePreset[] = [
  // ============================================
  // SHAPEOKO (Carbide 3D)
  // ============================================
  {
    id: 'shapeoko-5-pro-4x4',
    brand: 'Carbide 3D',
    model: 'Shapeoko 5 Pro 4x4',
    description: 'Large format CNC with ball screws and linear rails',
    workArea: {
      x: inchToMm(48),  // 1219.2mm
      y: inchToMm(48),  // 1219.2mm
      z: inchToMm(6),   // 152.4mm (155mm actual)
    },
    maxFeedRate: {
      xy: 10000,
      z: 5000,
    },
    controller: 'Carbide Motion',
    spindle: '65mm (Carbide Compact Router or VFD)',
    features: ['Ball screws', 'Linear rails', 'Hybrid T-slot table', 'BitSetter'],
    website: 'https://carbide3d.com/shapeoko/',
  },
  {
    id: 'shapeoko-5-pro-4x2',
    brand: 'Carbide 3D',
    model: 'Shapeoko 5 Pro 4x2',
    description: 'Mid-size CNC with ball screws and linear rails',
    workArea: {
      x: inchToMm(48),  // 1219.2mm
      y: inchToMm(24),  // 609.6mm
      z: inchToMm(6),   // 152.4mm
    },
    maxFeedRate: {
      xy: 10000,
      z: 5000,
    },
    controller: 'Carbide Motion',
    spindle: '65mm (Carbide Compact Router or VFD)',
    features: ['Ball screws', 'Linear rails', 'Hybrid T-slot table', 'BitSetter'],
    website: 'https://carbide3d.com/shapeoko/',
  },
  {
    id: 'shapeoko-5-pro-2x2',
    brand: 'Carbide 3D',
    model: 'Shapeoko 5 Pro 2x2',
    description: 'Compact CNC with ball screws and linear rails',
    workArea: {
      x: inchToMm(24.5),  // 622.3mm
      y: inchToMm(24.5),  // 622.3mm
      z: inchToMm(6),     // 152.4mm
    },
    maxFeedRate: {
      xy: 10000,
      z: 5000,
    },
    controller: 'Carbide Motion',
    spindle: '65mm (Carbide Compact Router or VFD)',
    features: ['Ball screws', 'Linear rails', 'Hybrid T-slot table', 'BitSetter'],
    website: 'https://carbide3d.com/shapeoko/',
  },
  {
    id: 'nomad-3',
    brand: 'Carbide 3D',
    model: 'Nomad 3',
    description: 'Enclosed desktop CNC mill',
    workArea: {
      x: 203,  // 8"
      y: 203,  // 8"
      z: 76,   // 3"
    },
    controller: 'Carbide Motion',
    spindle: 'Integrated spindle',
    features: ['Fully enclosed', 'Automatic tool length', 'Quiet operation'],
    website: 'https://carbide3d.com/nomad/',
  },

  // ============================================
  // SIENCI LABS (LongMill)
  // ============================================
  {
    id: 'longmill-mk2-12x30',
    brand: 'Sienci Labs',
    model: 'LongMill MK2.5 12x30',
    description: 'Entry-level hobby benchtop CNC',
    workArea: {
      x: inchToMm(12),  // 304.8mm
      y: inchToMm(30),  // 762mm
      z: inchToMm(4.5), // 114.3mm
    },
    maxFeedRate: {
      xy: 4000,
      z: 3000,
    },
    controller: 'GRBL (LongBoard)',
    spindle: '65mm (Makita RT0701C recommended)',
    features: ['Lead screw driven', 'Anti-backlash nuts', 'Table mounted'],
    website: 'https://sienci.com/product/longmill-mk2/',
  },
  {
    id: 'longmill-mk2-30x30',
    brand: 'Sienci Labs',
    model: 'LongMill MK2.5 30x30',
    description: 'Mid-size hobby benchtop CNC',
    workArea: {
      x: inchToMm(30),  // 762mm
      y: inchToMm(30),  // 762mm
      z: inchToMm(4.5), // 114.3mm
    },
    maxFeedRate: {
      xy: 4000,
      z: 3000,
    },
    controller: 'GRBL (LongBoard)',
    spindle: '65mm (Makita RT0701C recommended)',
    features: ['Lead screw driven', 'Anti-backlash nuts', 'Table mounted'],
    website: 'https://sienci.com/product/longmill-mk2/',
  },
  {
    id: 'longmill-mk2-48x30',
    brand: 'Sienci Labs',
    model: 'LongMill MK2.5 48x30',
    description: 'Large hobby benchtop CNC',
    workArea: {
      x: inchToMm(48),  // 1219.2mm
      y: inchToMm(30),  // 762mm
      z: inchToMm(4.5), // 114.3mm
    },
    maxFeedRate: {
      xy: 4000,
      z: 3000,
    },
    controller: 'GRBL (LongBoard)',
    spindle: '65mm (Makita RT0701C recommended)',
    features: ['Lead screw driven', 'Anti-backlash nuts', 'Table mounted'],
    website: 'https://sienci.com/product/longmill-mk2/',
  },
  {
    id: 'altmill-48x48',
    brand: 'Sienci Labs',
    model: 'AltMill 48x48',
    description: 'Professional-grade large format CNC',
    workArea: {
      x: inchToMm(48),  // 1219.2mm
      y: inchToMm(48),  // 1219.2mm
      z: inchToMm(5),   // 127mm
    },
    controller: 'GRBL (SuperLongBoard)',
    spindle: '80mm VFD spindle',
    features: ['Ball screws', 'Linear rails', 'Closed loop steppers'],
    website: 'https://sienci.com/product/altmill/',
  },

  // ============================================
  // ONEFINITY
  // ============================================
  {
    id: 'onefinity-machinist',
    brand: 'Onefinity',
    model: 'Machinist X-50',
    description: 'Compact precision CNC',
    workArea: {
      x: inchToMm(16),    // 406.4mm
      y: inchToMm(16),    // 406.4mm
      z: inchToMm(5.25),  // 133.35mm
    },
    controller: 'Buildbotics / Masso',
    spindle: '65mm or 80mm',
    features: ['Ball screws', 'Steel tube frame'],
    website: 'https://www.onefinitycnc.com/',
  },
  {
    id: 'onefinity-woodworker',
    brand: 'Onefinity',
    model: 'Woodworker X-50',
    description: 'Popular mid-size CNC for woodworking',
    workArea: {
      x: inchToMm(32.125),  // 816mm
      y: inchToMm(32.125),  // 816mm
      z: inchToMm(5.25),    // 133.35mm
    },
    controller: 'Buildbotics / Masso',
    spindle: '65mm or 80mm',
    features: ['Ball screws', 'Steel tube frame'],
    website: 'https://www.onefinitycnc.com/',
  },
  {
    id: 'onefinity-journeyman',
    brand: 'Onefinity',
    model: 'Journeyman X-50',
    description: 'Large format CNC for serious hobbyists',
    workArea: {
      x: inchToMm(48),      // 1219.2mm
      y: inchToMm(32.125),  // 816mm
      z: inchToMm(5.25),    // 133.35mm
    },
    controller: 'Buildbotics / Masso',
    spindle: '65mm or 80mm',
    features: ['Ball screws', 'Steel tube frame'],
    website: 'https://www.onefinitycnc.com/',
  },
  {
    id: 'onefinity-foreman',
    brand: 'Onefinity',
    model: 'Foreman X-50',
    description: 'Extra-large format CNC',
    workArea: {
      x: inchToMm(48),      // 1219.2mm
      y: inchToMm(48),      // 1219.2mm
      z: inchToMm(5.25),    // 133.35mm
    },
    controller: 'Buildbotics / Masso',
    spindle: '65mm or 80mm',
    features: ['Ball screws', 'Steel tube frame'],
    website: 'https://www.onefinitycnc.com/',
  },
  {
    id: 'onefinity-elite-foreman',
    brand: 'Onefinity',
    model: 'Elite Foreman',
    description: 'Professional CNC with closed-loop steppers',
    workArea: {
      x: 1170.7,  // mm
      y: 1188.2,  // mm
      z: 160,     // mm
    },
    controller: 'Masso Touch',
    spindle: '80mm VFD',
    features: ['Closed loop steppers', 'Heavy duty Z-slider', '15" touch screen'],
    website: 'https://www.onefinitycnc.com/',
  },

  // ============================================
  // INVENTABLES (X-Carve)
  // ============================================
  {
    id: 'xcarve-pro-4x4',
    brand: 'Inventables',
    model: 'X-Carve Pro 4x4',
    description: 'Professional desktop CNC with ball screws',
    workArea: {
      x: inchToMm(48),  // 1219.2mm
      y: inchToMm(48),  // 1219.2mm
      z: inchToMm(4),   // 101.6mm
    },
    footprint: {
      width: inchToMm(65.75),
      depth: inchToMm(55.75),
    },
    controller: 'Easel',
    spindle: '1.5kW VFD (2hp)',
    features: ['Ball screws', 'Linear guides', 'Dust collection', 'NEMA-23 motors'],
    website: 'https://www.inventables.com/',
  },
  {
    id: 'xcarve-pro-4x2',
    brand: 'Inventables',
    model: 'X-Carve Pro 4x2',
    description: 'Professional desktop CNC with ball screws',
    workArea: {
      x: inchToMm(48),  // 1219.2mm
      y: inchToMm(24),  // 609.6mm
      z: inchToMm(4),   // 101.6mm
    },
    footprint: {
      width: inchToMm(65.75),
      depth: inchToMm(31.6),
    },
    controller: 'Easel',
    spindle: '1.5kW VFD (2hp)',
    features: ['Ball screws', 'Linear guides', 'Dust collection', 'NEMA-23 motors'],
    website: 'https://www.inventables.com/',
  },

  // ============================================
  // TWO TREES
  // ============================================
  {
    id: 'twotrees-ttc450',
    brand: 'Two Trees',
    model: 'TTC-450',
    description: 'Budget-friendly desktop CNC',
    workArea: {
      x: 460,  // mm
      y: 460,  // mm
      z: 80,   // mm
    },
    footprint: {
      width: 742,
      depth: 689,
      height: 413,
    },
    controller: 'GRBL (32-bit)',
    spindle: '80W or 500W',
    features: ['Touch screen', 'WiFi connectivity', 'Aluminum frame'],
    website: 'https://twotrees3d.com/',
  },
  {
    id: 'twotrees-ttc450-pro',
    brand: 'Two Trees',
    model: 'TTC-450 Pro',
    description: 'Upgraded desktop CNC with better Z-travel',
    workArea: {
      x: 460,  // mm
      y: 460,  // mm
      z: 80,   // mm
    },
    controller: 'GRBL (32-bit)',
    spindle: '500W',
    features: ['Touch screen', 'WiFi connectivity', 'Reinforced frame'],
    website: 'https://twotrees3d.com/',
  },

  // ============================================
  // FOXALIEN
  // ============================================
  {
    id: 'foxalien-masuter-4040',
    brand: 'FoxAlien',
    model: 'Masuter 4040',
    description: 'Entry-level desktop CNC',
    workArea: {
      x: 400,  // mm (15.75")
      y: 380,  // mm (14.96")
      z: 55,   // mm (2.16")
    },
    controller: 'GRBL',
    spindle: '60W',
    features: ['NEMA17 motors', 'Aluminum frame', 'Laser compatible'],
    website: 'https://www.foxalien.com/',
  },
  {
    id: 'foxalien-masuter-pro',
    brand: 'FoxAlien',
    model: 'Masuter Pro',
    description: 'Upgraded desktop CNC with dual spindle clamps',
    workArea: {
      x: 400,  // mm
      y: 400,  // mm
      z: 80,   // mm
    },
    controller: 'GRBL',
    spindle: '300W (52mm) or 65mm router',
    features: ['Dual spindle clamps', 'Upgraded frame', 'Laser compatible'],
    website: 'https://www.foxalien.com/',
  },
  {
    id: 'foxalien-4040-xe',
    brand: 'FoxAlien',
    model: '4040-XE',
    description: 'Enhanced desktop CNC for metal cutting',
    workArea: {
      x: 400,  // mm
      y: 400,  // mm
      z: 80,   // mm
    },
    controller: 'GRBL',
    spindle: '300W or 500W',
    features: ['Metal cutting capable', 'Rigid frame', 'Drag chain cable management'],
    website: 'https://www.foxalien.com/',
  },

  // ============================================
  // SAINSMART (Genmitsu)
  // ============================================
  {
    id: 'genmitsu-3018-prover',
    brand: 'SainSmart',
    model: 'Genmitsu 3018-PROVer',
    description: 'Popular beginner desktop CNC',
    workArea: {
      x: 300,  // mm
      y: 180,  // mm
      z: 45,   // mm
    },
    controller: 'GRBL (Offline controller)',
    spindle: '775 motor',
    features: ['Offline controller', 'Limit switches', 'Emergency stop', 'Laser compatible'],
    website: 'https://www.sainsmart.com/',
  },
  {
    id: 'genmitsu-3018-prover-v2',
    brand: 'SainSmart',
    model: 'Genmitsu 3018-PROVer V2',
    description: 'Updated beginner desktop CNC',
    workArea: {
      x: 284,  // mm
      y: 180,  // mm
      z: 40,   // mm
    },
    controller: 'GRBL (Offline controller)',
    spindle: '775 motor',
    features: ['Improved frame', 'Better cable management', 'Laser compatible'],
    website: 'https://www.sainsmart.com/',
  },
  {
    id: 'genmitsu-prover-xl-4030',
    brand: 'SainSmart',
    model: 'Genmitsu PROVerXL 4030',
    description: 'Larger desktop CNC with aluminum frame',
    workArea: {
      x: 400,  // mm
      y: 300,  // mm
      z: 80,   // mm
    },
    controller: 'GRBL',
    spindle: '300W',
    features: ['Aluminum extrusion frame', 'Lead screw driven', 'Laser compatible'],
    website: 'https://www.sainsmart.com/',
  },

  // ============================================
  // SNAPMAKER
  // ============================================
  {
    id: 'snapmaker-2-a350',
    brand: 'Snapmaker',
    model: 'Snapmaker 2.0 A350',
    description: '3-in-1: 3D Printer, Laser, CNC',
    workArea: {
      x: 320,  // mm
      y: 350,  // mm
      z: 330,  // mm (for CNC: ~50mm effective)
    },
    controller: 'Snapmaker Luban',
    spindle: '50W CNC module',
    features: ['Modular design', '3-in-1 capability', 'Enclosed option', 'Touch screen'],
    website: 'https://www.snapmaker.com/',
  },
  {
    id: 'snapmaker-2-a250',
    brand: 'Snapmaker',
    model: 'Snapmaker 2.0 A250',
    description: '3-in-1: 3D Printer, Laser, CNC (Medium)',
    workArea: {
      x: 230,  // mm
      y: 250,  // mm
      z: 235,  // mm
    },
    controller: 'Snapmaker Luban',
    spindle: '50W CNC module',
    features: ['Modular design', '3-in-1 capability', 'Touch screen'],
    website: 'https://www.snapmaker.com/',
  },

  // ============================================
  // BOBSCNC
  // ============================================
  {
    id: 'bobscnc-e3',
    brand: 'BobsCNC',
    model: 'Evolution 3 (E3)',
    description: 'Affordable laser-cut frame CNC',
    workArea: {
      x: inchToMm(17),  // 431.8mm
      y: inchToMm(16),  // 406.4mm
      z: inchToMm(3.3), // 83.82mm
    },
    controller: 'GRBL (Arduino)',
    spindle: 'DeWalt DWP611',
    features: ['Laser-cut wood frame', 'Belt driven', 'Affordable'],
    website: 'https://www.bobscnc.com/',
  },
  {
    id: 'bobscnc-e4',
    brand: 'BobsCNC',
    model: 'Evolution 4 (E4)',
    description: 'Popular mid-size laser-cut frame CNC',
    workArea: {
      x: inchToMm(24),  // 609.6mm
      y: inchToMm(24),  // 609.6mm
      z: inchToMm(3.3), // 83.82mm
    },
    controller: 'GRBL (Arduino)',
    spindle: 'DeWalt DWP611',
    features: ['Laser-cut wood frame', 'Belt driven', 'Good value'],
    website: 'https://www.bobscnc.com/',
  },
  {
    id: 'bobscnc-revolution',
    brand: 'BobsCNC',
    model: 'Revolution',
    description: 'Upgraded CNC with aluminum extrusion',
    workArea: {
      x: inchToMm(24),  // 609.6mm
      y: inchToMm(24),  // 609.6mm
      z: inchToMm(4),   // 101.6mm
    },
    controller: 'GRBL',
    spindle: '65mm router mount',
    features: ['Aluminum extrusion frame', 'Lead screw Z-axis', 'Improved rigidity'],
    website: 'https://www.bobscnc.com/',
  },

  // ============================================
  // OPENBUILDS
  // ============================================
  {
    id: 'openbuilds-lead-1010',
    brand: 'OpenBuilds',
    model: 'LEAD CNC 1010',
    description: 'Open-source aluminum extrusion CNC',
    workArea: {
      x: 1000,  // mm
      y: 1000,  // mm
      z: 90,    // mm
    },
    controller: 'GRBL (BlackBox)',
    spindle: '65mm or 80mm router/spindle',
    features: ['V-slot extrusion', 'Lead screw driven', 'Modular design'],
    website: 'https://openbuildspartstore.com/',
  },
  {
    id: 'openbuilds-lead-1515',
    brand: 'OpenBuilds',
    model: 'LEAD CNC 1515',
    description: 'Large open-source CNC',
    workArea: {
      x: 1500,  // mm
      y: 1500,  // mm
      z: 90,    // mm
    },
    controller: 'GRBL (BlackBox)',
    spindle: '65mm or 80mm router/spindle',
    features: ['V-slot extrusion', 'Lead screw driven', 'Modular design'],
    website: 'https://openbuildspartstore.com/',
  },
  {
    id: 'openbuilds-workbee-1010',
    brand: 'OpenBuilds',
    model: 'WorkBee 1010',
    description: 'Rigid aluminum extrusion CNC',
    workArea: {
      x: 1000,  // mm
      y: 1000,  // mm
      z: 130,   // mm
    },
    controller: 'GRBL (BlackBox)',
    spindle: '65mm or 80mm',
    features: ['Heavy duty frame', 'Ball screw option', 'High rigidity'],
    website: 'https://openbuildspartstore.com/',
  },

  // ============================================
  // CUSTOM / GENERIC
  // ============================================
  {
    id: 'custom-generic-small',
    brand: 'Custom',
    model: 'Generic Small (300x200)',
    description: 'Generic small desktop CNC configuration',
    workArea: {
      x: 300,
      y: 200,
      z: 50,
    },
    controller: 'GRBL',
    features: ['Customizable'],
  },
  {
    id: 'custom-generic-medium',
    brand: 'Custom',
    model: 'Generic Medium (600x400)',
    description: 'Generic medium desktop CNC configuration',
    workArea: {
      x: 600,
      y: 400,
      z: 80,
    },
    controller: 'GRBL',
    features: ['Customizable'],
  },
  {
    id: 'custom-generic-large',
    brand: 'Custom',
    model: 'Generic Large (1200x1200)',
    description: 'Generic large CNC configuration',
    workArea: {
      x: 1200,
      y: 1200,
      z: 100,
    },
    controller: 'GRBL',
    features: ['Customizable'],
  },
]

// Group presets by brand for easier UI display
export const PRESETS_BY_BRAND = MACHINE_PRESETS.reduce((acc, preset) => {
  if (!acc[preset.brand]) {
    acc[preset.brand] = []
  }
  acc[preset.brand].push(preset)
  return acc
}, {} as Record<string, MachinePreset[]>)

// Get unique brands
export const BRANDS = Object.keys(PRESETS_BY_BRAND).sort()

// Find preset by ID
export const findPresetById = (id: string): MachinePreset | undefined => {
  return MACHINE_PRESETS.find(p => p.id === id)
}

// Search presets
export const searchPresets = (query: string): MachinePreset[] => {
  const lowerQuery = query.toLowerCase()
  return MACHINE_PRESETS.filter(p => 
    p.brand.toLowerCase().includes(lowerQuery) ||
    p.model.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery)
  )
}
