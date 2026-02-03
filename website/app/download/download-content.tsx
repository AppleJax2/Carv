'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Monitor, 
  Apple, 
  Terminal, 
  ExternalLink,
  CheckCircle,
  Clock,
  HardDrive,
  Cpu,
  FileText,
  ArrowRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { formatFileSize } from '@/lib/github';
import type { ParsedRelease } from '@/lib/github';

type Platform = 'windows' | 'mac' | 'linux' | 'unknown';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac') || ua.includes('darwin')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'unknown';
}

function detectArm(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('arm') || ua.includes('aarch64');
}

const platformConfig = {
  windows: {
    name: 'Windows',
    icon: Monitor,
    color: 'from-blue-500 to-blue-600',
    requirements: [
      'Windows 10 or later',
      '64-bit processor',
      '4 GB RAM minimum',
      '500 MB disk space',
    ],
  },
  mac: {
    name: 'macOS',
    icon: Apple,
    color: 'from-gray-600 to-gray-700',
    requirements: [
      'macOS 10.15 (Catalina) or later',
      'Intel or Apple Silicon',
      '4 GB RAM minimum',
      '500 MB disk space',
    ],
  },
  linux: {
    name: 'Linux',
    icon: Terminal,
    color: 'from-orange-500 to-orange-600',
    requirements: [
      'Ubuntu 20.04+ or equivalent',
      '64-bit processor',
      '4 GB RAM minimum',
      '500 MB disk space',
    ],
  },
  unknown: {
    name: 'Your Platform',
    icon: Download,
    color: 'from-primary to-green-600',
    requirements: [],
  },
};

export function DownloadContent() {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isArm, setIsArm] = useState(false);
  const [release, setRelease] = useState<ParsedRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsArm(detectArm());
    
    // Fetch latest release
    fetch('/api/releases')
      .then(res => res.json())
      .then(data => {
        if (data.release) {
          setRelease(data.release);
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(() => setError('Failed to fetch release information'))
      .finally(() => setLoading(false));
  }, []);

  const getDownloadUrl = (p: Platform) => {
    if (!release) return null;
    const assets = release.assets;
    
    switch (p) {
      case 'windows':
        return assets.windows?.browser_download_url;
      case 'mac':
        return isArm ? (assets.macArm?.browser_download_url || assets.mac?.browser_download_url) : assets.mac?.browser_download_url;
      case 'linux':
        return isArm ? (assets.linuxArm?.browser_download_url || assets.linux?.browser_download_url) : assets.linux?.browser_download_url;
      default:
        return null;
    }
  };

  const getAssetInfo = (p: Platform) => {
    if (!release) return null;
    const assets = release.assets;
    
    switch (p) {
      case 'windows':
        return assets.windows;
      case 'mac':
        return isArm ? (assets.macArm || assets.mac) : assets.mac;
      case 'linux':
        return isArm ? (assets.linuxArm || assets.linux) : assets.linux;
      default:
        return null;
    }
  };

  const primaryPlatform = platform !== 'unknown' ? platform : 'windows';
  const otherPlatforms = (['windows', 'mac', 'linux'] as Platform[]).filter(p => p !== primaryPlatform);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
          Download <span className="text-primary">Carv</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get started with professional CNC design software. Free forever, no subscription required.
        </p>
        
        {/* Version Badge */}
        {release && (
          <div className="mt-6 inline-flex items-center gap-4 px-4 py-2 bg-card border border-border rounded-full">
            <span className="text-sm text-muted-foreground">Latest Version:</span>
            <span className="text-sm font-semibold text-primary">v{release.version}</span>
            <span className="text-sm text-muted-foreground">
              {new Date(release.publishedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading release information...</span>
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="text-destructive font-medium mb-2">Unable to fetch releases</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <a
            href="https://github.com/AppleJax2/Carv/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            View releases on GitHub
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      ) : (
        <>
          {/* Primary Download */}
          <div className="mb-12">
            <PlatformCard
              platform={primaryPlatform}
              release={release}
              downloadUrl={getDownloadUrl(primaryPlatform)}
              assetInfo={getAssetInfo(primaryPlatform)}
              isPrimary
              isArm={isArm}
            />
          </div>

          {/* Other Platforms */}
          <div className="mb-16">
            <h2 className="text-xl font-semibold text-foreground text-center mb-6">
              Also available for
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {otherPlatforms.map((p) => (
                <PlatformCard
                  key={p}
                  platform={p}
                  release={release}
                  downloadUrl={getDownloadUrl(p)}
                  assetInfo={getAssetInfo(p)}
                  isArm={isArm}
                />
              ))}
            </div>
          </div>

          {/* System Requirements */}
          <div className="bg-card border border-border rounded-xl p-8 mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              System Requirements
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {(['windows', 'mac', 'linux'] as Platform[]).map((p) => {
                const config = platformConfig[p];
                const Icon = config.icon;
                return (
                  <div key={p}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <h3 className="font-medium text-foreground">{config.name}</h3>
                    </div>
                    <ul className="space-y-2">
                      {config.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Release Notes Preview */}
          {release && release.body && (
            <div className="bg-card border border-border rounded-xl p-8 mb-12">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  What's New in v{release.version}
                </h2>
                <Link href="/changelog" className="text-sm text-primary hover:underline flex items-center gap-1">
                  View full changelog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="prose prose-sm prose-invert max-w-none">
                <div 
                  className="text-muted-foreground whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ 
                    __html: release.body.slice(0, 500) + (release.body.length > 500 ? '...' : '') 
                  }}
                />
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-4">Need Help?</h2>
            <p className="text-muted-foreground mb-6">
              Check out our documentation or join the community for support.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/docs">
                <Button variant="outline">
                  Documentation
                </Button>
              </Link>
              <a
                href="https://github.com/AppleJax2/Carv/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  Report an Issue
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
              <a
                href="https://discord.gg/carv"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  Join Discord
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface PlatformCardProps {
  platform: Platform;
  release: ParsedRelease | null;
  downloadUrl: string | null | undefined;
  assetInfo: { size: number; download_count: number; name: string } | null | undefined;
  isPrimary?: boolean;
  isArm?: boolean;
}

function PlatformCard({ platform, release, downloadUrl, assetInfo, isPrimary, isArm }: PlatformCardProps) {
  const config = platformConfig[platform];
  const Icon = config.icon;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${isPrimary ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'}`}>
      {isPrimary && (
        <div className="bg-primary px-4 py-2 text-center">
          <span className="text-sm font-medium text-primary-foreground">
            Recommended for your system
          </span>
        </div>
      )}
      
      <div className={`p-6 ${isPrimary ? 'lg:p-8' : ''}`}>
        <div className={`flex ${isPrimary ? 'flex-col lg:flex-row lg:items-center lg:justify-between' : 'flex-col'} gap-4`}>
          <div className="flex items-center gap-4">
            <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${config.color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className={`font-semibold text-foreground ${isPrimary ? 'text-xl' : 'text-lg'}`}>
                {config.name}
                {platform === 'mac' && isArm && ' (Apple Silicon)'}
              </h3>
              {assetInfo && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3.5 w-3.5" />
                    {formatFileSize(assetInfo.size)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" />
                    {assetInfo.download_count.toLocaleString()} downloads
                  </span>
                </div>
              )}
            </div>
          </div>

          {downloadUrl ? (
            <a href={downloadUrl} download>
              <Button 
                size={isPrimary ? 'lg' : 'default'}
                className={`${isPrimary ? 'w-full lg:w-auto' : 'w-full'} bg-primary hover:bg-primary/90 text-primary-foreground`}
              >
                <Download className="h-4 w-4 mr-2" />
                Download {release ? `v${release.version}` : ''}
              </Button>
            </a>
          ) : (
            <Button 
              size={isPrimary ? 'lg' : 'default'}
              disabled
              className={`${isPrimary ? 'w-full lg:w-auto' : 'w-full'}`}
            >
              Coming Soon
            </Button>
          )}
        </div>

        {assetInfo && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              File: {assetInfo.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
