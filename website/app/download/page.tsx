import { Suspense } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { DownloadContent } from './download-content';

export const metadata = {
  title: 'Download',
  description: 'Download Carv for Windows, macOS, or Linux. Professional CNC design software that just works. No subscription required.',
  openGraph: {
    title: 'Download Carv - Free CNC Design Software',
    description: 'Download Carv for Windows, macOS, or Linux. Professional CNC design software that just works.',
  },
};

export default function DownloadPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-background">
        <Suspense fallback={<DownloadSkeleton />}>
          <DownloadContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function DownloadSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-24 animate-pulse">
      <div className="h-12 bg-secondary rounded-lg w-2/3 mx-auto mb-4" />
      <div className="h-6 bg-secondary rounded-lg w-1/2 mx-auto mb-12" />
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-secondary rounded-xl" />
        ))}
      </div>
    </div>
  );
}
