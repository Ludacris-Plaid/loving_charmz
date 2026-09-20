/**
 * Deliverability probe: sends ONE real welcome email (the exact template
 * production uses) to a fresh mail-tester.com inbox, then prints the URL of
 * the spam report (usually ready ~15s later). Open the URL to see the score
 * and every SpamAssassin rule that fired.
 *
 * Run: NODE_OPTIONS="--require /tmp/shim-server-only.cjs" npx tsx scripts/spam-check.ts
 * Override the mail-tester id with MT_ID=<id> (address is <id>@srv1.mail-tester.com).
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { sendWelcomeEmail } from '../lib/email/transactional';

const ID = process.env.MT_ID || `test-lc${Date.now().toString(36).slice(-6)}`;
const TO = `${ID}@srv1.mail-tester.com`;

async function main() {
  const r = await sendWelcomeEmail({ to: TO, couponCode: 'WELCOME10' });
  if (r.error) {
    console.error('SEND FAILED:', r.error);
    process.exit(1);
  }
  console.log(`sent to ${TO}`);
  console.log(`report in ~15s: https://www.mail-tester.com/${ID}`);
}

main().catch((e) => {
  console.error('FAIL:', e?.message ?? e);
  process.exit(1);
});
