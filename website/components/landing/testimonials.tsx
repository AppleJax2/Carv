import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: "Finally, CNC software that doesn't feel like it was designed in 2005. Carv is exactly what the hobby CNC community needed.",
    author: "Mike R.",
    role: "Woodworker & Maker",
    avatar: "MR",
    rating: 5,
  },
  {
    quote: "I switched from a $500/year subscription software to Carv. It does everything I need and more, completely free. Incredible.",
    author: "Sarah T.",
    role: "Small Business Owner",
    avatar: "ST",
    rating: 5,
  },
  {
    quote: "The built-in generators save me hours every week. Box maker alone has paid for itself many times over... and it's free!",
    author: "David L.",
    role: "Custom Furniture Maker",
    avatar: "DL",
    rating: 5,
  },
  {
    quote: "Clean interface, works offline, no subscription. This is how software should be. Thank you for respecting your users.",
    author: "James K.",
    role: "CNC Hobbyist",
    avatar: "JK",
    rating: 5,
  },
  {
    quote: "The simulation feature caught a collision that would have ruined a $200 piece of walnut. Worth every penny of the Pro license.",
    author: "Amanda C.",
    role: "Artist & Designer",
    avatar: "AC",
    rating: 5,
  },
  {
    quote: "I've tried them all - Easel, Carbide Create, VCarve. Carv is the first one that feels modern and actually enjoyable to use.",
    author: "Robert M.",
    role: "YouTube Creator",
    avatar: "RM",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[128px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Loved by <span className="text-primary">Makers</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of CNC enthusiasts who've made the switch to Carv.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
            >
              {/* Rating */}
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-foreground mb-6">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 py-8 border-y border-border">
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-primary">10K+</div>
            <div className="text-sm text-muted-foreground mt-1">Downloads</div>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-primary">4.9</div>
            <div className="text-sm text-muted-foreground mt-1">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-primary">50+</div>
            <div className="text-sm text-muted-foreground mt-1">Countries</div>
          </div>
          <div className="text-center">
            <div className="text-3xl lg:text-4xl font-bold text-primary">100%</div>
            <div className="text-sm text-muted-foreground mt-1">Free Core Features</div>
          </div>
        </div>
      </div>
    </section>
  );
}
