'use client';

import { useState } from 'react';
import { 
  Box, 
  Puzzle, 
  Layers, 
  Type, 
  Image, 
  LayoutGrid, 
  Calculator, 
  Home,
  Waves,
  Hexagon,
  CircleDot,
  Grid3X3,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const apps = [
  {
    id: 'box-maker',
    name: 'Box Maker Classic',
    description: 'Create finger-joint boxes with customizable dimensions, material thickness, and joint count.',
    icon: Box,
    category: 'Joinery',
    status: 'free',
  },
  {
    id: 'puzzle-designer',
    name: 'Puzzle Designer',
    description: 'Design custom jigsaw puzzles from any shape. Perfect for gifts and educational projects.',
    icon: Puzzle,
    category: 'Creative',
    status: 'free',
  },
  {
    id: 'inlay-generator',
    name: 'Inlay Generator',
    description: 'Generate matching pocket and plug toolpaths with precise offset compensation.',
    icon: Layers,
    category: 'Joinery',
    status: 'free',
  },
  {
    id: 'sign-maker',
    name: 'Sign Maker',
    description: 'Create professional text signs with borders, backgrounds, and multiple font options.',
    icon: Type,
    category: 'Creative',
    status: 'free',
  },
  {
    id: 'image-tracer',
    name: 'Image Tracer',
    description: 'Convert bitmap images to clean vector paths ready for cutting or engraving.',
    icon: Image,
    category: 'Utility',
    status: 'free',
  },
  {
    id: 'nesting-optimizer',
    name: 'Nesting Optimizer',
    description: 'Automatically arrange parts for minimal material waste. Supports rotation and spacing.',
    icon: LayoutGrid,
    category: 'Utility',
    status: 'free',
  },
  {
    id: 'feeds-calculator',
    name: 'Feeds Calculator',
    description: 'Calculate optimal speeds and feeds based on material, tool, and machine capabilities.',
    icon: Calculator,
    category: 'Utility',
    status: 'free',
  },
  {
    id: 'cabinet-designer',
    name: 'Cabinet Designer Pro',
    description: 'Full cabinet design system with face frames, doors, drawers, and cut lists.',
    icon: Home,
    category: 'Joinery',
    status: 'pro',
    price: '$19.99',
  },
  {
    id: 'living-hinge',
    name: 'Living Hinge Generator',
    description: 'Create flexible wood patterns with customizable hinge styles and densities.',
    icon: Waves,
    category: 'Creative',
    status: 'free',
  },
  {
    id: 'dovetail',
    name: 'Dovetail Generator',
    description: 'Design traditional and modern dovetail joints with precise angle control.',
    icon: Hexagon,
    category: 'Joinery',
    status: 'free',
  },
  {
    id: 'voronoi',
    name: 'Voronoi Pattern',
    description: 'Generate organic Voronoi patterns for decorative panels and artistic projects.',
    icon: CircleDot,
    category: 'Creative',
    status: 'free',
  },
  {
    id: 'celtic-knot',
    name: 'Celtic Knot Designer',
    description: 'Create intricate Celtic knot patterns with customizable complexity and style.',
    icon: Grid3X3,
    category: 'Creative',
    status: 'free',
  },
  {
    id: 'halftone',
    name: 'Halftone Generator',
    description: 'Convert images to halftone dot patterns for unique engraving effects.',
    icon: CircleDot,
    category: 'Creative',
    status: 'free',
  },
  {
    id: 'gear-generator',
    name: 'Gear Generator',
    description: 'Design precise involute gears with customizable tooth count and module.',
    icon: Sparkles,
    category: 'Mechanical',
    status: 'free',
  },
];

const categories = ['All', 'Joinery', 'Creative', 'Utility', 'Mechanical'];

export function AppShowcase() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredApps = activeCategory === 'All' 
    ? apps 
    : apps.filter(app => app.category === activeCategory);

  return (
    <section id="apps" className="py-24 lg:py-32 bg-background relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Built-in <span className="text-primary">App Library</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            14+ specialized generators to create complex projects in seconds. 
            From boxes to puzzles, signs to inlays — we've got you covered.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Apps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="group relative bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Status Badge */}
              {app.status === 'pro' && (
                <div className="absolute top-3 right-3 px-2 py-1 text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                  PRO {app.price}
                </div>
              )}

              {/* Icon */}
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-3">
                <app.icon className="h-5 w-5 text-primary" />
              </div>

              {/* Content */}
              <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {app.name}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {app.description}
              </p>

              {/* Category Tag */}
              <div className="mt-3">
                <span className="inline-block px-2 py-1 text-xs font-medium bg-secondary text-muted-foreground rounded">
                  {app.category}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            All core apps are <span className="text-primary font-semibold">completely free</span>. 
            Premium apps available for one-time purchase.
          </p>
          <Link href="/download">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Download Carv Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
