import { NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { licenses, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { isValidLicenseKeyFormat, hashMachineId } from '@/lib/license';

interface VerifyRequest {
  licenseKey: string;
  productId: string;
  machineId?: string;
}

interface VerifyResponse {
  valid: boolean;
  productId?: string;
  tier?: string;
  message?: string;
}

export async function POST(request: Request): Promise<NextResponse<VerifyResponse>> {
  try {
    const body: VerifyRequest = await request.json();
    const { licenseKey, productId, machineId } = body;

    // Validate license key format
    if (!licenseKey || !isValidLicenseKeyFormat(licenseKey)) {
      return NextResponse.json(
        { valid: false, message: 'Invalid license key format' },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { valid: false, message: 'Product ID required' },
        { status: 400 }
      );
    }

    // Look up the license
    const result = await db
      .select({
        license: licenses,
        user: users,
      })
      .from(licenses)
      .leftJoin(users, eq(licenses.userId, users.id))
      .where(
        and(
          eq(licenses.licenseKey, licenseKey),
          eq(licenses.productId, productId),
          eq(licenses.isActive, true)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { valid: false, message: 'License not found or inactive' },
        { status: 404 }
      );
    }

    const { license, user } = result[0];

    // Check expiration
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return NextResponse.json(
        { valid: false, message: 'License has expired' },
        { status: 403 }
      );
    }

    // Check machine binding (if license has a machine ID set)
    if (license.machineId && machineId) {
      const hashedMachineId = hashMachineId(machineId);
      if (license.machineId !== hashedMachineId) {
        return NextResponse.json(
          { valid: false, message: 'License is bound to a different machine' },
          { status: 403 }
        );
      }
    }

    // If no machine ID is set on the license but one is provided, bind it
    if (!license.machineId && machineId) {
      const hashedMachineId = hashMachineId(machineId);
      await db
        .update(licenses)
        .set({ 
          machineId: hashedMachineId,
          activatedAt: new Date(),
        })
        .where(eq(licenses.id, license.id));
    }

    return NextResponse.json({
      valid: true,
      productId: license.productId,
      tier: user?.subscriptionTier || 'free',
    });

  } catch (error) {
    console.error('License verification error:', error);
    return NextResponse.json(
      { valid: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
