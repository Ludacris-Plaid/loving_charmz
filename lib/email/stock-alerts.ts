import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getResendClient, FROM_SUPPORT } from './client';
import { shell, escapeHtml, siteOrigin } from './template';

/**
 * Low-stock alerts for the shop owner.
 *
 * A Postgres trigger (migration 00017) queues a row in `stock_alerts` the
 * moment any variant's stock lands on zero. This module drains that queue:
 * one digest email listing everything that sold out, then the drained rows
 * are deleted so the next dip to zero can alert again.
 *
 * Restocks never email — they just clear the queue entry silently, so
 * re-emptying a variant alerts again. Flushing is best-effort and safe to
 * call concurrently (drain happens in one transactional delete).
 */

export type StockAlert = {
  id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  created_at: string;
};

const OWNER_EMAIL = 'hello@lovingcharmz.com';

/** Reads the pending alert queue without draining it. */
export async function readStockAlerts(): Promise<StockAlert[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('stock_alerts')
    .select('id, variant_id, product_name, variant_name, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StockAlert[];
}

async function renderStockAlertEmail(alerts: StockAlert[]): Promise<string> {
  const site = await siteOrigin();

  const rows = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ecf4;">
          <strong style="color:#2d1b4e;">${escapeHtml(a.product_name)}</strong>
          <br><span style="color:#6b5b7b;font-size:13px;">${escapeHtml(a.variant_name)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ecf4;text-align:right;">
          <span style="display:inline-block;background:#fdecea;color:#b3261e;font-weight:700;font-size:12px;letter-spacing:1px;padding:4px 12px;border-radius:999px;">SOLD OUT</span>
        </td>
      </tr>`,
    )
    .join('\n');

  return shell(`
    <h2 style="margin:0 0 16px;font-size:24px;color:#2d1b4e;">A charm just sold out</h2>
    <p style="margin:0 0 24px;color:#6b5b7b;font-size:14px;line-height:1.6;">
      ${
        alerts.length === 1
          ? 'This variant just hit zero stock:'
          : `${alerts.length} variants just hit zero stock:`
      }
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${rows}
    </table>

    <div style="text-align:center;margin:28px 0;">
      <a href="${site}/admin/inventory"
         style="display:inline-block;background:#2d1b4e;color:#fff;padding:14px 36px;border-radius:6px;text-decoration:none;font-size:15px;letter-spacing:1px;">
        OPEN INVENTORY
      </a>
    </div>

    <p style="margin:0;color:#6b5b7b;font-size:13px;line-height:1.6;text-align:center;">
      Shoppers see &ldquo;out of stock&rdquo; on these variants until you restock.
    </p>
  `);
}

/**
 * Emails the owner every pending sold-out alert and drains the queue.
 * Returns how many alerts were flushed (0 when the queue is empty).
 * Never throws — a failed email is logged and the queue is left intact
 * for the next run.
 */
export async function flushStockAlerts(): Promise<{ flushed: number }> {
  const alerts = await readStockAlerts();
  if (alerts.length === 0) return { flushed: 0 };

  const admin = createAdminClient();
  const ids = alerts.map((a) => a.id);

  try {
    const html = await renderStockAlertEmail(alerts);
    const { error } = await getResendClient().emails.send({
      from: FROM_SUPPORT,
      to: OWNER_EMAIL,
      subject:
        alerts.length === 1
          ? `Sold out: ${alerts[0].product_name} (${alerts[0].variant_name}) — Loving Charmz`
          : `${alerts.length} charms sold out — Loving Charmz`,
      html,
    });

    if (error) {
      console.error('[stock-alerts] send failed', error.message);
      return { flushed: 0 };
    }

    const { error: delErr } = await admin.from('stock_alerts').delete().in('id', ids);
    if (delErr) {
      // Queue not drained: the next run re-emails the same alerts (deduped by
      // the partial unique index until restock). Log loudly.
      console.error('[stock-alerts] drain failed', delErr.message);
    }
    return { flushed: alerts.length };
  } catch (error) {
    console.error('[stock-alerts] flush failed', error);
    return { flushed: 0 };
  }
}
