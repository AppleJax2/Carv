// GitHub API helpers for fetching releases

const GITHUB_OWNER = 'AppleJax2';
const GITHUB_REPO = 'Carv';
const GITHUB_API_BASE = 'https://api.github.com';

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  html_url: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
}

export interface ParsedRelease {
  version: string;
  name: string;
  body: string;
  publishedAt: Date;
  htmlUrl: string;
  isPrerelease: boolean;
  assets: {
    windows?: GitHubAsset;
    mac?: GitHubAsset;
    macArm?: GitHubAsset;
    linux?: GitHubAsset;
    linuxArm?: GitHubAsset;
  };
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Carv-Website',
  };
  
  // Add auth token if available (increases rate limit from 60 to 5000 req/hr)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  
  return headers;
}

function parseAssets(assets: GitHubAsset[]): ParsedRelease['assets'] {
  const result: ParsedRelease['assets'] = {};
  
  for (const asset of assets) {
    const name = asset.name.toLowerCase();
    
    // Windows
    if (name.endsWith('.exe') || name.includes('win') && name.endsWith('.zip')) {
      result.windows = asset;
    }
    // Mac ARM (Apple Silicon)
    else if ((name.includes('arm64') || name.includes('aarch64')) && (name.endsWith('.dmg') || name.includes('mac'))) {
      result.macArm = asset;
    }
    // Mac Intel
    else if (name.endsWith('.dmg') || (name.includes('mac') && name.endsWith('.zip'))) {
      result.mac = asset;
    }
    // Linux ARM
    else if ((name.includes('arm64') || name.includes('aarch64')) && name.endsWith('.appimage')) {
      result.linuxArm = asset;
    }
    // Linux
    else if (name.endsWith('.appimage') || name.endsWith('.deb') || name.endsWith('.rpm')) {
      result.linux = asset;
    }
  }
  
  return result;
}

function parseRelease(release: GitHubRelease): ParsedRelease {
  return {
    version: release.tag_name.replace(/^v/, ''),
    name: release.name || release.tag_name,
    body: release.body || '',
    publishedAt: new Date(release.published_at),
    htmlUrl: release.html_url,
    isPrerelease: release.prerelease,
    assets: parseAssets(release.assets),
  };
}

/**
 * Fetch the latest release from GitHub
 */
export async function getLatestRelease(): Promise<ParsedRelease | null> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { 
        headers: getHeaders(),
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        // No releases yet
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const release: GitHubRelease = await response.json();
    return parseRelease(release);
  } catch (error) {
    console.error('Failed to fetch latest release:', error);
    return null;
  }
}

/**
 * Fetch all releases from GitHub (for changelog)
 */
export async function getAllReleases(limit = 50): Promise<ParsedRelease[]> {
  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=${limit}`,
      { 
        headers: getHeaders(),
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const releases: GitHubRelease[] = await response.json();
    return releases
      .filter(r => !r.draft)
      .map(parseRelease);
  } catch (error) {
    console.error('Failed to fetch releases:', error);
    return [];
  }
}

/**
 * Detect user's platform from User-Agent
 */
export function detectPlatform(userAgent: string): 'windows' | 'mac' | 'linux' | 'unknown' {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac') || ua.includes('darwin')) return 'mac';
  if (ua.includes('linux') || ua.includes('ubuntu') || ua.includes('debian')) return 'linux';
  
  return 'unknown';
}

/**
 * Detect if user is on ARM architecture
 */
export function detectArm(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return ua.includes('arm') || ua.includes('aarch64');
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
