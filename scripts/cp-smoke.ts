// Live smoke test of the JSON-era Canada Post client (safe, read-only calls).
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const { getShippingRates } = await import('../lib/shipping/rates');
  const r = await getShippingRates({ destPostal: 'M5H2N2', destCountry: 'CA', weightKg: 0.25 });
  console.log('rates available:', r.available);
  if (r.available) {
    for (const q of r.quotes.slice(0, 4)) {
      console.log(' -', q.serviceCode, q.serviceName, `$${q.due}`, q.expectedDeliveryDate ?? '', q.guaranteed ? '(guaranteed)' : '');
    }
  }

  const { getTrackingSummary } = await import('../lib/shipping/canadapost');
  try {
    const t = await getTrackingSummary('123456789012');
    console.log('tracking probe:', t.pin, t.eventName ?? '(no events)');
  } catch (e) {
    console.log('tracking probe error (expected for junk pin):', e instanceof Error ? e.message.slice(0, 90) : e);
  }
}

main();
