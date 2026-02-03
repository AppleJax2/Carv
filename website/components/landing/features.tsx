import { 
  Pencil, 
  Route, 
  Play, 
  FileCode, 
  Gamepad2, 
  Palette, 
  Puzzle, 
  Zap,
  Shield,
  Layers,
  Box,
  Cpu
} from 'lucide-react';

const features = [
  {
    icon: Pencil,
    title: 'Intuitive Design Tools',
    description: 'Create and edit vector designs with a modern, responsive canvas. Import SVG, DXF, or draw from scratch with precision tools.',
    color: 'from-blue-500/20 to-blue-600/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Route,
    title: 'Smart Toolpath Generation',
    description: 'Automatically generate optimized toolpaths for profiles, pockets, drilling, and V-carving. Full control over feeds, speeds, and strategies.',
    color: 'from-primary/20 to-green-600/20',
    iconColor: 'text-primary',
  },
  {
    icon: Play,
    title: '3D Simulation',
    description: 'Preview your cuts in realistic 3D before sending to your machine. Catch errors and optimize your workflow visually.',
    color: 'from-purple-500/20 to-purple-600/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: FileCode,
    title: 'G-code Export',
    description: 'Export industry-standard G-code compatible with GRBL, Mach3, LinuxCNC, and more. Customize post-processors for your machine.',
    color: 'from-orange-500/20 to-orange-600/20',
    iconColor: 'text-orange-400',
  },
  {
    icon: Gamepad2,
    title: 'Machine Control',
    description: 'Connect directly to your CNC via USB. Jog, home, probe, and run jobs with real-time status monitoring and override controls.',
    color: 'from-red-500/20 to-red-600/20',
    iconColor: 'text-red-400',
  },
  {
    icon: Puzzle,
    title: 'App Library',
    description: '14+ built-in generators for boxes, puzzles, signs, inlays, and more. Create complex projects with just a few clicks.',
    color: 'from-cyan-500/20 to-cyan-600/20',
    iconColor: 'text-cyan-400',
  },
  {
    icon: Palette,
    title: 'Multiple Themes',
    description: 'Work comfortably with your choice of dark, light, or custom themes. Reduce eye strain during long design sessions.',
    color: 'from-pink-500/20 to-pink-600/20',
    iconColor: 'text-pink-400',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built with modern technology for instant responsiveness. No lag, no waiting — just smooth, productive design work.',
    color: 'from-yellow-500/20 to-yellow-600/20',
    iconColor: 'text-yellow-400',
  },
];

const additionalFeatures = [
  { icon: Shield, label: 'Works Offline' },
  { icon: Layers, label: 'Multi-layer Support' },
  { icon: Box, label: 'Material Library' },
  { icon: Cpu, label: 'GRBL Compatible' },
];

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-card relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need to
            <span className="text-primary"> Create</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From initial design to finished cut, Carv provides all the tools you need 
            in one seamless workflow. No jumping between apps.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-background border border-border rounded-xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
                <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Glow */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
            </div>
          ))}
        </div>

        {/* Additional Features Bar */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 lg:gap-12">
          {additionalFeatures.map((feature) => (
            <div key={feature.label} className="flex items-center gap-2 text-muted-foreground">
              <feature.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{feature.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
