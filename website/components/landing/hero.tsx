'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, Play, Apple, Monitor, Terminal, ArrowRight, Sparkles } from 'lucide-react';

type Platform = 'windows' | 'mac' | 'linux' | 'unknown';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac') || ua.includes('darwin')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

const platformInfo = {
  windows: { label: 'Windows', icon: Monitor, file: '.exe' },
  mac: { label: 'macOS', icon: Apple, file: '.dmg' },
  linux: { label: 'Linux', icon: Terminal, file: '.AppImage' },
  unknown: { label: 'your platform', icon: Download, file: '' },
};

export function Hero() {
  const [platform, setPlatform] = useState<Platform>('unknown');

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const { label, icon: PlatformIcon } = platformInfo[platform];

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Floating Elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[128px] animate-pulse delay-1000" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            <span>100% Free for Core Features</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight">
            CNC Design Software
            <br />
            <span className="text-primary">That Just Works</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Design, generate toolpaths, simulate, and control your CNC machine — all in one 
            beautiful, modern app. No subscriptions, no cloud required.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/download">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <PlatformIcon className="h-5 w-5 mr-2" />
                Download for {label}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl border-border hover:bg-secondary">
                <Play className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Platform Links */}
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>Also available for:</span>
            {(['windows', 'mac', 'linux'] as Platform[])
              .filter((p) => p !== platform)
              .map((p) => {
                const { label, icon: Icon } = platformInfo[p];
                return (
                  <Link
                    key={p}
                    href="/download"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
          </div>

          {/* App Preview */}
          <div className="mt-16 relative">
            <div className="relative mx-auto max-w-5xl">
              {/* Window Frame */}
              <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Title Bar */}
                <div className="flex items-center gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 text-center text-sm text-muted-foreground">
                    Carv — Untitled Project
                  </div>
                </div>
                
                {/* App Screenshot Placeholder */}
                <div className="aspect-[16/10] bg-gradient-to-br from-background via-card to-secondary flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                      <svg className="w-12 h-12 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                        <circle cx="16" cy="15" r="2" />
                        <path d="M14 15h-2" />
                      </svg>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      App screenshot will be displayed here
                    </p>
                    <p className="text-muted-foreground/60 text-xs mt-1">
                      Replace with actual Carv app screenshot
                    </p>
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-2xl blur-2xl -z-10" />
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No subscription required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Works offline</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Open source</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
