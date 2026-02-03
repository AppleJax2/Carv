import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Pricing } from '@/components/landing/pricing';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, X, Sparkles, ArrowRight, Download, Shield, Zap, Heart } from 'lucide-react';

export const metadata = {
  title: 'Pricing - Carv',
  description: 'Simple, honest pricing. Free forever for core features. Pro license for premium apps and priority support.',
};

const comparisonFeatures = [
  { feature: 'Full design canvas & vector tools', free: true, pro: true },
  { feature: 'Toolpath generation (profile, pocket, drill, V-carve)', free: true, pro: true },
  { feature: '3D simulation preview', free: true, pro: true },
  { feature: 'G-code export (GRBL, Mach3, LinuxCNC, etc.)', free: true, pro: true },
  { feature: 'Direct machine control via USB', free: true, pro: true },
  { feature: 'Material & tool libraries', free: true, pro: true },
  { feature: 'Multiple themes', free: true, pro: true },
  { feature: 'Works offline', free: true, pro: true },
  { feature: 'Box Maker Classic', free: true, pro: true },
  { feature: 'Puzzle Designer', free: true, pro: true },
  { feature: 'Inlay Generator', free: true, pro: true },
  { feature: 'Sign Maker', free: true, pro: true },
  { feature: 'Image Tracer', free: true, pro: true },
  { feature: 'Living Hinge Generator', free: true, pro: true },
  { feature: 'Feeds & Speeds Calculator', free: true, pro: true },
  { feature: 'Cabinet Designer Pro', free: false, pro: true },
  { feature: 'Advanced nesting algorithms', free: false, pro: true },
  { feature: 'Batch processing tools', free: false, pro: true },
  { feature: 'Custom post-processor editor', free: false, pro: true },
  { feature: 'Priority email support', free: false, pro: true },
  { feature: 'Early access to new features', free: false, pro: true },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-background">
        {/* Hero Section */}
        <section className="py-16 lg:py-24 bg-gradient-to-b from-background to-card">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              <span>The tool works. The extras are nice.</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Simple, <span className="text-primary">Honest</span> Pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Carv is free forever for all core CAD/CAM features. No subscriptions, no cloud lock-in, 
              no feature paywalls on essential functionality.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 bg-card">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div className="bg-background border border-border rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Free</h2>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-5xl font-bold text-foreground">$0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Everything you need to design and cut. No strings attached.
                </p>
                <Link href="/download">
                  <Button size="lg" className="w-full bg-secondary hover:bg-secondary/80 text-foreground mb-6">
                    <Download className="h-4 w-4 mr-2" />
                    Download Free
                  </Button>
                </Link>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Full design canvas & tools</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>All toolpath operations</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>3D simulation</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>G-code export</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Machine control</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>10+ free generator apps</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span>Premium apps</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="relative bg-background border-2 border-primary rounded-2xl p-8 shadow-xl shadow-primary/10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full">
                  Support Development
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Pro</h2>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-5xl font-bold text-foreground">$49</span>
                  <span className="text-muted-foreground">/one-time</span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Unlock premium apps and support indie development.
                </p>
                <Link href="/sign-up?redirect=checkout&priceId=pro">
                  <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-6">
                    Get Pro License
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Cabinet Designer Pro</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Advanced nesting</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Batch processing</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Custom post-processors</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Priority email support</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Early access to features</span>
                  </li>
                  <li className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary" />
                    <span>Lifetime license</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="py-16 bg-background">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Full Feature Comparison
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-foreground font-semibold">Feature</th>
                    <th className="text-center p-4 text-foreground font-semibold w-24">Free</th>
                    <th className="text-center p-4 text-foreground font-semibold w-24">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((item, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="p-4 text-sm text-muted-foreground">{item.feature}</td>
                      <td className="p-4 text-center">
                        {item.free ? (
                          <Check className="h-5 w-5 text-primary mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {item.pro ? (
                          <Check className="h-5 w-5 text-primary mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-16 bg-card">
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Subscription</h3>
                <p className="text-sm text-muted-foreground">
                  Pay once, own forever. No recurring charges, no surprise fees.
                </p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Instant Access</h3>
                <p className="text-sm text-muted-foreground">
                  Get your license key immediately after purchase. Start using Pro features right away.
                </p>
              </div>
              <div>
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Support Indie Dev</h3>
                <p className="text-sm text-muted-foreground">
                  Your purchase directly supports continued development and new features.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-background">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-foreground text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <FaqItem
                question="Is the free version really free forever?"
                answer="Yes! All core CAD/CAM features are free with no time limits, no watermarks, and no feature restrictions. We believe the tool should work — the extras are just nice to have."
              />
              <FaqItem
                question="What happens if I don't buy Pro?"
                answer="Nothing changes. You keep using Carv with all core features forever. Pro is for users who want premium generator apps and want to support development."
              />
              <FaqItem
                question="Is the Pro license a subscription?"
                answer="No. It's a one-time payment for a lifetime license. Pay once, own it forever. No recurring charges."
              />
              <FaqItem
                question="Can I use Carv commercially?"
                answer="Absolutely. Both Free and Pro versions can be used for commercial projects. Make money with your CNC!"
              />
              <FaqItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards, debit cards, and Apple Pay through our secure Stripe checkout."
              />
              <FaqItem
                question="Do you offer refunds?"
                answer="Yes, we offer a 30-day money-back guarantee. If you're not satisfied with Pro, contact us for a full refund."
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-b from-card to-background">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Download Carv for free and see why thousands of makers have made the switch.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/download">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Download className="h-4 w-4 mr-2" />
                  Download Free
                </Button>
              </Link>
              <Link href="/sign-up?redirect=checkout&priceId=pro">
                <Button size="lg" variant="outline">
                  Get Pro License
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold text-foreground mb-2">{question}</h3>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </div>
  );
}
