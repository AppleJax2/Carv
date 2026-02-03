import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] bg-background">
      <div className="max-w-md space-y-8 p-4 text-center">
        <div className="flex justify-center">
          <span className="text-5xl font-black tracking-tight">
            <span className="text-primary">C</span>
            <span className="text-foreground">arv</span>
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-8xl font-bold text-primary">404</p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Page Not Found
          </h1>
        </div>
        <p className="text-base text-muted-foreground">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <Link href="/download">
            <Button variant="outline" className="border-border">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Download Carv
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
