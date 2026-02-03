import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Hero, Features, AppShowcase, Pricing, Testimonials, CTA } from '@/components/landing';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        <Hero />
        <Features />
        <AppShowcase />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
