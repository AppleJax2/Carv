/**
 * APP STUBS - Detailed specifications for future Carv apps/generators
 * 
 * This file contains comprehensive specifications for each planned app.
 * Each stub includes:
 * - Purpose and user value
 * - UI/UX design notes
 * - Technical implementation details
 * - Parameter schemas
 * - Output specifications
 * 
 * Apps are categorized as:
 * - GENERATORS: Create new geometry (boxes, puzzles, signs, etc.)
 * - UTILITIES: Transform or analyze existing geometry
 * - IMPORTERS: Bring in external data formats
 */

import type { GeneratorApp, UtilityApp, ParameterSchema } from '@/types/marketplace'

// ============================================================================
// BOX MAKER CLASSIC
// ============================================================================
/**
 * BOX MAKER CLASSIC
 * 
 * PURPOSE:
 * Generate finger-joint boxes with customizable dimensions. The most requested
 * feature for CNC woodworkers - creates all 6 sides of a box with interlocking
 * finger joints that can be cut from a single sheet of material.
 * 
 * USER VALUE:
 * - Eliminates manual calculation of finger joint spacing
 * - Automatically accounts for material thickness and kerf
 * - Generates optimized nesting layout to minimize waste
 * - Supports dividers, lids, and sliding lid grooves
 * 
 * UI DESIGN:
 * - 3D preview showing assembled box with exploded view toggle
 * - Real-time updates as parameters change
 * - Material usage calculator showing sheet requirements
 * - Joint strength indicator based on finger count
 * 
 * PARAMETERS:
 * - Box dimensions (width, depth, height) - inner or outer
 * - Material thickness (with common presets: 1/8", 1/4", 1/2", 3/4")
 * - Finger width (auto-calculate or manual)
 * - Joint type: finger, box joint, dovetail (future)
 * - Lid type: none, inset, sliding, hinged
 * - Dividers: count and orientation
 * - Kerf compensation
 * - Corner treatment: sharp, rounded, chamfered
 * 
 * OUTPUT:
 * - Individual path objects for each panel
 * - Grouped by panel (front, back, left, right, top, bottom)
 * - Ready for toolpath generation
 * - Optional: nested layout for sheet optimization
 * 
 * TECHNICAL NOTES:
 * - Use woodworkingGenerators.ts generateFingerJointBox() as base
 * - Add lid groove calculation (typically 1/4" from top)
 * - Divider slots should be slightly wider than material for easy assembly
 * - Consider adding "test joint" output for dialing in fit
 */
export const BOX_MAKER_STUB: GeneratorApp = {
  id: 'box-maker',
  name: 'Box Maker Classic',
  description: 'Create finger joint boxes with customizable dimensions, dividers, and lid options. Perfect for gift boxes, organizers, and storage.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['box', 'finger joint', 'woodworking', 'storage', 'organizer'],
  thumbnail: '/apps/box-maker.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'box',
  entryPoint: 'generators/BoxMaker',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    innerWidth: { type: 'number', label: 'Inner Width', default: 100, min: 20, max: 1000, step: 1 },
    innerDepth: { type: 'number', label: 'Inner Depth', default: 100, min: 20, max: 1000, step: 1 },
    innerHeight: { type: 'number', label: 'Inner Height', default: 50, min: 10, max: 500, step: 1 },
    materialThickness: { type: 'number', label: 'Material Thickness', default: 6, min: 1, max: 25, step: 0.1 },
    fingerWidth: { type: 'number', label: 'Finger Width', default: 12, min: 3, max: 50, step: 1 },
    lidType: { type: 'select', label: 'Lid Type', default: 'none', options: [
      { value: 'none', label: 'No Lid' },
      { value: 'inset', label: 'Inset Lid' },
      { value: 'sliding', label: 'Sliding Lid' },
      { value: 'hinged', label: 'Hinged Lid' },
    ]},
    dividerCountX: { type: 'number', label: 'Dividers (Width)', default: 0, min: 0, max: 10, step: 1 },
    dividerCountY: { type: 'number', label: 'Dividers (Depth)', default: 0, min: 0, max: 10, step: 1 },
    kerf: { type: 'number', label: 'Kerf Compensation', default: 0.1, min: 0, max: 1, step: 0.01 },
  },
}

// ============================================================================
// PUZZLE DESIGNER
// ============================================================================
/**
 * PUZZLE DESIGNER
 * 
 * PURPOSE:
 * Generate jigsaw puzzles from images or custom shapes. Creates interlocking
 * pieces that can be cut from wood, acrylic, or other sheet materials.
 * 
 * USER VALUE:
 * - Turn any image into a custom puzzle
 * - Great for gifts, educational tools, promotional items
 * - Adjustable difficulty via piece count and shape complexity
 * - Tray/frame generation for storage
 * 
 * UI DESIGN:
 * - Image upload with crop/position controls
 * - Grid overlay showing piece boundaries
 * - Piece shape preview (classic, modern, whimsical)
 * - Difficulty rating based on piece count and uniformity
 * 
 * PARAMETERS:
 * - Source image or shape boundary
 * - Piece count (or grid dimensions)
 * - Piece style: classic, modern, whimsical, geometric
 * - Edge style: straight edges, all interlocking
 * - Randomization seed for reproducibility
 * - Include frame/tray
 * - Piece numbering (for assembly reference)
 * 
 * OUTPUT:
 * - Individual piece outlines as closed paths
 * - Optional frame/tray outline
 * - Image mapping data for printing/engraving
 * 
 * TECHNICAL NOTES:
 * - Use bezier curves for smooth interlocking tabs
 * - Ensure minimum piece size for structural integrity
 * - Tab depth should be ~20% of piece width
 * - Consider adding "cheat sheet" output showing piece positions
 */
export const PUZZLE_DESIGNER_STUB: GeneratorApp = {
  id: 'puzzle-designer',
  name: 'Puzzle Designer',
  description: 'Generate custom jigsaw puzzles from any image or shape. Adjustable piece count, styles, and difficulty levels.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['puzzle', 'jigsaw', 'game', 'gift', 'kids'],
  thumbnail: '/apps/puzzle.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'puzzle',
  entryPoint: 'generators/PuzzleDesigner',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    columns: { type: 'number', label: 'Columns', default: 4, min: 2, max: 20, step: 1 },
    rows: { type: 'number', label: 'Rows', default: 3, min: 2, max: 20, step: 1 },
    pieceStyle: { type: 'select', label: 'Piece Style', default: 'classic', options: [
      { value: 'classic', label: 'Classic' },
      { value: 'modern', label: 'Modern' },
      { value: 'whimsical', label: 'Whimsical' },
      { value: 'geometric', label: 'Geometric' },
    ]},
    tabDepth: { type: 'number', label: 'Tab Depth %', default: 20, min: 10, max: 35, step: 1 },
    randomSeed: { type: 'number', label: 'Random Seed', default: 42, min: 1, max: 9999, step: 1 },
    includeFrame: { type: 'boolean', label: 'Include Frame', default: true },
  },
}

// ============================================================================
// INLAY GENERATOR
// ============================================================================
/**
 * INLAY GENERATOR
 * 
 * PURPOSE:
 * Create matching pocket and inlay pieces with automatic offset compensation.
 * Essential for decorative inlay work where precision fit is critical.
 * 
 * USER VALUE:
 * - Automatic calculation of pocket vs inlay offsets
 * - Accounts for bit geometry (straight vs tapered)
 * - Generates both pocket and plug from single design
 * - V-carve inlay support for seamless joints
 * 
 * UI DESIGN:
 * - Side-by-side preview of pocket and inlay
 * - Cross-section view showing fit
 * - Gap/interference indicator
 * - Material contrast preview
 * 
 * PARAMETERS:
 * - Source design (selected objects)
 * - Inlay type: flat, v-carve, proud
 * - Pocket depth
 * - Gap tolerance (for glue)
 * - Bit angle (for v-carve)
 * - Start depth (for v-carve)
 * 
 * OUTPUT:
 * - Pocket toolpath-ready geometry
 * - Inlay piece geometry (with offset)
 * - Alignment marks (optional)
 * 
 * TECHNICAL NOTES:
 * - V-carve inlay requires matching angles on pocket and plug
 * - Flat inlay needs slight undersize on plug for glue gap
 * - Consider adding "test piece" generator for dialing in fit
 * - Support for multi-material inlays (different colors)
 */
export const INLAY_GENERATOR_STUB: GeneratorApp = {
  id: 'inlay-generator',
  name: 'Inlay Generator',
  description: 'Create perfect inlay pockets and matching plugs with automatic offset compensation. Supports flat and v-carve inlay techniques.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['inlay', 'pocket', 'decorative', 'precision', 'v-carve'],
  thumbnail: '/apps/inlay.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'inlay',
  entryPoint: 'generators/InlayGenerator',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    inlayType: { type: 'select', label: 'Inlay Type', default: 'flat', options: [
      { value: 'flat', label: 'Flat Inlay' },
      { value: 'vcarve', label: 'V-Carve Inlay' },
      { value: 'proud', label: 'Proud Inlay' },
    ]},
    pocketDepth: { type: 'number', label: 'Pocket Depth', default: 3, min: 0.5, max: 25, step: 0.1 },
    gapTolerance: { type: 'number', label: 'Gap Tolerance', default: 0.1, min: 0, max: 1, step: 0.01 },
    bitAngle: { type: 'number', label: 'V-Bit Angle', default: 60, min: 15, max: 120, step: 1 },
    startDepth: { type: 'number', label: 'Start Depth', default: 0, min: 0, max: 10, step: 0.1 },
  },
}

// ============================================================================
// SIGN MAKER
// ============================================================================
/**
 * SIGN MAKER
 * 
 * PURPOSE:
 * Create professional signs with text, borders, and mounting options.
 * Streamlines the most common CNC project type.
 * 
 * USER VALUE:
 * - Quick text-to-sign workflow
 * - Built-in border and frame options
 * - Mounting hole placement
 * - Material size optimization
 * 
 * UI DESIGN:
 * - WYSIWYG text editing on sign preview
 * - Border style gallery
 * - Mounting hole configurator
 * - Size presets (common sign sizes)
 * 
 * PARAMETERS:
 * - Text content (multi-line)
 * - Font selection
 * - Sign dimensions
 * - Border style and width
 * - Corner style
 * - Mounting holes (count, size, position)
 * - Carving style: v-carve, pocket, outline
 * 
 * OUTPUT:
 * - Text as paths (converted from font)
 * - Border geometry
 * - Mounting hole positions
 * - Background shape
 * 
 * TECHNICAL NOTES:
 * - Use textToPath.ts for font conversion
 * - Common sign sizes: 6x24", 12x12", 18x24", 24x36"
 * - Mounting holes typically 1/4" diameter, 1" from edges
 * - Consider adding QR code generation for business signs
 */
export const SIGN_MAKER_STUB: GeneratorApp = {
  id: 'sign-maker',
  name: 'Sign Maker',
  description: 'Create professional signs with customizable text, borders, and mounting options. Perfect for home decor, business signs, and gifts.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['sign', 'text', 'border', 'decor', 'business'],
  thumbnail: '/apps/sign.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: false,
  verified: true,
  generatorType: 'sign',
  entryPoint: 'generators/SignMaker',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    text: { type: 'string', label: 'Sign Text', default: 'Welcome' },
    fontFamily: { type: 'select', label: 'Font', default: 'serif', options: [
      { value: 'serif', label: 'Serif' },
      { value: 'sans-serif', label: 'Sans Serif' },
      { value: 'script', label: 'Script' },
      { value: 'display', label: 'Display' },
    ]},
    width: { type: 'number', label: 'Width', default: 300, min: 50, max: 1200, step: 10 },
    height: { type: 'number', label: 'Height', default: 100, min: 25, max: 600, step: 10 },
    borderStyle: { type: 'select', label: 'Border', default: 'simple', options: [
      { value: 'none', label: 'None' },
      { value: 'simple', label: 'Simple' },
      { value: 'double', label: 'Double Line' },
      { value: 'decorative', label: 'Decorative' },
    ]},
    mountingHoles: { type: 'boolean', label: 'Add Mounting Holes', default: true },
  },
}

// ============================================================================
// IMAGE TRACER
// ============================================================================
/**
 * IMAGE TRACER
 * 
 * PURPOSE:
 * Convert raster images (photos, drawings) to vector paths suitable for CNC.
 * Essential utility for bringing external artwork into the workflow.
 * 
 * USER VALUE:
 * - Turn any image into cuttable vectors
 * - Adjustable detail level for different use cases
 * - Preview before committing
 * - Batch processing support
 * 
 * UI DESIGN:
 * - Side-by-side original vs traced preview
 * - Real-time threshold/detail sliders
 * - Color separation for multi-layer traces
 * - Path simplification controls
 * 
 * PARAMETERS:
 * - Source image
 * - Trace mode: outline, centerline, color layers
 * - Threshold/sensitivity
 * - Path simplification level
 * - Minimum feature size
 * - Ignore colors (background removal)
 * - Output scale
 * 
 * OUTPUT:
 * - Vector paths representing traced image
 * - Grouped by color/layer if applicable
 * - Optimized for toolpath generation
 * 
 * TECHNICAL NOTES:
 * - Use potrace or similar algorithm for bitmap tracing
 * - Centerline trace useful for single-line fonts/drawings
 * - Consider adding "sketch" mode for hand-drawn look
 * - Path simplification critical for CNC (reduce node count)
 */
export const IMAGE_TRACER_STUB: UtilityApp = {
  id: 'image-tracer',
  name: 'Image Tracer',
  description: 'Convert raster images to vector paths. Adjustable detail, threshold, and simplification for optimal CNC results.',
  author: 'Carv',
  version: '1.0.0',
  category: 'utility',
  tags: ['trace', 'image', 'vector', 'convert', 'bitmap'],
  thumbnail: '/apps/tracer.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  utilityType: 'import',
  entryPoint: 'utilities/ImageTracer',
  permissions: ['read-project', 'write-project', 'filesystem'],
  configSchema: {
    traceMode: { type: 'select', label: 'Trace Mode', default: 'outline', options: [
      { value: 'outline', label: 'Outline' },
      { value: 'centerline', label: 'Centerline' },
      { value: 'color', label: 'Color Layers' },
    ]},
    threshold: { type: 'number', label: 'Threshold', default: 128, min: 0, max: 255, step: 1 },
    simplification: { type: 'number', label: 'Simplification', default: 2, min: 0, max: 10, step: 0.5 },
    minFeatureSize: { type: 'number', label: 'Min Feature Size', default: 1, min: 0.1, max: 10, step: 0.1 },
    smoothing: { type: 'number', label: 'Smoothing', default: 1, min: 0, max: 5, step: 0.1 },
  },
}

// ============================================================================
// NESTING OPTIMIZER
// ============================================================================
/**
 * NESTING OPTIMIZER
 * 
 * PURPOSE:
 * Automatically arrange parts on stock material to minimize waste.
 * Critical for production work and expensive materials.
 * 
 * USER VALUE:
 * - Reduce material waste significantly
 * - Automatic rotation and placement optimization
 * - Multi-sheet support for large jobs
 * - Cut order optimization for reduced machine time
 * 
 * UI DESIGN:
 * - Drag-and-drop manual adjustment
 * - Waste percentage indicator
 * - Sheet count and utilization stats
 * - Animation showing optimization process
 * 
 * PARAMETERS:
 * - Parts to nest (selected objects)
 * - Sheet dimensions
 * - Part spacing/gap
 * - Allow rotation (90°, any, none)
 * - Grain direction constraint
 * - Quantity per part
 * - Optimization priority: speed vs density
 * 
 * OUTPUT:
 * - Nested layout with part positions
 * - Multiple sheets if needed
 * - Cut order sequence
 * - Material usage report
 * 
 * TECHNICAL NOTES:
 * - Use NFP (No-Fit Polygon) algorithm for accurate nesting
 * - Consider genetic algorithm for optimization
 * - Grain direction important for wood (restrict rotation)
 * - Add "common cut" optimization for shared edges
 */
export const NESTING_OPTIMIZER_STUB: UtilityApp = {
  id: 'nesting-optimizer',
  name: 'Nesting Optimizer',
  description: 'Automatically arrange parts on stock material to minimize waste. Supports rotation, spacing, and multi-sheet layouts.',
  author: 'Carv',
  version: '1.0.0',
  category: 'utility',
  tags: ['nesting', 'optimize', 'layout', 'waste', 'production'],
  thumbnail: '/apps/nesting.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  utilityType: 'optimization',
  entryPoint: 'utilities/NestingOptimizer',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    sheetWidth: { type: 'number', label: 'Sheet Width', default: 1220, min: 100, max: 3000, step: 10 },
    sheetHeight: { type: 'number', label: 'Sheet Height', default: 2440, min: 100, max: 3000, step: 10 },
    partSpacing: { type: 'number', label: 'Part Spacing', default: 5, min: 0, max: 50, step: 1 },
    allowRotation: { type: 'select', label: 'Allow Rotation', default: '90', options: [
      { value: 'none', label: 'No Rotation' },
      { value: '90', label: '90° Only' },
      { value: 'any', label: 'Any Angle' },
    ]},
    grainDirection: { type: 'boolean', label: 'Respect Grain', default: false },
  },
}

// ============================================================================
// FEEDS & SPEEDS CALCULATOR
// ============================================================================
/**
 * FEEDS & SPEEDS CALCULATOR
 * 
 * PURPOSE:
 * Calculate optimal cutting parameters based on material, tool, and machine.
 * Prevents broken bits, poor finish, and wasted time.
 * 
 * USER VALUE:
 * - Science-based feed/speed recommendations
 * - Material-specific presets
 * - Chip load optimization
 * - Machine capability awareness
 * 
 * UI DESIGN:
 * - Visual chip load indicator (too thin/thick)
 * - Comparison with recommended ranges
 * - "What if" scenario testing
 * - Save custom presets
 * 
 * PARAMETERS:
 * - Material type and hardness
 * - Tool geometry (diameter, flutes, type)
 * - Machine capabilities (spindle range, rigidity)
 * - Cut type (slotting, profiling, pocketing)
 * - Desired surface finish
 * 
 * OUTPUT:
 * - Recommended feed rate
 * - Recommended spindle speed
 * - Depth per pass
 * - Stepover percentage
 * - Chip load achieved
 * - Warnings/notes
 * 
 * TECHNICAL NOTES:
 * - Base calculations on chip load formulas
 * - Account for tool deflection on small bits
 * - Slotting requires reduced feed vs profiling
 * - Consider adding "conservative" vs "aggressive" modes
 */
export const FEEDS_CALCULATOR_STUB: UtilityApp = {
  id: 'feeds-calculator',
  name: 'Feeds & Speeds Calculator',
  description: 'Calculate optimal cutting parameters based on material, tool, and machine capabilities. Prevent broken bits and poor finishes.',
  author: 'Carv',
  version: '1.0.0',
  category: 'utility',
  tags: ['feeds', 'speeds', 'calculator', 'optimization', 'chip load'],
  thumbnail: '/apps/feeds.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: false,
  verified: true,
  utilityType: 'analysis',
  entryPoint: 'utilities/FeedsCalculator',
  permissions: ['read-tools', 'read-machine'],
  configSchema: {
    material: { type: 'select', label: 'Material', default: 'softwood', options: [
      { value: 'softwood', label: 'Softwood (Pine, Cedar)' },
      { value: 'hardwood', label: 'Hardwood (Oak, Maple)' },
      { value: 'plywood', label: 'Plywood' },
      { value: 'mdf', label: 'MDF' },
      { value: 'acrylic', label: 'Acrylic' },
      { value: 'aluminum', label: 'Aluminum' },
      { value: 'hdpe', label: 'HDPE Plastic' },
    ]},
    cutType: { type: 'select', label: 'Cut Type', default: 'profile', options: [
      { value: 'profile', label: 'Profiling' },
      { value: 'slot', label: 'Slotting' },
      { value: 'pocket', label: 'Pocketing' },
      { value: 'drill', label: 'Drilling' },
    ]},
    finishQuality: { type: 'select', label: 'Finish Quality', default: 'standard', options: [
      { value: 'rough', label: 'Rough (Fast)' },
      { value: 'standard', label: 'Standard' },
      { value: 'fine', label: 'Fine Finish' },
    ]},
  },
}

// ============================================================================
// CABINET DESIGNER (PREMIUM)
// ============================================================================
/**
 * CABINET DESIGNER PRO
 * 
 * PURPOSE:
 * Design complete cabinet systems with shelves, doors, and hardware.
 * Professional-grade tool for furniture makers.
 * 
 * USER VALUE:
 * - Full cabinet system design
 * - Hardware placement (hinges, slides, handles)
 * - Cut list generation
 * - Assembly instructions
 * 
 * UI DESIGN:
 * - 3D cabinet preview with door animation
 * - Drag-and-drop shelf placement
 * - Hardware catalog integration
 * - Exploded view for assembly reference
 * 
 * PARAMETERS:
 * - Cabinet dimensions
 * - Door style and count
 * - Shelf count and adjustability
 * - Drawer configuration
 * - Hardware selections
 * - Material for each component
 * - Face frame vs frameless
 * 
 * OUTPUT:
 * - All cabinet components as paths
 * - Hardware mounting hole positions
 * - Cut list with dimensions
 * - Assembly diagram
 * 
 * TECHNICAL NOTES:
 * - Support standard cabinet sizes (base, wall, tall)
 * - Euro hinge boring patterns (32mm system)
 * - Drawer slide mounting calculations
 * - Consider Blum/Grass hardware specs
 */
export const CABINET_DESIGNER_STUB: GeneratorApp = {
  id: 'cabinet-designer',
  name: 'Cabinet Designer Pro',
  description: 'Design complete cabinet systems with doors, drawers, shelves, and hardware placement. Professional-grade furniture design.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['cabinet', 'furniture', 'kitchen', 'storage', 'professional'],
  thumbnail: '/apps/cabinet.png',
  pricing: { type: 'paid', price: 19.99, currency: 'USD' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'cabinet',
  entryPoint: 'generators/CabinetDesigner',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    cabinetType: { type: 'select', label: 'Cabinet Type', default: 'base', options: [
      { value: 'base', label: 'Base Cabinet' },
      { value: 'wall', label: 'Wall Cabinet' },
      { value: 'tall', label: 'Tall Cabinet' },
      { value: 'drawer', label: 'Drawer Bank' },
    ]},
    width: { type: 'number', label: 'Width', default: 600, min: 150, max: 1200, step: 50 },
    height: { type: 'number', label: 'Height', default: 720, min: 300, max: 2400, step: 50 },
    depth: { type: 'number', label: 'Depth', default: 560, min: 200, max: 700, step: 10 },
    doorCount: { type: 'number', label: 'Doors', default: 2, min: 0, max: 4, step: 1 },
    shelfCount: { type: 'number', label: 'Shelves', default: 1, min: 0, max: 6, step: 1 },
    construction: { type: 'select', label: 'Construction', default: 'frameless', options: [
      { value: 'frameless', label: 'Frameless (Euro)' },
      { value: 'faceframe', label: 'Face Frame' },
    ]},
  },
}

// ============================================================================
// LIVING HINGE GENERATOR
// ============================================================================
/**
 * LIVING HINGE GENERATOR
 * 
 * PURPOSE:
 * Create flexible "living hinge" patterns that allow flat materials to bend.
 * Popular for curved boxes, lamp shades, and decorative items.
 * 
 * USER VALUE:
 * - Turn rigid materials into flexible panels
 * - Multiple pattern styles
 * - Bend radius calculation
 * - Structural integrity optimization
 * 
 * UI DESIGN:
 * - Pattern preview with simulated bend
 * - Flexibility vs strength slider
 * - Pattern density visualization
 * - Bend radius indicator
 * 
 * PARAMETERS:
 * - Area dimensions
 * - Pattern style (lattice, wave, diamond, custom)
 * - Cut width (kerf)
 * - Pattern density
 * - Bend direction
 * - Material thickness
 * - Target bend radius
 * 
 * OUTPUT:
 * - Living hinge cut pattern
 * - Boundary shape
 * - Bend line indicators
 * 
 * TECHNICAL NOTES:
 * - Thinner remaining material = more flexible but weaker
 * - Cross-grain cuts for wood
 * - Test piece recommended for new patterns
 * - Consider adding "graduated" density for variable flex
 */
export const LIVING_HINGE_STUB: GeneratorApp = {
  id: 'living-hinge',
  name: 'Living Hinge Generator',
  description: 'Create flexible living hinge patterns that allow flat materials to bend. Perfect for curved boxes, lamp shades, and decorative items.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['living hinge', 'flexible', 'bend', 'lattice', 'decorative'],
  thumbnail: '/apps/hinge.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: false,
  verified: true,
  generatorType: 'custom',
  entryPoint: 'generators/LivingHinge',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    width: { type: 'number', label: 'Width', default: 200, min: 50, max: 1000, step: 10 },
    height: { type: 'number', label: 'Height', default: 100, min: 20, max: 500, step: 10 },
    pattern: { type: 'select', label: 'Pattern', default: 'lattice', options: [
      { value: 'lattice', label: 'Lattice' },
      { value: 'wave', label: 'Wave' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'straight', label: 'Straight Lines' },
    ]},
    density: { type: 'number', label: 'Density', default: 5, min: 2, max: 15, step: 0.5 },
    cutWidth: { type: 'number', label: 'Cut Width', default: 0.2, min: 0.1, max: 1, step: 0.05 },
  },
}

// New innovative generators
export const GEAR_GENERATOR_STUB: GeneratorApp = {
  id: 'gear-generator',
  name: 'Gear Generator',
  description: 'Create precise involute spur gears, internal gears, and racks with proper tooth profiles. Includes mating gear preview and keyway options.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['gear', 'mechanical', 'involute', 'rack', 'pinion', 'engineering'],
  thumbnail: '/apps/gear.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'custom',
  entryPoint: 'generators/GearGenerator',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    module: { type: 'number', label: 'Module', default: 2, min: 0.5, max: 10, step: 0.5 },
    teeth: { type: 'number', label: 'Teeth', default: 20, min: 8, max: 200, step: 1 },
    pressureAngle: { type: 'number', label: 'Pressure Angle', default: 20, min: 14.5, max: 25, step: 0.5 },
  },
}

export const DOVETAIL_GENERATOR_STUB: GeneratorApp = {
  id: 'dovetail-generator',
  name: 'Dovetail Joint Generator',
  description: 'Create traditional dovetail joints, half-blind dovetails, sliding dovetails, and box joints with proper angles and kerf compensation.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['dovetail', 'joint', 'woodworking', 'box joint', 'finger joint', 'joinery'],
  thumbnail: '/apps/dovetail.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'custom',
  entryPoint: 'generators/DovetailGenerator',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    jointType: { type: 'select', label: 'Joint Type', default: 'through', options: [
      { value: 'through', label: 'Through Dovetail' },
      { value: 'half-blind', label: 'Half-Blind' },
      { value: 'sliding', label: 'Sliding Dovetail' },
      { value: 'box-joint', label: 'Box Joint' },
    ]},
    numTails: { type: 'number', label: 'Number of Tails', default: 4, min: 1, max: 12, step: 1 },
  },
}

export const VORONOI_GENERATOR_STUB: GeneratorApp = {
  id: 'voronoi-generator',
  name: 'Voronoi Pattern Generator',
  description: 'Create organic cell patterns using Voronoi diagrams. Perfect for decorative panels, lamp shades, and artistic designs with multiple distribution algorithms.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['voronoi', 'pattern', 'organic', 'cells', 'decorative', 'artistic'],
  thumbnail: '/apps/voronoi.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'custom',
  entryPoint: 'generators/VoronoiGenerator',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    numPoints: { type: 'number', label: 'Number of Cells', default: 30, min: 5, max: 100, step: 1 },
    distribution: { type: 'select', label: 'Distribution', default: 'poisson', options: [
      { value: 'random', label: 'Random' },
      { value: 'poisson', label: 'Poisson Disk' },
      { value: 'grid-jitter', label: 'Grid with Jitter' },
      { value: 'radial', label: 'Radial' },
    ]},
  },
}

export const CELTIC_KNOT_GENERATOR_STUB: GeneratorApp = {
  id: 'celtic-knot-generator',
  name: 'Celtic Knot Generator',
  description: 'Create intricate interlaced Celtic patterns including triquetra, quaternary knots, spirals, and border patterns for decorative carving.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['celtic', 'knot', 'interlace', 'decorative', 'pattern', 'border'],
  thumbnail: '/apps/celtic.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'custom',
  entryPoint: 'generators/CelticKnotGenerator',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    pattern: { type: 'select', label: 'Pattern', default: 'triquetra', options: [
      { value: 'basic', label: 'Basic Figure-8' },
      { value: 'triquetra', label: 'Triquetra' },
      { value: 'quaternary', label: 'Quaternary' },
      { value: 'spiral', label: 'Double Spiral' },
      { value: 'border', label: 'Border Pattern' },
      { value: 'circular', label: 'Circular Rings' },
    ]},
  },
}

export const HALFTONE_GENERATOR_STUB: GeneratorApp = {
  id: 'halftone-generator',
  name: 'Halftone Generator',
  description: 'Convert images to CNC-ready halftone patterns with various dot shapes and grid types. Create stunning photo-based carvings and engravings.',
  author: 'Carv',
  version: '1.0.0',
  category: 'generator',
  tags: ['halftone', 'image', 'photo', 'dots', 'engraving', 'lithophane'],
  thumbnail: '/apps/halftone.png',
  pricing: { type: 'free' },
  downloads: 0,
  rating: 0,
  ratingCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  featured: true,
  verified: true,
  generatorType: 'custom',
  entryPoint: 'generators/HalftoneGenerator',
  permissions: ['read-project', 'write-project'],
  configSchema: {
    dotShape: { type: 'select', label: 'Dot Shape', default: 'circle', options: [
      { value: 'circle', label: 'Circle' },
      { value: 'square', label: 'Square' },
      { value: 'diamond', label: 'Diamond' },
      { value: 'hexagon', label: 'Hexagon' },
      { value: 'cross', label: 'Cross' },
      { value: 'line', label: 'Line' },
    ]},
    gridType: { type: 'select', label: 'Grid Type', default: 'square', options: [
      { value: 'square', label: 'Square' },
      { value: 'hexagonal', label: 'Hexagonal' },
      { value: 'random', label: 'Random' },
    ]},
  },
}

// Export all stubs
export const ALL_APP_STUBS: (GeneratorApp | UtilityApp)[] = [
  BOX_MAKER_STUB,
  PUZZLE_DESIGNER_STUB,
  INLAY_GENERATOR_STUB,
  SIGN_MAKER_STUB,
  IMAGE_TRACER_STUB,
  NESTING_OPTIMIZER_STUB,
  FEEDS_CALCULATOR_STUB,
  CABINET_DESIGNER_STUB,
  LIVING_HINGE_STUB,
  GEAR_GENERATOR_STUB,
  DOVETAIL_GENERATOR_STUB,
  VORONOI_GENERATOR_STUB,
  CELTIC_KNOT_GENERATOR_STUB,
  HALFTONE_GENERATOR_STUB,
]

// Apps that are ready vs coming soon
export const READY_APPS: string[] = [
  'box-maker',
  'puzzle-designer', 
  'inlay-generator',
  'sign-maker',
  'image-tracer',
  'nesting-optimizer',
  'feeds-calculator',
  'cabinet-designer',
  'living-hinge',
  'gear-generator',
  'dovetail-generator',
  'voronoi-generator',
  'celtic-knot-generator',
  'halftone-generator',
]
export const COMING_SOON_APPS: string[] = []
