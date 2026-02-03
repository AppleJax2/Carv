import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Download, ArrowRight, Github } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-24 lg:py-32 bg-gradient-to-b from-card to-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
          Ready to Start <span className="text-primary">Creating</span>?
        </h2>
        
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Download Carv for free and join thousands of makers who've discovered 
          a better way to design and cut. No credit card required. No strings attached.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/download">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
              <Download className="h-5 w-5 mr-2" />
              Download Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <a
            href="https://github.com/AppleJax2/Carv"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-xl border-border hover:bg-secondary">
              <Github className="h-5 w-5 mr-2" />
              View on GitHub
            </Button>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Fast & Lightweight</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>Made with Love</span>
          </div>
        </div>
      </div>
    </section>
  );
}
