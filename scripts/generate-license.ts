#!/usr/bin/env npx tsx
/**
 * Licenc generáló script
 * 
 * Használat:
 * npx tsx scripts/generate-license.ts --tier professional --customer "Cég Kft." --email "admin@ceg.hu" --max-users 50 --expires "2027-12-31" --modules "workforce,tracking,fleet"
 */

import { createHash, randomBytes } from 'crypto';

interface LicenseOptions {
  tier: 'basic' | 'professional' | 'enterprise';
  customer: string;
  email?: string;
  maxUsers?: number;
  expires?: string;
  modules?: string[];
}

const TIER_MODULES: Record<string, string[]> = {
  basic: ['workforce', 'tracking', 'fleet', 'file-import', 'reports'],
  professional: ['workforce', 'tracking', 'fleet', 'file-import', 'reports', 'performance', 'scheduling', 'delivery', 'inventory'],
  enterprise: ['workforce', 'tracking', 'fleet', 'file-import', 'reports', 'performance', 'scheduling', 'delivery', 'inventory', 'oee', 'plc-connector', 'shift-management', 'quality', 'maintenance', 'api-gateway', 'multi-site'],
};

function parseArgs(): LicenseOptions {
  const args = process.argv.slice(2);
  const options: Partial<LicenseOptions> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, '');
    const value = args[i + 1];

    switch (key) {
      case 'tier':
        if (value === 'basic' || value === 'professional' || value === 'enterprise') {
          options.tier = value;
        }
        break;
      case 'customer':
        options.customer = value;
        break;
      case 'email':
        options.email = value;
        break;
      case 'max-users':
        options.maxUsers = parseInt(value ?? '10', 10);
        break;
      case 'expires':
        options.expires = value;
        break;
      case 'modules':
        options.modules = value?.split(',').map(m => m.trim());
        break;
    }
  }

  if (!options.tier) {
    console.error('Hiba: --tier kötelező (basic | professional | enterprise)');
    process.exit(1);
  }
  if (!options.customer) {
    console.error('Hiba: --customer kötelező');
    process.exit(1);
  }

  return options as LicenseOptions;
}

function generateLicenseKey(): string {
  const bytes = randomBytes(16);
  const hex = bytes.toString('hex').toUpperCase();
  // Format: XXXX-XXXX-XXXX-XXXX
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function generateSignature(data: string, secret: string): string {
  return createHash('sha256').update(data + secret).digest('hex').slice(0, 16);
}

function main() {
  const options = parseArgs();
  
  const licenseKey = generateLicenseKey();
  const modules = options.modules ?? TIER_MODULES[options.tier] ?? [];
  const maxUsers = options.maxUsers ?? (options.tier === 'enterprise' ? 999 : options.tier === 'professional' ? 50 : 10);
  const expiresAt = options.expires ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Generate signature for validation
  const signatureData = `${licenseKey}:${options.tier}:${options.customer}:${expiresAt}`;
  const signature = generateSignature(signatureData, 'ainova-secret-key');

  console.log('\n========================================');
  console.log('       Ainova Cloud Intelligence LICENC');
  console.log('========================================\n');
  
  console.log('Licenc kulcs:', licenseKey);
  console.log('Csomag:', options.tier.toUpperCase());
  console.log('Ügyfél:', options.customer);
  if (options.email) console.log('Email:', options.email);
  console.log('Max felhasználók:', maxUsers);
  console.log('Lejárat:', expiresAt);
  console.log('Modulok:', modules.join(', '));
  console.log('Signature:', signature);
  
  console.log('\n----------------------------------------');
  console.log('SQL INSERT (futtasd a vevő DB-jében):');
  console.log('----------------------------------------\n');
  
  const sql = `
-- Licenc beszúrása
INSERT INTO core_license (license_key, tier, customer_name, customer_email, max_users, allowed_modules, expires_at, signature)
VALUES (
  '${licenseKey}',
  '${options.tier}',
  N'${options.customer.replace(/'/g, "''")}',
  ${options.email ? `'${options.email}'` : 'NULL'},
  ${maxUsers},
  '${JSON.stringify(modules)}',
  '${expiresAt}',
  '${signature}'
);
`.trim();

  console.log(sql);
  
  console.log('\n----------------------------------------');
  console.log('Vagy admin panelen megadható kulcs:');
  console.log('----------------------------------------\n');
  
  // Encode license data for admin panel input
  const licenseData = {
    key: licenseKey,
    tier: options.tier,
    customer: options.customer,
    email: options.email,
    maxUsers,
    modules,
    expiresAt,
    signature,
  };
  
  const encodedLicense = Buffer.from(JSON.stringify(licenseData)).toString('base64');
  console.log(encodedLicense);
  
  console.log('\n========================================\n');
}

main();
