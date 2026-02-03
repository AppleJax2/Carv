import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export const metadata = {
  title: 'Privacy Policy - Carv',
  description: 'Privacy Policy for Carv CNC design software.',
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16 lg:py-24">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 2, 2026</p>
          
          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Our Commitment to Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Carv is designed with privacy in mind. The desktop application works entirely offline and does not 
                collect or transmit your design data. This policy explains what data we collect through our website 
                and services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Account Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you create an account, we collect your email address and name. This is used for account 
                management, license key delivery, and customer support.
              </p>

              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Payment Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                Payment processing is handled by Stripe. We do not store your credit card information. Stripe's 
                privacy policy governs their handling of your payment data.
              </p>

              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Usage Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our website uses basic analytics to understand traffic patterns. The desktop application does not 
                include any telemetry or analytics - your designs stay on your computer.
              </p>

              <h3 className="text-xl font-medium text-foreground mt-6 mb-3">Update Checks</h3>
              <p className="text-muted-foreground leading-relaxed">
                The desktop application periodically checks for updates via GitHub. This request includes your 
                current version number but no personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">How We Use Your Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Deliver and manage your license keys</li>
                <li>Process purchases and refunds</li>
                <li>Send important product updates and security notices</li>
                <li>Provide customer support</li>
                <li>Improve our website and services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">What We Don't Do</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>We don't sell your personal information</li>
                <li>We don't share your data with third parties for marketing</li>
                <li>We don't collect your design files or G-code</li>
                <li>We don't track your usage of the desktop application</li>
                <li>We don't send marketing emails without your consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Data Storage and Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your account data is stored securely using industry-standard encryption. We use Supabase for 
                database hosting, which provides enterprise-grade security. Passwords are hashed using bcrypt 
                and are never stored in plain text.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data</li>
                <li>Opt out of marketing communications</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@carv.app" className="text-primary hover:underline">privacy@carv.app</a>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our website uses essential cookies for authentication and session management. We do not use 
                tracking cookies or third-party advertising cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Carv is not intended for children under 13. We do not knowingly collect personal information 
                from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of significant changes 
                via email or through the website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related questions or concerns, contact us at{' '}
                <a href="mailto:privacy@carv.app" className="text-primary hover:underline">privacy@carv.app</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
