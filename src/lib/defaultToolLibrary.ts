import type { Tool } from '@/types/machine'

export const DEFAULT_TOOL_LIBRARY: Tool[] = [
  {
    id: 'flat-1.5mm',
    name: '1.5mm Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 1.5,
      fluteLength: 6,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 600,
    defaultPlungeRate: 200,
    defaultSpindleSpeed: 22000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 40,
    notes: 'Ultra-fine detail work, PCB milling',
  },
  {
    id: 'flat-3mm',
    name: '3mm (1/8") Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 3.175,
      fluteLength: 12,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 300,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 1,
    defaultStepover: 40,
    notes: 'Fine detail work, small pockets',
  },
  {
    id: 'flat-6mm',
    name: '6mm (1/4") Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 6.35,
      fluteLength: 25,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1500,
    defaultPlungeRate: 500,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 2,
    defaultStepover: 40,
    notes: 'General purpose wood/plastic routing',
  },
  {
    id: 'flat-6mm-long',
    name: '6mm (1/4") Long Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 6.35,
      fluteLength: 38,
      overallLength: 64,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1400,
    defaultPlungeRate: 450,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 2,
    defaultStepover: 40,
    notes: 'Deep pockets, thicker materials',
  },
  {
    id: 'flat-8mm',
    name: '8mm (5/16") Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 7.94,
      fluteLength: 25,
      overallLength: 57,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1800,
    defaultPlungeRate: 600,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 2.5,
    defaultStepover: 40,
    notes: 'Medium-duty cutting, faster material removal',
  },
  {
    id: 'flat-12mm-1-2shank',
    name: '12mm (1/2") Flat End Mill - 1/2" Shank',
    type: 'flat-end-mill',
    geometry: {
      diameter: 12.7,
      fluteLength: 31.75,
      overallLength: 73,
      shankDiameter: 12.7,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2000,
    defaultPlungeRate: 700,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 3,
    defaultStepover: 40,
    notes: 'Heavy-duty cutting, surfacing, large pockets',
  },
  {
    id: 'flat-12mm-long',
    name: '12mm (1/2") Long Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 12.7,
      fluteLength: 38,
      overallLength: 79,
      shankDiameter: 12.7,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1900,
    defaultPlungeRate: 650,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 3,
    defaultStepover: 40,
    notes: 'Deep cuts in thick materials',
  },
  {
    id: 'flat-16mm',
    name: '16mm (5/8") Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 15.875,
      fluteLength: 31.75,
      overallLength: 76,
      shankDiameter: 15.875,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2200,
    defaultPlungeRate: 750,
    defaultSpindleSpeed: 14000,
    defaultDepthPerPass: 3.5,
    defaultStepover: 40,
    notes: 'Large area surfacing, slab flattening',
  },
  {
    id: 'flat-19mm',
    name: '19mm (3/4") Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 19.05,
      fluteLength: 31.75,
      overallLength: 76,
      shankDiameter: 19.05,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2400,
    defaultPlungeRate: 800,
    defaultSpindleSpeed: 14000,
    defaultDepthPerPass: 4,
    defaultStepover: 40,
    notes: 'Large surfacing operations, fast material removal',
  },
  {
    id: 'flat-19mm-long',
    name: '19mm (3/4") Long Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 19.05,
      fluteLength: 50.8,
      overallLength: 102,
      shankDiameter: 19.05,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2300,
    defaultPlungeRate: 750,
    defaultSpindleSpeed: 14000,
    defaultDepthPerPass: 4,
    defaultStepover: 40,
    notes: 'Deep surfacing, thick slab flattening',
  },
  {
    id: 'flat-22mm',
    name: '22mm (7/8") Flat End Mill',
    type: 'flat-end-mill',
    geometry: {
      diameter: 22.225,
      fluteLength: 50.8,
      overallLength: 102,
      shankDiameter: 19.05,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2500,
    defaultPlungeRate: 850,
    defaultSpindleSpeed: 12000,
    defaultDepthPerPass: 4.5,
    defaultStepover: 40,
    notes: 'Extra-large surfacing, production work',
  },
  {
    id: 'ball-3mm',
    name: '3mm (1/8") Ball End Mill',
    type: 'ball-end-mill',
    geometry: {
      diameter: 3.175,
      fluteLength: 12,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 800,
    defaultPlungeRate: 250,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 15,
    notes: 'Fine 3D carving, detailed contours',
  },
  {
    id: 'ball-6mm',
    name: '6mm (1/4") Ball End Mill',
    type: 'ball-end-mill',
    geometry: {
      diameter: 6.35,
      fluteLength: 22,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1,
    defaultStepover: 15,
    notes: '3D finishing, contoured surfaces',
  },
  {
    id: 'ball-8mm',
    name: '8mm (5/16") Ball End Mill',
    type: 'ball-end-mill',
    geometry: {
      diameter: 7.94,
      fluteLength: 25,
      overallLength: 57,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1400,
    defaultPlungeRate: 450,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 1.2,
    defaultStepover: 15,
    notes: '3D roughing and finishing',
  },
  {
    id: 'ball-12mm',
    name: '12mm (1/2") Ball End Mill',
    type: 'ball-end-mill',
    geometry: {
      diameter: 12.7,
      fluteLength: 31.75,
      overallLength: 73,
      shankDiameter: 12.7,
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1600,
    defaultPlungeRate: 500,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 20,
    notes: 'Large 3D contours, sculptural work',
  },
  {
    id: 'vbit-30',
    name: '30° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 6.35,
      fluteLength: 10,
      overallLength: 40,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 30,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 350,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1,
    defaultStepover: 30,
    notes: 'Fine detail V-carving, narrow grooves',
  },
  {
    id: 'vbit-60',
    name: '60° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 6.35,
      fluteLength: 12,
      overallLength: 40,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 60,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 30,
    notes: 'Standard V-carving, chamfering, sign making',
  },
  {
    id: 'vbit-90',
    name: '90° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 12.7,
      fluteLength: 15,
      overallLength: 45,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 90,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 2,
    defaultStepover: 30,
    notes: 'Wide V-carving, lettering, decorative grooves',
  },
  {
    id: 'vbit-120',
    name: '120° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 19.05,
      fluteLength: 20,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 120,
    },
    defaultFeedRate: 1100,
    defaultPlungeRate: 380,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 2.5,
    defaultStepover: 30,
    notes: 'Extra-wide V-carving, large chamfers',
  },
  {
    id: 'bullnose-3mm-r0.5',
    name: '3mm Bull Nose (R0.5mm)',
    type: 'bull-nose',
    geometry: {
      diameter: 3.175,
      fluteLength: 12,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 2,
      cornerRadius: 0.5,
    },
    defaultFeedRate: 900,
    defaultPlungeRate: 280,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 0.8,
    defaultStepover: 35,
    notes: 'Fine detail with radiused corners',
  },
  {
    id: 'bullnose-6mm-r1',
    name: '6mm Bull Nose (R1mm)',
    type: 'bull-nose',
    geometry: {
      diameter: 6.35,
      fluteLength: 22,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      cornerRadius: 1,
    },
    defaultFeedRate: 1300,
    defaultPlungeRate: 420,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 35,
    notes: 'General purpose with rounded corners',
  },
  {
    id: 'bullnose-6mm-r2',
    name: '6mm Bull Nose (R2mm)',
    type: 'bull-nose',
    geometry: {
      diameter: 6.35,
      fluteLength: 22,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      cornerRadius: 2,
    },
    defaultFeedRate: 1250,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 30,
    notes: 'Large radius corners, smooth transitions',
  },
  {
    id: 'engraving-10deg',
    name: '10° Engraving Bit',
    type: 'engraving-bit',
    geometry: {
      diameter: 0.2,
      fluteLength: 5,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 1,
      tipAngle: 10,
    },
    defaultFeedRate: 400,
    defaultPlungeRate: 150,
    defaultSpindleSpeed: 24000,
    defaultDepthPerPass: 0.2,
    defaultStepover: 20,
    notes: 'Ultra-fine engraving, PCB isolation',
  },
  {
    id: 'engraving-20deg',
    name: '20° Engraving Bit',
    type: 'engraving-bit',
    geometry: {
      diameter: 0.4,
      fluteLength: 8,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 1,
      tipAngle: 20,
    },
    defaultFeedRate: 500,
    defaultPlungeRate: 180,
    defaultSpindleSpeed: 22000,
    defaultDepthPerPass: 0.3,
    defaultStepover: 20,
    notes: 'Fine engraving, detailed line work',
  },
  {
    id: 'drill-2mm',
    name: '2mm Drill Bit',
    type: 'drill',
    geometry: {
      diameter: 2,
      fluteLength: 20,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 2,
      tipAngle: 118,
    },
    defaultFeedRate: 300,
    defaultPlungeRate: 150,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 2,
    defaultStepover: 100,
    notes: 'Small pilot holes, dowel holes',
  },
  {
    id: 'drill-3mm',
    name: '3mm Drill Bit',
    type: 'drill',
    geometry: {
      diameter: 3,
      fluteLength: 25,
      overallLength: 38,
      shankDiameter: 3.175,
      numberOfFlutes: 2,
      tipAngle: 118,
    },
    defaultFeedRate: 350,
    defaultPlungeRate: 180,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 3,
    defaultStepover: 100,
    notes: 'Standard small holes',
  },
  {
    id: 'drill-6mm',
    name: '6mm Drill Bit',
    type: 'drill',
    geometry: {
      diameter: 6,
      fluteLength: 40,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 118,
    },
    defaultFeedRate: 400,
    defaultPlungeRate: 200,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 6,
    defaultStepover: 100,
    notes: 'Medium holes, through-holes',
  },
  {
    id: 'drill-8mm',
    name: '8mm Drill Bit',
    type: 'drill',
    geometry: {
      diameter: 8,
      fluteLength: 50,
      overallLength: 60,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 118,
    },
    defaultFeedRate: 450,
    defaultPlungeRate: 220,
    defaultSpindleSpeed: 14000,
    defaultDepthPerPass: 8,
    defaultStepover: 100,
    notes: 'Large holes, deep drilling',
  },
  {
    id: 'chamfer-45-6mm',
    name: '45° Chamfer Mill (6mm)',
    type: 'chamfer',
    geometry: {
      diameter: 6.35,
      fluteLength: 10,
      overallLength: 40,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 90,
    },
    defaultFeedRate: 1100,
    defaultPlungeRate: 380,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 40,
    notes: 'Edge chamfering, deburring',
  },
  {
    id: 'chamfer-45-12mm',
    name: '45° Chamfer Mill (12mm)',
    type: 'chamfer',
    geometry: {
      diameter: 12.7,
      fluteLength: 15,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 2,
      tipAngle: 90,
    },
    defaultFeedRate: 1300,
    defaultPlungeRate: 420,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 2,
    defaultStepover: 40,
    notes: 'Large chamfers, countersinks',
  },
  {
    id: 'surfacing-25mm',
    name: '25mm (1") Surfacing Bit',
    type: 'face-mill',
    geometry: {
      diameter: 25.4,
      fluteLength: 3,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 4,
    },
    defaultFeedRate: 3000,
    defaultPlungeRate: 300,
    defaultSpindleSpeed: 12000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 70,
    notes: 'Fast surfacing, slab flattening',
  },
  {
    id: 'surfacing-32mm',
    name: '32mm (1.25") Surfacing Bit',
    type: 'face-mill',
    geometry: {
      diameter: 31.75,
      fluteLength: 3,
      overallLength: 50,
      shankDiameter: 6.35,
      numberOfFlutes: 4,
    },
    defaultFeedRate: 3500,
    defaultPlungeRate: 300,
    defaultSpindleSpeed: 12000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 70,
    notes: 'Large area surfacing, production work',
  },
  {
    id: 'surfacing-50mm',
    name: '50mm (2") Surfacing Bit',
    type: 'face-mill',
    geometry: {
      diameter: 50.8,
      fluteLength: 3,
      overallLength: 55,
      shankDiameter: 12.7,
      numberOfFlutes: 6,
    },
    defaultFeedRate: 4000,
    defaultPlungeRate: 300,
    defaultSpindleSpeed: 10000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 70,
    notes: 'Extra-large surfacing, maximum efficiency',
  },

  // ============================================
  // CARBIDE 3D - From official Fusion 360 library
  // ============================================
  {
    id: 'carbide3d-122',
    name: 'Carbide 3D #122 - 1/32" Square',
    type: 'flat-end-mill',
    geometry: {
      diameter: 0.794,  // 1/32" = 0.03125" = 0.794mm
      fluteLength: 1.588,  // 0.0625" 
      overallLength: 38.1,  // 1.5"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,  // ~39 ipm
    defaultPlungeRate: 333,  // ~13 ipm
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 0.25,
    defaultStepover: 40,
    notes: 'Carbide 3D ultra-fine detail bit',
  },
  {
    id: 'carbide3d-112',
    name: 'Carbide 3D #112 - 1/16" Square',
    type: 'flat-end-mill',
    geometry: {
      diameter: 1.588,  // 1/16" = 0.0625" = 1.588mm
      fluteLength: 6.35,  // 0.25"
      overallLength: 38.1,  // 1.5"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 40,
    notes: 'Carbide 3D fine detail flat end mill',
  },
  {
    id: 'carbide3d-102',
    name: 'Carbide 3D #102 - 1/8" Square',
    type: 'flat-end-mill',
    geometry: {
      diameter: 3.175,  // 1/8"
      fluteLength: 12.7,  // 0.5"
      overallLength: 38.1,  // 1.5"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 1,
    defaultStepover: 40,
    notes: 'Carbide 3D standard 1/8" end mill',
  },
  {
    id: 'carbide3d-201',
    name: 'Carbide 3D #201 - 1/4" Square',
    type: 'flat-end-mill',
    geometry: {
      diameter: 6.35,  // 1/4"
      fluteLength: 19.05,  // 0.75"
      overallLength: 63.5,  // 2.5"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 3,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 2,
    defaultStepover: 40,
    notes: 'Carbide 3D workhorse 1/4" 3-flute end mill',
  },
  {
    id: 'carbide3d-121',
    name: 'Carbide 3D #121 - 1/32" Ballnose',
    type: 'ball-end-mill',
    geometry: {
      diameter: 0.794,  // 1/32"
      fluteLength: 1.588,  // 0.0625"
      overallLength: 38.1,  // 1.5"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 10000,
    defaultDepthPerPass: 0.2,
    defaultStepover: 10,
    notes: 'Carbide 3D ultra-fine 3D detail carving',
  },
  {
    id: 'carbide3d-111',
    name: 'Carbide 3D #111 - 1/16" Ballnose',
    type: 'ball-end-mill',
    geometry: {
      diameter: 1.588,  // 1/16"
      fluteLength: 6.35,  // 0.25"
      overallLength: 38.1,  // 1.5"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 0.4,
    defaultStepover: 10,
    notes: 'Carbide 3D fine 3D carving and detail',
  },
  {
    id: 'carbide3d-101',
    name: 'Carbide 3D #101 - 1/8" Ballnose',
    type: 'ball-end-mill',
    geometry: {
      diameter: 3.175,  // 1/8"
      fluteLength: 12.7,  // 0.5"
      overallLength: 38.1,  // 1.5"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 508,  // 20 ipm
    defaultPlungeRate: 229,  // 9 ipm
    defaultSpindleSpeed: 10000,
    defaultDepthPerPass: 0.8,
    defaultStepover: 15,
    notes: 'Carbide 3D standard 3D finishing bit',
  },
  {
    id: 'carbide3d-202',
    name: 'Carbide 3D #202 - 1/4" Ballnose',
    type: 'ball-end-mill',
    geometry: {
      diameter: 6.35,  // 1/4"
      fluteLength: 19.05,  // 0.75"
      overallLength: 63.5,  // 2.5"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 3,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 15,
    notes: 'Carbide 3D large 3D roughing and finishing',
  },
  {
    id: 'carbide3d-301',
    name: 'Carbide 3D #301 - 90° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 12.7,  // 0.5"
      fluteLength: 6.35,  // 0.25"
      overallLength: 50.8,  // 2"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 2,
      tipAngle: 90,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 30,
    notes: 'Carbide 3D V-carving and chamfering',
  },
  {
    id: 'carbide3d-302',
    name: 'Carbide 3D #302 - 60° V-Bit',
    type: 'v-bit',
    geometry: {
      diameter: 11.1125,  // 0.4375"
      fluteLength: 6.35,  // 0.25"
      overallLength: 50.8,  // 2"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 2,
      tipAngle: 60,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 333,
    defaultSpindleSpeed: 5000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 30,
    notes: 'Carbide 3D fine V-carving and lettering',
  },

  // ============================================
  // SPETOOL - From official SpeTool website specs
  // ============================================
  {
    id: 'spetool-m02003',
    name: 'SpeTool M02003 - 1/4" Flat 2F (Metal)',
    type: 'flat-end-mill',
    geometry: {
      diameter: 6.35,  // 1/4"
      fluteLength: 19.05,  // 3/4"
      overallLength: 63.5,  // 2-1/2"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 12000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 40,
    notes: 'SpeTool TiAlN coated for steel/stainless',
  },
  {
    id: 'spetool-m02004',
    name: 'SpeTool M02004 - 1/4" Flat 2F Long (Metal)',
    type: 'flat-end-mill',
    geometry: {
      diameter: 6.35,  // 1/4"
      fluteLength: 28.575,  // 1-1/8"
      overallLength: 76.2,  // 3"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1200,
    defaultPlungeRate: 400,
    defaultSpindleSpeed: 12000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 40,
    notes: 'SpeTool TiAlN coated long reach for metal',
  },
  {
    id: 'spetool-m02007',
    name: 'SpeTool M02007 - 1/4" Flat 4F (Metal)',
    type: 'flat-end-mill',
    geometry: {
      diameter: 6.35,  // 1/4"
      fluteLength: 28.575,  // 1-1/8"
      overallLength: 76.2,  // 3"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 4,
    },
    defaultFeedRate: 1500,
    defaultPlungeRate: 500,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 1.5,
    defaultStepover: 40,
    notes: 'SpeTool 4-flute TiAlN for faster metal cutting',
  },
  {
    id: 'spetool-m03006',
    name: 'SpeTool M03006 - 1/16" Flat 2F (Metal)',
    type: 'flat-end-mill',
    geometry: {
      diameter: 1.588,  // 1/16"
      fluteLength: 4.7625,  // 3/16"
      overallLength: 38.1,  // 1-1/2"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 600,
    defaultPlungeRate: 200,
    defaultSpindleSpeed: 12000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 40,
    notes: 'SpeTool fine detail TiAlN for metal',
  },
  {
    id: 'spetool-m03008',
    name: 'SpeTool M03008 - 1/8" Flat 2F (Metal)',
    type: 'flat-end-mill',
    geometry: {
      diameter: 3.175,  // 1/8"
      fluteLength: 12.7,  // 1/2"
      overallLength: 38.1,  // 1-1/2"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 800,
    defaultPlungeRate: 300,
    defaultSpindleSpeed: 12000,
    defaultDepthPerPass: 0.8,
    defaultStepover: 40,
    notes: 'SpeTool 1/8" TiAlN for aluminum and steel',
  },
  {
    id: 'spetool-w01001',
    name: 'SpeTool W01001 - 0.25mm Tapered Ball (3D)',
    type: 'ball-end-mill',
    geometry: {
      diameter: 0.5,  // 0.25mm radius = 0.5mm tip
      fluteLength: 15,  // 15mm
      overallLength: 38.1,  // 1-1/2"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 600,
    defaultPlungeRate: 200,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 0.3,
    defaultStepover: 8,
    notes: 'SpeTool 5.12° tapered ball for ultra-fine 3D',
  },
  {
    id: 'spetool-w01002',
    name: 'SpeTool W01002 - 0.5mm Tapered Ball (3D)',
    type: 'ball-end-mill',
    geometry: {
      diameter: 1.0,  // 0.5mm radius = 1mm tip
      fluteLength: 15,  // 15mm
      overallLength: 38.1,  // 1-1/2"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 700,
    defaultPlungeRate: 250,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 0.4,
    defaultStepover: 10,
    notes: 'SpeTool 4.16° tapered ball for fine 3D carving',
  },
  {
    id: 'spetool-w01003',
    name: 'SpeTool W01003 - 0.75mm Tapered Ball (3D)',
    type: 'ball-end-mill',
    geometry: {
      diameter: 1.5,  // 0.75mm radius = 1.5mm tip
      fluteLength: 15,  // 15mm
      overallLength: 38.1,  // 1-1/2"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 800,
    defaultPlungeRate: 280,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 12,
    notes: 'SpeTool 3.2° tapered ball for 3D detail',
  },
  {
    id: 'spetool-w01004',
    name: 'SpeTool W01004 - 1.0mm Tapered Ball (3D)',
    type: 'ball-end-mill',
    geometry: {
      diameter: 2.0,  // 1mm radius = 2mm tip
      fluteLength: 15,  // 15mm
      overallLength: 38.1,  // 1-1/2"
      shankDiameter: 3.175,  // 1/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 900,
    defaultPlungeRate: 300,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 0.6,
    defaultStepover: 15,
    notes: 'SpeTool 2.24° tapered ball for 3D carving',
  },
  {
    id: 'spetool-w01014',
    name: 'SpeTool W01014 - 1/16" Tapered Ball (3D)',
    type: 'ball-end-mill',
    geometry: {
      diameter: 3.175,  // 1/16" radius = 1/8" tip
      fluteLength: 25.4,  // 1"
      overallLength: 63.5,  // 2-1/2"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1000,
    defaultPlungeRate: 350,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 0.8,
    defaultStepover: 15,
    notes: 'SpeTool 3.58° tapered ball, 1/4" shank',
  },
  {
    id: 'spetool-w01015',
    name: 'SpeTool W01015 - 1/32" Tapered Ball (3D)',
    type: 'ball-end-mill',
    geometry: {
      diameter: 1.588,  // 1/32" radius = 1/16" tip
      fluteLength: 25.4,  // 1"
      overallLength: 63.5,  // 2-1/2"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 800,
    defaultPlungeRate: 280,
    defaultSpindleSpeed: 20000,
    defaultDepthPerPass: 0.5,
    defaultStepover: 10,
    notes: 'SpeTool 5.38° tapered ball for fine 3D',
  },
  {
    id: 'spetool-w01016',
    name: 'SpeTool W01016 - 1/64" Tapered Ball (3D)',
    type: 'ball-end-mill',
    geometry: {
      diameter: 0.794,  // 1/64" radius = 1/32" tip
      fluteLength: 25.4,  // 1"
      overallLength: 63.5,  // 2-1/2"
      shankDiameter: 6.35,  // 1/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 600,
    defaultPlungeRate: 200,
    defaultSpindleSpeed: 22000,
    defaultDepthPerPass: 0.3,
    defaultStepover: 8,
    notes: 'SpeTool 6.28° tapered ball ultra-fine detail',
  },

  // ============================================
  // WHITESIDE - From official tool specs
  // ============================================
  {
    id: 'whiteside-c1067',
    name: 'Whiteside C1067 - 1/2" CNC Straight',
    type: 'flat-end-mill',
    geometry: {
      diameter: 12.7,  // 1/2"
      fluteLength: 31.75,  // 1-1/4"
      overallLength: 73.025,  // 2-7/8"
      shankDiameter: 12.7,  // 1/2"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2000,
    defaultPlungeRate: 700,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 3,
    defaultStepover: 40,
    notes: 'Whiteside carbide-tipped CNC straight bit',
  },
  {
    id: 'whiteside-c1069',
    name: 'Whiteside C1069 - 1/2" CNC Straight Long',
    type: 'flat-end-mill',
    geometry: {
      diameter: 12.7,  // 1/2"
      fluteLength: 38.1,  // 1-1/2"
      overallLength: 79.375,  // 3-1/8"
      shankDiameter: 12.7,  // 1/2"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1900,
    defaultPlungeRate: 650,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 3,
    defaultStepover: 40,
    notes: 'Whiteside long reach CNC straight bit',
  },
  {
    id: 'whiteside-c1072',
    name: 'Whiteside C1072 - 1/2" CNC Straight XL',
    type: 'flat-end-mill',
    geometry: {
      diameter: 12.7,  // 1/2"
      fluteLength: 50.8,  // 2"
      overallLength: 104.775,  // 4-1/8"
      shankDiameter: 12.7,  // 1/2"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 1800,
    defaultPlungeRate: 600,
    defaultSpindleSpeed: 18000,
    defaultDepthPerPass: 3,
    defaultStepover: 40,
    notes: 'Whiteside extra-long CNC straight bit',
  },
  {
    id: 'whiteside-c6310',
    name: 'Whiteside C6310 - 5/8" CNC Straight',
    type: 'flat-end-mill',
    geometry: {
      diameter: 15.875,  // 5/8"
      fluteLength: 31.75,  // 1-1/4"
      overallLength: 76.2,  // 3"
      shankDiameter: 15.875,  // 5/8"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2200,
    defaultPlungeRate: 750,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 3.5,
    defaultStepover: 40,
    notes: 'Whiteside 5/8" CNC straight bit',
  },
  {
    id: 'whiteside-c7512',
    name: 'Whiteside C7512 - 3/4" CNC Straight',
    type: 'flat-end-mill',
    geometry: {
      diameter: 19.05,  // 3/4"
      fluteLength: 31.75,  // 1-1/4"
      overallLength: 76.2,  // 3"
      shankDiameter: 19.05,  // 3/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2400,
    defaultPlungeRate: 800,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 4,
    defaultStepover: 40,
    notes: 'Whiteside 3/4" CNC straight bit',
  },
  {
    id: 'whiteside-c7520',
    name: 'Whiteside C7520 - 3/4" CNC Straight Long',
    type: 'flat-end-mill',
    geometry: {
      diameter: 19.05,  // 3/4"
      fluteLength: 50.8,  // 2"
      overallLength: 101.6,  // 4"
      shankDiameter: 19.05,  // 3/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2300,
    defaultPlungeRate: 750,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 4,
    defaultStepover: 40,
    notes: 'Whiteside 3/4" long CNC straight bit',
  },
  {
    id: 'whiteside-c7525',
    name: 'Whiteside C7525 - 3/4" CNC Straight XL',
    type: 'flat-end-mill',
    geometry: {
      diameter: 19.05,  // 3/4"
      fluteLength: 63.5,  // 2-1/2"
      overallLength: 114.3,  // 4-1/2"
      shankDiameter: 19.05,  // 3/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2200,
    defaultPlungeRate: 700,
    defaultSpindleSpeed: 16000,
    defaultDepthPerPass: 4,
    defaultStepover: 40,
    notes: 'Whiteside 3/4" extra-long CNC straight bit',
  },
  {
    id: 'whiteside-c8820v',
    name: 'Whiteside C8820V - 7/8" CNC Vee Bottom',
    type: 'flat-end-mill',
    geometry: {
      diameter: 22.225,  // 7/8"
      fluteLength: 50.8,  // 2"
      overallLength: 101.6,  // 4"
      shankDiameter: 19.05,  // 3/4"
      numberOfFlutes: 2,
    },
    defaultFeedRate: 2500,
    defaultPlungeRate: 850,
    defaultSpindleSpeed: 14000,
    defaultDepthPerPass: 4.5,
    defaultStepover: 40,
    notes: 'Whiteside 7/8" CNC vee bottom bit',
  },
]
