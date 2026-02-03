import { randomBytes, createHash } from 'crypto';

/**
 * Generate a unique license key
 * Format: CARV-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const bytes = randomBytes(16);
  const hex = bytes.toString('hex').toUpperCase();
  
  // Format as CARV-XXXX-XXXX-XXXX-XXXX
  const parts = [
    'CARV',
    hex.slice(0, 4),
    hex.slice(4, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
  ];
  
  return parts.join('-');
}

/**
 * Validate license key format
 */
export function isValidLicenseKeyFormat(key: string): boolean {
  const pattern = /^CARV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  return pattern.test(key);
}

/**
 * Hash a machine ID for storage (privacy)
 */
export function hashMachineId(machineId: string): string {
  return createHash('sha256').update(machineId).digest('hex').slice(0, 32);
}

/**
 * Product IDs and their display names
 */
export const PRODUCTS = {
  pro: {
    id: 'pro',
    name: 'Carv Pro',
    description: 'Full access to all Pro features',
    price: 49.00,
    isLifetime: true,
  },
  cabinet_designer: {
    id: 'cabinet_designer',
    name: 'Cabinet Designer Pro',
    description: 'Advanced cabinet design tools',
    price: 19.99,
    isLifetime: true,
  },
} as const;

export type ProductId = keyof typeof PRODUCTS;

/**
 * Check if a product ID is valid
 */
export function isValidProductId(id: string): id is ProductId {
  return id in PRODUCTS;
}
