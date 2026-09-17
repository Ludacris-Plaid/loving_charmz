# Email System — Plan & Options

Planning doc, September 2026. No code written yet.

## Decisions (made Sept 2026)

1. **Provider: Resend** — free tier (3,000/mo) to start.
2. **Mailing-list sending: Level 2** — admin composer with one-click send,
   batched, unsubscribe links baked in.
3. **Signup confirmation: ON** — once mail flows reliably, new signups must
   click a confirmation link (currently disabled for mom-testing).

## Where things stand today

- **Mailing list:** popup signups save to the `subscribers` table (live since the
  mailing-list feature shipped). Admin page can view/search/export CSV+TXT.
  Emails entered *before* that feature existed were never saved anywhere — the
  popup was display-only. Tracy's email has been backfilled manually.
- **Auth emails:** none work yet. There is no forgot-password page at all.
  Signup currently creates the account with email confirmation disabled.
  Supabase *can* send auth emails through its built-in sender, but it is
  rate-limited (~2/hour on the free tier) and comes from
  `noreply@mail.app.supabase.io` — fine for testing, not for a real shop.
- **No email provider account exists yet** (no Resend/Postmark/SES configured).

---

## Decision 1 — Email service provider (required for everything)

| Option | Cost | Effort | Notes |
|---|---|---|---|
| **A. Resend** (recommended) | Free: 3,000/mo, 100/day. Pro $20/mo | ~1 hr | Modern DX, official `react-email` templates, clean API. Domain verification at resend.com + 2 DNS records |
| **B. Postmark** | $15/mo for 10k | ~1 hr | Best-in-class deliverability for transactional mail; overkill to start |
| **C. Supabase built-in SMTP** | Free | ~30 min | No code, but rate limits + ugly sender address; treat as stopgap only |
| **D. Amazon SES** | ~$0.10 per 1,000 | ~2–3 hrs | Cheapest at scale, clunkiest setup; revisit if list grows huge |

**Recommendation: A.** Create a Resend account on `lovingcharmz.com`, verify the
domain (adds DKIM/SPF DNS records in the domain's DNS panel), get an API key,
put it in Vercel env vars.

## Decision 2 — Auth emails (password reset, signup confirmation)

Whichever provider wins above, wire it into **Supabase Auth's custom SMTP**
settings (Dashboard → Authentication → SMTP). This is a settings change, not
code: Supabase then sends its own reset/confirmation emails through
lovingcharmz.com instead of its rate-limited default.

Then build the missing UI (code work):

1. **Forgot-password page** (`/forgot-password`) — email box → "send reset link"
2. **Reset-password page** (`/reset-password`) — new password form (Supabase
   links here with a token; needs a client-side session-exchange handler)
3. **"Forgot your password?" link** on the login form → points at it
4. Optional: re-enable **email confirmation** on signup once the sender is
   trustworthy (it's currently off so the mom-tester could sign up easily)

Effort: ~half a day including testing both flows end to end.

## Decision 3 — Mailing-list emails (the newsletter)

Three levels, pick per ambition:

| Level | What mom gets | Effort |
|---|---|---|
| **1. Export & send manually** (current) | Download CSV, paste into her normal email/gmail. Zero new code | Done already |
| **2. "Send campaign" button in admin** | Compose subject + body in the admin, click send, the site emails the whole list via Resend (batched, with unsubscribe footer). Includes an `unsubscribe` page so we're CAN-SPAM legit | ~1 day |
| **3. Full newsletter service** | Push list to Mailchimp/Brevo, compose there, they handle deliverability/unsubs/analytics. Monthly cost grows with list size; another vendor account | ~half day setup + ongoing vendor |

**Recommendation: Level 2.** The list is small; Resend's free tier covers it;
mom composes in the same admin she already knows. Add unsubscribe links from
day one (one-click, sets `unsubscribed_at` on the subscriber row).

## Suggested build order

1. Resend account + domain verification (you do the signup, I wire the DNS text)
2. Supabase custom SMTP → suddenly password resets *work*
3. Forgot/reset password pages + login link
4. Unsubscribe page + footer link on every campaign email
5. Admin "Email my list" composer (subject + body + preview + send)
6. Re-enable signup email confirmation + branded HTML template (logo,
   plum/mint palette) for all outgoing mail

## What I need from you to start

1. **Create the Resend account** at resend.com using
   `hello@lovingcharmz.com` (or whatever mailbox you check).
2. **Add the 2–3 DNS records** Resend shows you (I'll translate each one;
   they go wherever lovingcharmz.com's DNS is managed).
3. **Paste me the Resend API key** (same way you shared the Supabase keys).

Everything after that — Supabase SMTP settings, password-reset pages,
unsubscribes, the admin composer, the branded template — is my side of the
net, roughly a day of build-and-test total.
