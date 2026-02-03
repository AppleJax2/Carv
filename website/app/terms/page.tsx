import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata = {
  title: 'Terms of Service - Carv',
  description: 'Terms of Service for Carv CNC design software.',
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16 lg:py-24">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 2, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By downloading, installing, or using Carv ("the Software"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, do not use the Software.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. License Grant</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Free Version:</strong> Carv grants you a free, non-exclusive, non-transferable license to use the 
                Software for personal or commercial purposes. All core CAD/CAM features are included at no cost.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Pro License:</strong> Upon purchase of a Pro license, you receive a perpetual, non-exclusive, 
                non-transferable license to use the Pro features on a single computer. The license key may be transferred 
                to a new machine by deactivating it on the old machine first.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Restrictions</h2>
              <p className="text-muted-foreground leading-relaxed">You may not:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-2">
                <li>Reverse engineer, decompile, or disassemble the Software</li>
                <li>Redistribute, sell, or sublicense the Software</li>
                <li>Share your Pro license key with others</li>
                <li>Use the Software for any illegal purpose</li>
                <li>Remove or alter any proprietary notices or labels</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Software and all associated intellectual property rights are owned by Carv. Your license does not 
                grant you any ownership rights. Designs and G-code you create using the Software are your property.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. CARV DISCLAIMS ALL WARRANTIES, 
                EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, 
                AND NON-INFRINGEMENT. USE OF CNC MACHINERY IS INHERENTLY DANGEROUS. YOU ARE SOLELY RESPONSIBLE FOR 
                SAFE OPERATION OF YOUR EQUIPMENT.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                IN NO EVENT SHALL CARV BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE 
                DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR EQUIPMENT DAMAGE, ARISING FROM YOUR 
                USE OF THE SOFTWARE.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Refund Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Pro license purchases are eligible for a full refund within 30 days of purchase if you are not 
                satisfied. Contact support@carv.app to request a refund.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Updates and Changes</h2>
              <p className="text-muted-foreground leading-relaxed">
                Carv may update the Software and these Terms at any time. Continued use of the Software after 
                changes constitutes acceptance of the new terms. We will notify users of significant changes 
                via email or in-app notification.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your license terminates automatically if you violate these Terms. Upon termination, you must 
                cease all use of the Software and delete all copies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">10. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms, contact us at{' '}
                <a href="mailto:legal@carv.app" className="text-primary hover:underline">legal@carv.app</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
