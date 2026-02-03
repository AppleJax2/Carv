import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { licenses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getUser } from '@/lib/db/queries';

export async function GET() {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userLicenses = await db
      .select({
        id: licenses.id,
        licenseKey: licenses.licenseKey,
        productId: licenses.productId,
        isActive: licenses.isActive,
        createdAt: licenses.createdAt,
        expiresAt: licenses.expiresAt,
      })
      .from(licenses)
      .where(eq(licenses.userId, user.id))
      .orderBy(licenses.createdAt);

    return NextResponse.json(userLicenses);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch licenses' },
      { status: 500 }
    );
  }
}
