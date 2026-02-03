import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/client';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { SignJWT } from 'jose';

const key = new TextEncoder().encode(process.env.AUTH_SECRET);

interface LoginRequest {
  email: string;
  password: string;
  machineId?: string;
}

interface LoginResponse {
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

// Desktop app login endpoint
// Authenticates via Supabase Auth and returns a custom JWT for the desktop app
export async function POST(request: Request): Promise<NextResponse<LoginResponse>> {
  try {
    const body: LoginRequest = await request.json();
    const { email, password, machineId } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate with Supabase
    const supabase = getServerClient();
    const { data: authData, error: authError } = await supabase!.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, message: authError?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    const supabaseUser = authData.user;

    // Get or create user profile in our database
    let dbUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    let userProfile;
    if (dbUser.length === 0) {
      // Create user profile if it doesn't exist
      const newUser = await db
        .insert(users)
        .values({
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.name || null,
          passwordHash: 'supabase-managed', // Password managed by Supabase
          subscriptionTier: 'free',
        })
        .returning();
      userProfile = newUser[0];
    } else {
      userProfile = dbUser[0];
    }

    // Check if account is deleted
    if (userProfile.deletedAt) {
      return NextResponse.json(
        { success: false, message: 'Account has been deleted' },
        { status: 401 }
      );
    }

    // Create a long-lived token for desktop app (30 days)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const token = await new SignJWT({
      oderId: userProfile.id,
      supabaseId: supabaseUser.id,
      email: userProfile.email,
      subscriptionTier: userProfile.subscriptionTier,
      machineId: machineId || null,
      type: 'desktop',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresAt)
      .sign(key);

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: supabaseUser.id,
        email: userProfile.email,
        name: userProfile.name,
        subscriptionTier: userProfile.subscriptionTier,
      },
    });

  } catch (error) {
    console.error('Desktop login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
