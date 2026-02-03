import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Everything you need to design and cut. No strings attached.',
    features: [
      { text: 'Full design canvas & tools', included: true },
      { text: 'Toolpath generation (profile, pocket, drill)', included: true },
      { text: '3D simulation preview', included: true },
      { text: 'G-code export (GRBL, Mach3, LinuxCNC)', included: true },
      { text: 'Direct machine control via USB', included: true },
      { text: '10+ free generator apps', included: true },
      { text: 'Material & tool libraries', included: true },
      { text: 'Multiple themes', included: true },
      { text: 'Works offline', included: true },
      { text: 'Community support', included: true },
      { text: 'Premium generator apps', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Download Free',
    ctaLink: '/download',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'one-time',
    description: 'Unlock premium apps and support the development of Carv.',
    features: [
      { text: 'Everything in Free', included: true },
      { text: 'Cabinet Designer Pro', included: true },
      { text: 'Advanced nesting algorithms', included: true },
      { text: 'Batch processing tools', included: true },
      { text: 'Custom post-processor editor', included: true },
      { text: 'Priority email support', included: true },
      { text: 'Early access to new features', included: true },
      { text: 'Support indie development', included: true },
      { text: 'Lifetime license', included: true },
      { text: 'No subscription ever', included: true },
    ],
    cta: 'Get Pro License',
    ctaLink: '/pricing',
    highlighted: true,
  },
];

const faqs = [
  {
    q: 'Is the free version really free forever?',
    a: 'Yes! All core CAD/CAM features are free with no time limits, no watermarks, and no feature restrictions. We believe the tool should work — the extras are just nice to have.',
  },
  {
    q: 'What happens if I don\'t buy Pro?',
    a: 'Nothing changes. You keep using Carv with all core features forever. Pro is for users who want premium generator apps and want to support development.',
  },
  {
    q: 'Is the Pro license a subscription?',
    a: 'No. It\'s a one-time payment for a lifetime license. Pay once, own it forever. No recurring charges.',
  },
  {
    q: 'Can I use Carv commercially?',
    a: 'Absolutely. Both Free and Pro versions can be used for commercial projects. Make money with your CNC!',
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-24 lg:py-32 bg-card relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>The tool works. The extras are nice.</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Simple, <span className="text-primary">Honest</span> Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No subscriptions. No cloud lock-in. No feature paywalls on core functionality.
            Just software that respects your time and money.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-background border rounded-2xl p-8 ${
                plan.highlighted
                  ? 'border-primary shadow-xl shadow-primary/10'
                  : 'border-border'
              }`}
            >
              {/* Highlighted Badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-semibold rounded-full">
                  Support Development
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    {feature.included ? (
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/50'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href={plan.ctaLink} className="block">
                <Button
                  size="lg"
                  className={`w-full ${
                    plan.highlighted
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground'
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-24 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-foreground text-center mb-8">
            Frequently Asked Questions
          </h3>
          <div className="grid gap-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-background border border-border rounded-xl p-6">
                <h4 className="text-lg font-semibold text-foreground mb-2">{faq.q}</h4>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
