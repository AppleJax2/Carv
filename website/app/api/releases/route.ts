import { NextResponse } from 'next/server';
import { getLatestRelease, getAllReleases } from '@/lib/github';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    if (all) {
      const releases = await getAllReleases(limit);
      return NextResponse.json({ releases });
    } else {
      const release = await getLatestRelease();
      if (!release) {
        return NextResponse.json(
          { error: 'No releases found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ release });
    }
  } catch (error) {
    console.error('Error fetching releases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch releases' },
      { status: 500 }
    );
  }
}
