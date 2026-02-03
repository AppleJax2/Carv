import { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getAllReleases } from '@/lib/github';
import { Calendar, Tag, Download, ExternalLink, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Changelog - Carv',
  description: 'See what\'s new in Carv. Full version history and release notes.',
};

export default async function ChangelogPage() {
  const releases = await getAllReleases(50);

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-16 lg:py-24">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              <span className="text-primary">Changelog</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Track the evolution of Carv. Every update, improvement, and fix documented.
            </p>
          </div>

          {/* Releases Timeline */}
          {releases.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No releases yet</h2>
              <p className="text-muted-foreground mb-6">
                Check back soon for the first release of Carv!
              </p>
              <a
                href="https://github.com/AppleJax2/Carv/releases"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  View on GitHub
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-0 md:left-8 top-0 bottom-0 w-px bg-border" />

              {/* Release Items */}
              <div className="space-y-12">
                {releases.map((release, index) => (
                  <div key={release.version} className="relative pl-8 md:pl-20">
                    {/* Timeline Dot */}
                    <div className={`absolute left-0 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 ${
                      index === 0 
                        ? 'bg-primary border-primary/30' 
                        : 'bg-card border-border'
                    }`} />

                    {/* Release Card */}
                    <div className={`bg-card border rounded-xl p-6 ${
                      index === 0 ? 'border-primary/50 shadow-lg shadow-primary/5' : 'border-border'
                    }`}>
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <h2 className="text-xl font-bold text-foreground">
                          v{release.version}
                        </h2>
                        {index === 0 && (
                          <span className="px-2 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                            Latest
                          </span>
                        )}
                        {release.isPrerelease && (
                          <span className="px-2 py-1 text-xs font-semibold bg-yellow-500/20 text-yellow-500 rounded-full">
                            Pre-release
                          </span>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {new Date(release.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Tag className="h-4 w-4" />
                          {release.name || `Version ${release.version}`}
                        </span>
                      </div>

                      {/* Release Notes */}
                      {release.body && (
                        <div className="prose prose-sm prose-invert max-w-none mb-4">
                          <div className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                            {release.body}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                        <Link href="/download">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        </Link>
                        <a
                          href={release.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="ghost">
                            View on GitHub
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GitHub Link */}
          <div className="mt-16 text-center">
            <p className="text-muted-foreground mb-4">
              Want to see the full commit history?
            </p>
            <a
              href="https://github.com/AppleJax2/Carv/commits/main"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                View commits on GitHub
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
