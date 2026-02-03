import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { db } from '@/lib/db/drizzle';
import { users, purchases, licenses } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateLicenseKey, PRODUCTS } from '@/lib/license';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/pricing?error=no_session', request.url));
  }

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/pricing?error=payment_failed', request.url));
    }

    const userId = session.metadata?.userId;
    const productId = session.metadata?.productId;

    if (!userId || !productId) {
      console.error('Missing metadata in checkout session');
      return NextResponse.redirect(new URL('/pricing?error=invalid_session', request.url));
    }

    // Check if purchase already exists (idempotency)
    const existingPurchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripePaymentIntentId, session.payment_intent as string))
      .limit(1);

    if (existingPurchase.length > 0) {
      // Already processed, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard?purchase=success', request.url));
    }

    const product = PRODUCTS[productId as keyof typeof PRODUCTS];
    if (!product) {
      console.error('Invalid product ID:', productId);
      return NextResponse.redirect(new URL('/pricing?error=invalid_product', request.url));
    }

    // Create purchase record
    const [purchase] = await db
      .insert(purchases)
      .values({
        userId: parseInt(userId),
        productId: productId,
        productName: product.name,
        amount: product.price.toString(),
        currency: 'usd',
        stripePaymentIntentId: session.payment_intent as string,
        status: 'completed',
      })
      .returning();

    // Generate license key
    const licenseKey = generateLicenseKey();

    // Create license record
    await db.insert(licenses).values({
      userId: parseInt(userId),
      purchaseId: purchase.id,
      licenseKey: licenseKey,
      productId: productId,
      isActive: true,
      activatedAt: new Date(),
      expiresAt: null, // Lifetime license
    });

    // Update user's subscription tier if this is the Pro license
    if (productId === 'pro') {
      await db
        .update(users)
        .set({
          subscriptionTier: 'pro',
          stripeCustomerId: session.customer as string,
          updatedAt: new Date(),
        })
        .where(eq(users.id, parseInt(userId)));
    }

    // Redirect to dashboard with success message
    return NextResponse.redirect(new URL('/dashboard?purchase=success&product=' + productId, request.url));
  } catch (error) {
    console.error('Error processing checkout success:', error);
    return NextResponse.redirect(new URL('/pricing?error=processing_failed', request.url));
  }
}
