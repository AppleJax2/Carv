import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { jwtVerify, SignJWT } from 'jose';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);

interface RefreshRequest {
  token: string;
}

interface RefreshResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    subscriptionTier: string;
  };
  message?: string;
}

// Refresh desktop app token - returns a new token with extended expiry
export async function POST(request: Request): Promise<NextResponse<RefreshResponse>> {
  try {
    const body: RefreshRequest = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the existing token (allow expired tokens for refresh within grace period)
    let payload;
    try {
      const result = await jwtVerify(token, key, {
        algorithms: ['HS256'],
      });
      payload = result.payload;
    } catch (error: any) {
      // Allow refresh if token expired within last 7 days
      if (error?.code === 'ERR_JWT_EXPIRED') {
        try {
          // Decode without verification to check expiry
          const parts = token.split('.');
          const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const expiredAt = new Date(decoded.exp * 1000);
          const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (Date.now() - expiredAt.getTime() > gracePeriod) {
            return NextResponse.json(
              { success: false, message: 'Token expired beyond refresh period. Please login again.' },
              { status: 401 }
            );
          }
          payload = decoded;
        } catch {
          return NextResponse.json(
            { success: false, message: 'Invalid token' },
            { status: 401 }
          );
        }
      } else {
        return NextResponse.json(
          { success: false, message: 'Invalid token' },
          { status: 401 }
        );
      }
    }

    // Check if it's a desktop token
    if (payload.type !== 'desktop') {
      return NextResponse.json(
        { success: false, message: 'Invalid token type' },
        { status: 401 }
      );
    }

    // Get fresh user data from database using email
    const email = payload.email as string;
    const supabaseId = payload.supabaseId as string;
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const user = result[0];

    // Check if account is deleted
    if (user.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Account has been deleted' },
        { status: 401 }
      );
    }

    // Create a new token with extended expiry (30 days)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const newToken = await new SignJWT({
      oderId: user.id,
      supabaseId: supabaseId,
      email: user.email,
      subscriptionTier: user.subscriptionTier,
      machineId: payload.machineId || null,
      type: 'desktop',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(key);

    return NextResponse.json({
      success: true,
      token: newToken,
      user: {
        id: supabaseId,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscriptionTier,
      },
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
