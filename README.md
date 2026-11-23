# VAULT

Gamified savings and spending control. *Lock away your spending. Unlock your future.*
VAULT is a discipline tool, not a bank. It never holds money, and avoided purchases are never presented as deposits.

## Setup, step by step
1. **Database.** In Supabase open *SQL Editor > New query*, paste all of `supabase/migrations/20260101000000_init.sql`, click *Run*. It should say "Success". (To start over, run `supabase/reset.sql` first.)
2. **Data API.** *Project Settings > Data API*: make sure `public` is in *Exposed schemas* (and first in the list).
3. **Keys.** Copy the Project URL and the Publishable key (*Connect* button, or *Project Settings > API Keys*).
4. **Vercel.** Import this repo, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, deploy.
5. **Auth URLs.** *Authentication > URL Configuration*: set Site URL to your Vercel address and add `https://YOUR-APP.vercel.app/**` as a Redirect URL.
6. **Test.** Open the app, create an account, create a vault, log a purchase. The balance should stay `$••••••`.

Run locally: `npm install`, copy `.env.example` to `.env.local`, `npm run dev`. With both values blank the app runs in local mode (browser storage, no sign-in).

## Troubleshooting
- "Could not find the table 'public.vaults' in the schema cache": the SQL didn't run in this project, the Data API doesn't expose `public`, or the grants at the end of the migration are missing. You must also be signed in.
- Changed a Vercel variable? Redeploy; values are applied at build time.
- Purchase inserts must not use `.select()`: price columns are unreadable from the browser on purpose.

## Structure
- `src/app/` pages (dashboard, login)
- `src/lib/calc.ts` pure calculations
- `src/lib/repo.ts` local and Supabase data layer
- `supabase/migrations/` database schema, row-level security, grants
- `prototype/index.html` full single-file demo (Shield, achievements, statistics, Money tab)

## Not built yet
Shield, achievements, statistics, settings and unlock animation screens (see prototype), the Chrome extension, route protection, and server routes for Plaid/Dwolla, webhooks, reconciliation and account deletion. Real money movement needs legal review. Keep `SUPABASE_SECRET_KEY` server-side only.

## Talking vault and checkout shield
- The vault has a face and a voice (browser text-to-speech). Tap it on the dashboard to hear your progress. It never says your balance.
- `extension/` is a Chrome (Manifest V3) extension. When you reach a checkout on a store you chose, it opens `/shield` in your VAULT, where the vault speaks and recommends putting money in.
- Install: `chrome://extensions` > turn on *Developer mode* > *Load unpacked* > pick the `extension` folder > open its *Details > Extension options*, enter your Vercel address and your stores.
- Limits: desktop Chrome only (nothing on iOS/Android). It opens VAULT in a new tab and can't block the store. Browsers may block speech until you tap the page, so the vault shows "Tap the vault to hear it". Deposits are self-reported records; VAULT never moves money.

### Choosing stores and forcing VAULT open
- In the app open *Voice and store settings* (`/settings`): pick the voice, toggle or add stores, and choose whether VAULT **takes over the checkout tab**. The list syncs to the extension automatically (open that page once after installing the extension and saving your app address in its options).
- With takeover on, the checkout tab is replaced by VAULT. "Continue to checkout anyway" simply goes back, so it stays your choice. This is friction, not a lock.
- The extension's content script matches `https://*.vercel.app/*` and `http://localhost:3000/*`. For a custom domain, or to narrow it, edit `matches` in `extension/manifest.json` to your exact address.
- Phone apps can't be intercepted from a website or Chrome extension. That needs native iOS (Screen Time / Family Controls) and Android (Accessibility / Usage Access) apps.
- For a more human voice later, add a server route that calls a neural text-to-speech service (needs a paid API key kept server-side).
