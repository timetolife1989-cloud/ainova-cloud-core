/**
 * Bootstrap password hash generator
 * Usage: npx tsx scripts/generate-hash.ts <password>
 * Example: npx tsx scripts/generate-hash.ts Admin1234!
 */
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const password = process.argv[2];
if (!password) {
  console.error('Usage: npx tsx scripts/generate-hash.ts <password>');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password!, 12);
  console.log('\nBootstrap password:', password);
  console.log('Bcrypt hash:', hash);
  console.log('\nCopy the hash above into database/core/001_core_users.sql');
})();
