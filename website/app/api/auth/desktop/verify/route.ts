import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);

interface VerifyRequest {
  token: string;
}

interface VerifyResponse {
  valid: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    subscriptionTier: string;
  };
  message?: string;
}

// Verify desktop app token and return current user info
export async function POST(request: Request): Promise<NextResponse<VerifyResponse>> {
  try {
    const body: VerifyRequest = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the JWT token
    let payload;
    try {
      const result = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });
      payload = result.payload;
    } catch {
      return NextResponse.json(
        { valid: false, message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if it's a desktop token
    if (payload.type !== 'desktop') {
      return NextResponse.json(
        { valid: false, message: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Get fresh user data from database using email
    const email = payload.email as string;
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { valid: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = result[0];

    // Check if account is deleted
    if (user.deletedAt) {
      return NextResponse.json(
        { valid: false, message: 'Account has been deleted' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: payload.supabaseId as string,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
      },
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
