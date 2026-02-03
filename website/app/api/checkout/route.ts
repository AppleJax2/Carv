import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/payments/stripe';
import { getUser } from '@/lib/db/queries';
import { PRODUCTS } from '@/lib/license';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to purchase' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId || !(productId in PRODUCTS)) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const product = PRODUCTS[productId as keyof typeof PRODUCTS];
    const priceInCents = Math.round(product.price * 100);

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      client_reference_id: user.id.toString(),
      customer_email: user.email,
      metadata: {
        userId: user.id.toString(),
        productId: productId,
      },
      success_url: `${process.env.BASE_URL}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
