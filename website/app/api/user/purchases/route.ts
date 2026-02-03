import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { purchases } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
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

    const userPurchases = await db
      .select({
        id: purchases.id,
        productId: purchases.productId,
        productName: purchases.productName,
        amount: purchases.amount,
        purchasedAt: purchases.purchasedAt,
      })
      .from(purchases)
      .where(eq(purchases.userId, user.id))
      .orderBy(desc(purchases.purchasedAt));

    return NextResponse.json(userPurchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchases' },
      { status: 500 }
    );
  }
}
